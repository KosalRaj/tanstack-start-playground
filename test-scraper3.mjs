import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('nepsealpha_shivm.html', 'utf8');
const $ = cheerio.load(html);

const detail = {};

// 1. Name & Symbol
detail.name = $('h4.text-primary.box-title').first().text().trim() ||
  $('h1, h2').text().match(/([A-Z\s]+(Limited|Ltd|Bank|Finance)!?)/i)?.[0]?.trim();

// 2. LTP
// They wrap standard stats inside an element with class .text-danger or .text-success or just large font
// The actual number is sometimes just rendered directly inside a span.
const ltpNode = $('span.text-danger, span.text-success, span').filter(function() {
  return $(this).css('font-size') === '2rem' || $(this).text().trim().includes('670');
}).first();

detail.ltp = $('span[style*="font-size: 2rem;"]').text().trim();
if (!detail.ltp) {
    // try finding the strong or span closest to the top that looks like a price
    const match = html.match(/style="font-size: 2rem;">\s*([\d,.]+)\s*<\/span>/);
    detail.ltp = match ? match[1] : null;
}

// 3. Percent Change
const pcMatch = html.match(/<em[^>]*>\s*\(([-+\d.]+)%\)\s*<\/em>/);
if (pcMatch) detail.percentChange = pcMatch[1] + '%';

const cMatch = html.match(/<span class="ml-2"[^>]*>\s*([-+\d.]+)\s*<\/span>/);
if (cMatch) detail.change = cMatch[1];


// For the standard tables:
const getStat = (label) => {
  let value = '';
  // Nepsealpha uses tables with th/td 
  $('tr').each(function () {
    const htmlStr = $(this).html() || '';
    if (htmlStr.toLowerCase().replace(/\s/g, '').includes(label.toLowerCase().replace(/\s/g, ''))) {
      const th = $(this).find('td.text-bold, th').filter(function () { return $(this).text().toLowerCase().includes(label.toLowerCase()); });
      if (th.length) {
        value = $(this).find('td').not('.text-bold').first().text().trim();
      }
    }
  });
  return value.replace(/\s+/g, ' '); // Clean up internal newlines and spaces
};

detail.sector = getStat('Sector') || html.match(/<em>([^<]+)<\/em>/)?.[1];
detail.marketCap = getStat('Market Capitalization') || getStat('Market Capitalization (Rs.)');
detail.paidUpCapital = getStat('Paid Up Capital');
detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low');
detail.shareOutstanding = getStat('Shares Outstanding');
detail.open = getStat('Open');
detail.high = getStat('High');
detail.low = getStat('Low');

// Fallback Volume
const volMatch = html.match(/Volume:\s*<\/i>\s*([\d,]+)/);
if(volMatch) detail.volume = volMatch[1];

console.log(detail);
