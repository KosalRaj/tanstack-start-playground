import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function test(symbol) {
  const targetUrl = `https://nepsealpha.com/stocks/${symbol}/info`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log(`Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  const html = await page.content();
  await browser.close();
  
  // Dump a tiny bit so we know it loaded
  console.log("HTML Start:", html.substring(0, 200));
  
  const $ = cheerio.load(html);
  console.log("\n--- Scraping Text Snippets ---");
  // Find tables and their text
  $('table').each((i, table) => {
    console.log(`Table ${i}:`, $(table).text().replace(/\s+/g, ' ').substring(0, 200));
  });
  
  console.log("\n--- Finding specific labels ---");
  ['LTP', 'Last Traded Price', 'Sector', '52 Weeks High/Low', 'Market Capitalization'].forEach(label => {
    const el = $(`*:contains("${label}")`).last();
    console.log(`"${label}": found? ${el.length > 0}`);
    if (el.length) {
      console.log(`  Parent HTML:`, el.parent().html()?.substring(0, 150));
    }
  });
}

test('SHIVM').catch(console.error);
