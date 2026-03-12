import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('nepsealpha_shivm.html', 'utf8');
const $ = cheerio.load(html);
const detail = {};

// NAME
detail.name = $('title').text().split('|')[0].trim();

// LTP
const ltpMatch = html.match(/<span[^>]*style="font-size: 2rem;"[^>]*>\s*([\d,.]+)\s*<\/span>/);
if(ltpMatch) detail.ltp = ltpMatch[1];
else {
    // try fallback looking for the big number span
    const allBigSpans = $('span').filter(function() { return $(this).css('font-size') === '2rem' });
    if(allBigSpans.length) detail.ltp = allBigSpans.first().text().trim();
    // try standard classes
    if(!detail.ltp) detail.ltp = $('.text-danger, .text-success').filter(function() { return $(this).text().trim().match(/^[\d,.]+$/) }).first().text().trim();
}

// Percent Change
const pcMatch = html.match(/\(([-+\d.]+)%\)/);
if(pcMatch) detail.percentChange = pcMatch[1] + '%';

// Point Change
const cMatch = html.match(/color:\s*rgb\(220,\s*53,\s*69\)[^>]*>.*?<em[^>]*>\s*([-+\d.]+)/i); // Danger/Red
if(!cMatch) {
  const cMatch2 = html.match(/color:\s*rgb\(40,\s*167,\s*69\)[^>]*>.*?<em[^>]*>\s*([-+\d.]+)/i); // Success/Green
  if(cMatch2) detail.change = cMatch2[1];
} else detail.change = cMatch[1];

// Share Volume
const volMatch = html.match(/Volume:\s*<\/i>\s*([\d,]+)/);
if(volMatch) detail.volume = volMatch[1];

// General Table Stats
const getStat = (label) => {
  let value = '';
  $('tr').each(function () {
    const htmlStr = $(this).html() || '';
    if (htmlStr.toLowerCase().replace(/\s/g, '').includes(label.toLowerCase().replace(/\s/g, ''))) {
      const tdLabel = $(this).find('td.text-bold, th').filter(function () { return $(this).text().toLowerCase().includes(label.toLowerCase()); });
      if (tdLabel.length) {
        value = $(this).find('td').not('.text-bold').first().text().trim();
      }
    }
  });
  return value.replace(/\s+/g, ' '); // Clean up extra spaces
};

detail.sector = getStat('Sector') || html.match(/<em>([^<]+)<\/em>/)?.[1];
detail.marketCap = getStat('Market Capitalization') || getStat('Market Capitalization (Rs.)');
detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low');
detail.shareOutstanding = getStat('Shares Outstanding');

// Open, High, Low
detail.open = getStat('Open');
detail.high = getStat('High');
detail.low = getStat('Low');

console.log(detail);
