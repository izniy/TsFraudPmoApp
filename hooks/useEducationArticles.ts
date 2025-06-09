import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface EducationArticle {
  id: string;
  title: string;
  content: string;
  advice?: string;
  image_url: string;
  source_url: string;
  created_at: string;
}

export default function useEducationArticles(limit: number = 20) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<EducationArticle[]>([]);

  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('educational_articles')
          .select('id, title, content, advice, image_url, source_url, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setArticles(data || []);
      } catch (err) {
        console.error('Error fetching educational articles:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch articles');
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, [limit]);

  return { loading, error, articles };
}

export async function getEducationArticleById(id: string): Promise<EducationArticle | null> {
  try {
    const { data, error } = await supabase
      .from('educational_articles')
      .select('id, title, content, advice, image_url, source_url, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
} 