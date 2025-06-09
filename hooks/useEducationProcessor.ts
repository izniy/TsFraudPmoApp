import {
    checkForDuplicate,
    extractDomain,
    generateEmbedding,
    isValidContent,
    summariseWithGemini
} from '../lib/ai/EducationUtils';
import { supabase } from '../lib/supabase';

export interface ProcessArticleResult {
  success: boolean;
  inserted: boolean;
  summary?: {
    title: string;
    content: string;
    advice: string;
    type: string;
  };
  error?: string;
}

export function useEducationProcessor(testMode: boolean = false) {
  async function processArticle(
    articleText: string, 
    sourceUrl: string, 
    imageUrl: string
  ): Promise<ProcessArticleResult> {
    try {
      // Step 1: Validate content
      if (!isValidContent(articleText)) {
        return {
          success: false,
          inserted: false,
          error: 'Content is too short or has insufficient paragraphs'
        };
      }

      // Step 2: Generate summary with Gemini
      const summary = await summariseWithGemini(articleText);

      // Step 3: Check for duplicates
      const isDuplicate = await checkForDuplicate(summary.title);
      if (isDuplicate) {
        return {
          success: true,
          inserted: false,
          summary: { ...summary, type: extractDomain(sourceUrl) },
          error: 'Article with similar title already exists'
        };
      }

      // Step 4: Generate embeddings
      const embedding = await generateEmbedding(articleText);

      // Step 5: Insert into Supabase if not in test mode
      if (!testMode) {
        const { error: insertError } = await supabase
          .from('educational_articles')
          .insert({
            title: summary.title,
            content: summary.content,
            advice: summary.advice,
            type: extractDomain(sourceUrl),
            image_url: imageUrl,
            source_url: sourceUrl,
            embedding,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      } else {
        // Log processed data in test mode
        console.log('Test Mode - Processed Article:', {
          title: summary.title,
          type: extractDomain(sourceUrl),
          content: summary.content.substring(0, 100) + '...',
          advice: summary.advice.substring(0, 100) + '...',
          image_url: imageUrl,
          source_url: sourceUrl,
          embedding: embedding.slice(0, 5) + '...',
        });
      }

      return {
        success: true,
        inserted: !testMode,
        summary: { ...summary, type: extractDomain(sourceUrl) }
      };
    } catch (error) {
      console.error('Error processing article:', error);
      return {
        success: false,
        inserted: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  return { processArticle };
}
