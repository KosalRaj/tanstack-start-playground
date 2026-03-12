import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('adbl.html', 'utf8');
const $ = cheerio.load(html);

// Find elements with EPS, PE, ROE, etc.
const keywords = ['EPS', 'PE Ratio', 'PB Ratio', 'PS Ratio', 'ROE', 'ROA', 'Asset Turnover', 'Book Value'];

console.log("--- Extracting Financial Table Rows ---\n");
$('tr').each(function() {
  const text = $(this).text().replace(/\s+/g, ' ').trim();
  if (keywords.some(k => text.includes(k))) {
    console.log("ROW: ", text);
  }
});

