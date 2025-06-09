const { createClient } = require('@supabase/supabase-js');
const { getJson } = require('serpapi');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { summariseWithGemini, generateEmbedding, extractDomain, isValidContent, checkForDuplicate } = require('../lib/ai/EducationUtils');

// Load environment variables
dotenv.config();

// Supabase setup
const supabase = createClient(
  process.env.EXPO_PUBLIC_SECOND_SUPABASE_URL,
  process.env.SUPABASE_SECOND_SERVICE_ROLE_KEY
);

const keywords = [
  'phishing scams',
  'how to avoid scams',
  'online scam prevention',
  'investment scam red flags',
  'fake delivery notifications',
  'social media fraud tips',
];

const BLOCKED_DOMAINS = [
  '.pdf', 'facebook.com', 'twitter.com', 'instagram.com',
  'youtube.com', 'tiktok.com', 'linkedin.com'
];

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith('https')) return false;
    return !BLOCKED_DOMAINS.some(domain =>
      parsed.hostname.includes(domain) || parsed.pathname.includes(domain)
    );
  } catch {
    return false;
  }
}

function isValidArticle(article) {
  if (!article.title || !article.link || !article.snippet) return { valid: false, reason: 'Missing fields' };
  if (countWords(article.title) < 2) return { valid: false, reason: 'Short title' };
  if (countWords(article.snippet) < 20) return { valid: false, reason: 'Short content' };
  if (!isValidUrl(article.link)) return { valid: false, reason: 'Invalid URL' };
  return { valid: true };
}

async function fetchFullContent(url) {
  try {
    const { data: html } = await axios.get(url, { timeout: 8000 });
    const $ = cheerio.load(html);
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
    const text = paragraphs.join('\n\n');
    return text;
  } catch (err) {
    console.error('Failed to fetch full content:', url, err.message);
    return '';
  }
}

async function isDuplicate(article) {
  return await checkForDuplicate(article.title);
}

async function insertToSupabase(rawArticle) {
  const fullText = await fetchFullContent(rawArticle.link);
  if (!isValidContent(fullText)) {
    console.log('Skipped due to insufficient content from:', rawArticle.link);
    return;
  }

  try {
    const processed = await summariseWithGemini(fullText);
    const embedding = await generateEmbedding(processed.content);
    const domain = extractDomain(rawArticle.link);
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('educational_articles')
      .insert([{
        title: processed.title,
        content: processed.content,
        advice: processed.advice,
        embedding,
        source_url: rawArticle.link,
        image_url: null,
        type: domain,
        created_at: timestamp,
      }]);

    if (error) throw new Error(`Insert error: ${error.message}`);
  } catch (error) {
    console.error('Gemini processing or DB insert failed for:', rawArticle.link, error.message);
  }
}

async function searchAndProcessArticles(keyword) {
  const stats = { keyword, scraped: 0, inserted: 0, skipped: 0, skipReasons: {} };
  try {
    const searchResults = await getJson({ engine: "google", q: keyword, api_key: process.env.SERPAPI_API_KEY });
    const articles = searchResults.organic_results || [];
    stats.scraped = articles.length;

    for (const article of articles) {
      const validation = isValidArticle(article);
      if (!validation.valid) {
        stats.skipped++;
        stats.skipReasons[validation.reason] = (stats.skipReasons[validation.reason] || 0) + 1;
        continue;
      }

      if (await isDuplicate(article)) {
        stats.skipped++;
        stats.skipReasons['Duplicate'] = (stats.skipReasons['Duplicate'] || 0) + 1;
        continue;
      }

      await insertToSupabase(article);
      stats.inserted++;
      await new Promise(res => setTimeout(res, 1000));
    }
  } catch (err) {
    console.error(`Error for ${keyword}:`, err.message);
    stats.error = err.message;
  }
  return stats;
}

async function main() {
  const summary = [];
  for (const keyword of keywords) {
    const stats = await searchAndProcessArticles(keyword);
    summary.push(stats);
    await new Promise(res => setTimeout(res, 2000));
  }
  console.table(summary.map(s => ({ Keyword: s.keyword, Scraped: s.scraped, Inserted: s.inserted, Skipped: s.skipped })));
}

main().catch(console.error);