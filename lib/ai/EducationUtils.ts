import { GoogleGenAI, createUserContent } from "@google/genai";
import 'dotenv/config';
import { supabase } from '../supabase';

const gemini = new GoogleGenAI({apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY});

export interface EducationSummary {
  title: string;
  content: string;
  advice: string;
}

const ARTICLE_PROMPT = `
You are an expert at rewriting scam education articles to be more engaging and informative.
Rewrite the following article to be more polished and readable while maintaining all key information.
After the main content, add a "Practical Advice" section with clear, actionable tips for scam prevention.

Format the response as JSON with these fields:
{
  "title": "A clear, engaging title",
  "content": "The polished article content",
  "advice": "The practical prevention advice section"
}

Article to process:
`;

export async function summariseWithGemini(articleText: string): Promise<EducationSummary> {
  try {
    const contents = [
      createUserContent([ARTICLE_PROMPT + articleText])
    ];

    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
    });

    let text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    text = text.trim()
      .replace(/^```json\s*/, '')   // Remove ```json at start if present
      .replace(/```$/, ''); 

    const summary = JSON.parse(text) as EducationSummary;
    
    // Validate the response format
    if (!summary.title || !summary.content || !summary.advice) {
      throw new Error('Invalid response format from Gemini');
    }
    
    return summary;
  } catch (error) {
    console.error('Error in summariseWithGemini:', error);
    throw error;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
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

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function checkForDuplicate(title: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('educational_articles')
      .select('id')
      .ilike('title', title)
      .limit(1);
      
    if (error) throw error;
    return data.length > 0;
  } catch (error) {
    console.error('Error checking for duplicate:', error);
    throw error;
  }
}

export function isValidContent(content: string): boolean {
  if (content.length < 300) return false;
  
  // Count paragraphs (text blocks separated by double newlines)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  return paragraphs.length >= 3;
}

export function extractDomain(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}
