import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';
import { supabase } from '../utils/supabase';

interface GeminiSummary {
  title: string;
  image: string | null;
  content: string;
  verified: boolean;
}

interface UseScamReporterResult {
  loading: boolean;
  error: string | null;
  result: GeminiSummary | null;
  processReport: (description: string, imageUri: string | null) => Promise<void>;
}

export function useScamReporter(): UseScamReporterResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeminiSummary | null>(null);

  // const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const gemini = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  async function generateEmbedding(text: string): Promise<number[]> {
    console.log('[generateEmbedding] Input text:', text);

    const response = await gemini.models.embedContent({
        model: 'gemini-embedding-exp-03-07',
        contents: text,
        config: {
            taskType: 'CLUSTERING',
        }
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error('Embedding not generated.');
    }

    console.log('[generateEmbedding] Embedding vector:', embedding.slice(0, 5));
    return embedding;
  }

  async function uploadImageToSupabase(uri: string): Promise<string> {
    // Get file extension safely (default to 'jpg' if missing)
    const extMatch = uri.match(/\.([^.]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

    // Generate unique filename
    const fileName = `${Date.now()}.${ext}`;

    // Read file as base64
    const fileBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 string to Uint8Array
    const fileBuffer = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, fileBuffer, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (error) {
      throw new Error('Failed to upload image: ' + error.message);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  }

  async function summariseWithGemini(description: string, imageUri: string | null) {
    let imagePart = null;
    let imageUrl = null;

    if (imageUri) {
      if (imageUri.startsWith('http')) {
        // Already a public URL, use directly
        imageUrl = imageUri;
      } else {
        // Local file, upload to Supabase
        const publicImageUrl = await uploadImageToSupabase(imageUri);
        imageUrl = publicImageUrl;
      }

      // Fetch the public image URL as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Create File object from blob (make sure File is available, or use polyfill)
      const file = new File([blob], 'image.jpg', { type: blob.type });

      // Upload to Gemini
      const uploadResult = await gemini.files.upload({ file });

      // Create a Part object from the upload result URI
      imagePart = createPartFromUri(uploadResult.uri!, uploadResult.mimeType!);
    }

    const contents = [
      createUserContent([
        `Ssummarise the scam into a short title, scam type, and content (description of the scam, and how to avoid falling for such scams).
        DO NOT include Markdown formatted content in the response, simply respond in plaintext.
        Split the content into two paragraphs accordingly (description and how to avoid) and separate them by two newlines with no special characters.
        Respond as JSON: title (string), type (string), content (string).

        Incident description:
        ${description}`,
        ...(imagePart ? [imagePart] : []),
      ]),
    ];

    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    text = text.trim()
      .replace(/^```(json)?\s*/i, '')   // Remove ```json or ``` at start
      .replace(/```$/i, '')             // Remove ``` at end
      .replace(/[\u0000-\u001F]/g, '');  // Remove control characters

    const summary = JSON.parse(text);
    summary.image = imageUrl;
    console.log(`[summariseWithGemini] Generated content: ${JSON.stringify(summary)}`)

    return summary;
  }

  async function verifyReport(description: string) {
    const contents = [
      createUserContent([
        `Verify whether this scam is a legitimate incident through identifying common scam red flags such as phishing links, unsolicited requests for personal info (passwords, bank details, phone number), sense of urgency or threats. If unsure, just return true to be safe. 
        
        Return a single boolean (true or false) response.

        Incident description:
        ${description}`,
      ]),
    ];

    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    text = text.trim().toLowerCase();
    console.log('[verifyReport] Verification result:', text);

    // Normalize answer to be sure
    if (text === 'true') return true;
    if (text === 'false') return false;

    // Sometimes GPT may return a sentence or something else, so try to parse boolean within text
    if (text.includes('true')) return true;
    if (text.includes('false')) return false;

    // Fallback: if response cannot be parsed as boolean, throw an error or return false
    throw new Error(`Unable to parse verification response: "${text}"`);
  }

  async function processReport(description: string, imageUri: string | null) {
    setLoading(true);
    setError(null);

    try {
      console.log('[processReport] Description received:', description);
      const verifiedReport = await verifyReport(description);
      if (!verifiedReport) {
        console.log('[processReport] False report received. Terminating...');
        setResult(null);
        return;
      }
      const embedding = await generateEmbedding(description);
      console.log('[processReport] Generated embedding:', embedding.slice(0, 5), '... Length:', embedding.length);

      // Search for similar scams
      const { data: similar, error: searchError } = await supabase.rpc('match_scam', {
        query_embedding: embedding,
        match_threshold: 0.85,
        match_count: 1,
      });

      console.log('[processReport] Supabase match_scam result:', similar);

      if (searchError) throw new Error(searchError.message);

      if (similar?.length > 0) {
        const existingId = similar[0].id;
        console.log('[processReport] Found similar scam with id:', existingId);

        // Step 1: Get current count
        const { data: current, error: fetchError } = await supabase
          .from('scamreports')
          .select('count, title, summary, image')
          .eq('id', existingId)
          .single();

        console.log('[processReport] Current scam data:', current);

        if (fetchError) throw new Error(fetchError.message);

        // Step 3: Generate a new combined summary using Gemini
        const combinedDescription = `${current?.summary}\n\n---\n\n${description}`;
        console.log('[processReport] Combined description for Gemini:', combinedDescription);

        const combinedSummary = await summariseWithGemini(combinedDescription, current?.image);
        console.log('[processReport] Combined Gemini summary:', JSON.stringify(combinedSummary));

        const combinedEmbeddings = await generateEmbedding(combinedDescription);
        console.log('[processReport] Combined embeddings:', combinedEmbeddings.slice(0, 5), '... Length:', combinedEmbeddings.length);
        const updatedCount = current?.count + 1;

        // Step 4: Update count, title, summary
        const { error: updateError } = await supabase
          .from('scamreports')
          .update({
            count: updatedCount,
            title: combinedSummary.title,
            summary: combinedSummary.content,
            embeddings: combinedEmbeddings,
          })
          .eq('id', existingId);

        if (updateError) throw new Error(updateError.message);

        // Step 5: If count is multiple of 3, update timestamp for new report to be published on Telegram bot
        if (updatedCount % 3 === 0) {
          const {error: updateTimestampError } = await supabase
            .from('scamreports')
            .update({
              timestamp: Date.now(),
            })
            .eq('id', existingId);

            if (updateTimestampError) throw new Error(updateTimestampError.message);
        }

        console.log('[processReport] Successfully uploaded issue to database');

        setResult(null);
      } else {
        console.log('[processReport] No similar scam found, creating new record');

        const summary = await summariseWithGemini(description, imageUri);
        console.log('[processReport] New Gemini summary:', summary);

        await supabase
          .from('scamreports')
          .insert({
            title: summary.title,
            type: summary.type,
            summary: summary.content,
            image: summary.image,
            timestamp: Date.now(),
            count: 1,
            embeddings: embedding,
          });

        console.log('[processReport] Successfully uploaded issue to database');

        setResult(summary);
      }
    } catch (e: any) {
      console.error('[processReport] Error:', e);
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, result, processReport };
}
