const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const path = require('path');
const { fileURLToPath } = require('url');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Common headers for requests
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Helper function to check if article exists
async function articleExists(title) {
  const { data } = await supabase
    .from('educational_articles')
    .select('id')
    .eq('title', title)
    .single();
  return !!data;
}

// Helper function to validate article data
function validateArticle(article) {
  if (!article.title || !article.content) {
    console.log('Skipping article due to missing title or content');
    return false;
  }
  if (!article.source_url) {
    console.log('Skipping article due to missing source URL');
    return false;
  }
  return true;
}

// Helper function to insert article
async function insertArticle(article) {
  if (!validateArticle(article)) {
    return false;
  }

  const exists = await articleExists(article.title);
  if (exists) {
    console.log(`Skipping duplicate article: ${article.title}`);
    return false;
  }

  const { error } = await supabase
    .from('educational_articles')
    .insert([article]);

  if (error) {
    console.error('Error inserting article:', error);
    return false;
  }

  console.log(`Inserted article: ${article.title}`);
  return true;
}

// Scraper for ScamShield website
async function scrapeScamShield() {
  try {
    const url = 'https://www.scamshield.gov.sg/introduction-to-scams/';
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const articles = [];

    // Extract main content
    const title = $('h1').first().text().trim();
    const content = [];

    // Extract key points
    $('.content ul li').each((_, el) => {
      content.push($(el).text().trim());
    });

    // Extract common signs of scams
    $('h3:contains("Common signs of scams")').nextUntil('h3').find('li').each((_, el) => {
      content.push($(el).text().trim());
    });

    const article = {
      title,
      content: content.join('\n\n'),
      image_url: 'https://via.placeholder.com/150',
      source_url: url,
      created_at: new Date().toISOString(),
    };

    articles.push(article);
    return articles;
  } catch (error) {
    console.error('Error scraping ScamShield:', error.message);
    return [];
  }
}

// Scraper for GovTech website
async function scrapeGovTech() {
  try {
    const url = 'https://www.tech.gov.sg/products-and-services/for-citizens/scam-prevention/';
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const articles = [];
    const content = [];

    // Extract main content sections
    $('.content-block').each((_, section) => {
      const sectionTitle = $(section).find('h2, h3').first().text().trim();
      const sectionContent = $(section).find('p').map((_, p) => $(p).text().trim()).get();
      
      if (sectionTitle && sectionContent.length) {
        content.push(sectionTitle);
        content.push(...sectionContent);
      }
    });

    const article = {
      title: 'GovTech Scam Prevention Guide',
      content: content.join('\n\n'),
      image_url: 'https://via.placeholder.com/150',
      source_url: url,
      created_at: new Date().toISOString(),
    };

    articles.push(article);
    return articles;
  } catch (error) {
    console.error('Error scraping GovTech:', error.message);
    return [];
  }
}

// Scraper for CPF website
async function scrapeCPF() {
  try {
    const url = 'https://www.cpf.gov.sg/member/infohub/educational-resources/dos-and-donts-of-scam-prevention';
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const articles = [];
    const content = [];

    // Extract do's and don'ts
    $('.article-content').find('h2, h3, p, li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        content.push(text);
      }
    });

    const article = {
      title: "CPF's Do's and Don'ts of Scam Prevention",
      content: content.join('\n\n'),
      image_url: 'https://via.placeholder.com/150',
      source_url: url,
      created_at: new Date().toISOString(),
    };

    articles.push(article);
    return articles;
  } catch (error) {
    console.error('Error scraping CPF:', error.message);
    return [];
  }
}

// Scraper for Care Corner website
async function scrapeCareCorner() {
  try {
    const url = 'https://www.carecorner.org.sg/resource/seniors-getting-scammed-why-it-occurs-and-how-you-can-support-your-loved-ones/';
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const articles = [];
    const content = [];

    // Extract main content
    $('.entry-content').find('h2, h3, p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        content.push(text);
      }
    });

    const article = {
      title: 'Protecting Seniors from Scams - Care Corner Guide',
      content: content.join('\n\n'),
      image_url: 'https://via.placeholder.com/150',
      source_url: url,
      created_at: new Date().toISOString(),
    };

    articles.push(article);
    return articles;
  } catch (error) {
    console.error('Error scraping Care Corner:', error.message);
    return [];
  }
}

// Main function to run all scrapers
async function main() {
  console.log('Starting web scraping process...');
  
  // Initialize statistics
  const stats = {
    scamShield: { found: 0, inserted: 0, skipped: 0 },
    govTech: { found: 0, inserted: 0, skipped: 0 },
    cpf: { found: 0, inserted: 0, skipped: 0 },
    careCorner: { found: 0, inserted: 0, skipped: 0 },
  };

  // ScamShield
  const scamShieldArticles = await scrapeScamShield();
  stats.scamShield.found = scamShieldArticles.length;

  // GovTech
  const govTechArticles = await scrapeGovTech();
  stats.govTech.found = govTechArticles.length;

  // CPF
  const cpfArticles = await scrapeCPF();
  stats.cpf.found = cpfArticles.length;

  // Care Corner
  const careCornerArticles = await scrapeCareCorner();
  stats.careCorner.found = careCornerArticles.length;

  // Combine all articles
  const allArticles = [
    ...scamShieldArticles,
    ...govTechArticles,
    ...cpfArticles,
    ...careCornerArticles,
  ];

  // Process articles
  for (const article of allArticles) {
    const source = article.source_url.includes('scamshield') ? 'scamShield'
      : article.source_url.includes('tech.gov.sg') ? 'govTech'
      : article.source_url.includes('cpf.gov.sg') ? 'cpf'
      : 'careCorner';

    const inserted = await insertArticle(article);
    if (inserted) {
      stats[source].inserted++;
    } else {
      stats[source].skipped++;
    }
  }

  // Log summary
  console.log('\nScraping Summary:');
  console.log('----------------');
  
  for (const [source, data] of Object.entries(stats)) {
    console.log(`\n${source}:`);
    console.log(`  Articles found: ${data.found}`);
    console.log(`  Articles inserted: ${data.inserted}`);
    console.log(`  Articles skipped: ${data.skipped}`);
  }

  const totals = Object.values(stats).reduce((acc, curr) => ({
    found: acc.found + curr.found,
    inserted: acc.inserted + curr.inserted,
    skipped: acc.skipped + curr.skipped,
  }), { found: 0, inserted: 0, skipped: 0 });

  console.log('\nTotal Summary:');
  console.log('-------------');
  console.log(`Total articles found: ${totals.found}`);
    console.log(`Total articles inserted: ${totals.inserted}`);
    console.log(`Total articles skipped: ${totals.skipped}`);
}

// Run the script
main().catch(console.error); 