const { GoogleGenAI, createUserContent } = require("@google/genai");
require('dotenv').config();
const { supabase } = require('../supabase.js');

const gemini = new GoogleGenAI({apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY});

const ARTICLE_PROMPT = `
You are an expert at rewriting scam education articles.

Your task:
- Rewrite the given article in a polished, informative, and engaging tone.
- Then, add a "Practical Advice" section with clear scam prevention tips.
- Make sure the result is valid JSON. **Do not include markdown formatting. Do not wrap the output in triple backticks.**

Output format:
{
  "title": "A clear, engaging title",
  "content": "The rewritten and polished article",
  "advice": "A short section with practical scam prevention tips"
}

Here is the article:
`;

async function summariseWithGemini(articleText) {
    try {
      const contents = [
        createUserContent([ARTICLE_PROMPT + articleText])
      ];
  
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
      });
  
      let text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      
      // Clean up known wrappers
      text = text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```/, '')
        .replace(/```$/, '');
  
      // Basic logging to help debug bad responses
      if (!text.startsWith('{')) {
        console.error('[Gemini] Response did not start with `{`:');
        console.error(text.slice(0, 300));  // Print the first part
      }
  
      const summary = JSON.parse(text);
  
      // Validate presence of required fields
      if (!summary.title || !summary.content || !summary.advice) {
        throw new Error('Invalid response format from Gemini (missing fields)');
      }
  
      return summary;
    } catch (error) {
      console.error('Error in summariseWithGemini:', error.message);
      throw error;
    }
}
  
async function generateEmbedding(text) {
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

async function checkForDuplicate(title) {
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

function isValidContent(content) {
    return true;
    /*
    if (content.length < 50) return false;
  
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return paragraphs.length >= 1;
    */
}

function extractDomain(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

module.exports = {
  summariseWithGemini,
  generateEmbedding,
  checkForDuplicate,
  isValidContent,
  extractDomain
}; 