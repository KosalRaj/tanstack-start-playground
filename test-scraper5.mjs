import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('nepsealpha_shivm.html', 'utf8');
const $ = cheerio.load(html);
const detail = {};

detail.name = $('title').text().split('|')[0].trim();

// Try to find the exact node structure Nepsealpha uses for price
const priceMatch = html.match(/style="font-size:\s*2rem;"[^>]*>\s*([\d.,]+)\s*<\/span>/) || 
                   html.match(/class="text-danger"[^>]*>\s*([\d.,]+)\s*<\/span>/) ||
                   html.match(/class="text-success"[^>]*>\s*([\d.,]+)\s*<\/span>/);
if(priceMatch) detail.ltp = priceMatch[1];


const cMatch = html.match(/<i[^>]*><\/i>\s*<em[^>]*>\s*([-+\d.,]+%)\s*<\/em>/);
if(cMatch) detail.percentChange = cMatch[1];


// They actually seem to store 52 Week High/Low correctly so we can re-use it
const getStat = (label) => {
  let value = '';
  // Nepsealpha uses tr/td
  $('tr').each(function () {
    const htmlStr = $(this).html() || '';
    if (htmlStr.toLowerCase().replace(/\s/g, '').includes(label.toLowerCase().replace(/\s/g, ''))) {
      const tdLabel = $(this).find('td.text-bold, th').filter(function () { return $(this).text().toLowerCase().includes(label.toLowerCase()); });
      if (tdLabel.length) {
        // usually the next 'td' that isn't bold
        value = $(this).find('td').not('.text-bold').first().text().trim();
      }
    }
  });
  return value.replace(/\s+/g, ' ');
};

detail.sector = getStat('Sector') || html.match(/<em>([^<]+)<\/em>/)?.[1];
detail.marketCap = getStat('Market Capitalization (Rs.)') || getStat('Market Capitalization');
detail.shareOutstanding = getStat('Shares Outstanding');
detail.open = getStat('Open');
detail.high = getStat('High');
detail.low = getStat('Low');
detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low') || getStat('120 Days Avg');

const volMatch = html.match(/Volume:\s*<\/[^>]*>\s*([\d.,]+)/i) || html.match(/Volume:\s*([\d.,]+)/i);
if(volMatch) detail.volume = volMatch[1];

console.log(detail);
