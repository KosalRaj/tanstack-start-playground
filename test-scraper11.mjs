import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('adbl.html', 'utf8');
const $ = cheerio.load(html);
const detail = {};

$('tr').each(function() {
  const text = $(this).text().replace(/\s+/g, ' ').trim();
  
  // EPSTTM 25.58 (Book Close Adjusted)
  if (text.startsWith('EPSTTM ')) {
     detail.eps = text.split('EPSTTM ')[1].split(' ')[0]; // Just grab the number
  }
  
  // PERatioTTM 12.39 (3-5 Yrs Avg: 17.66)
  if (text.startsWith('PERatioTTM ')) {
     detail.peRatio = text.split('PERatioTTM ')[1].split(' ')[0];
  }
  
  // PBRatio 1.41 (3-5 Yrs Avg: 1.51)
  if (text.startsWith('PBRatio ')) {
     detail.pbRatio = text.split('PBRatio ')[1].split(' ')[0];
  }
  
  // ROETTM 11.39 %
  if (text.startsWith('ROETTM ')) {
      detail.roe = text.split('ROETTM ')[1]; 
  }
  
  // Book Value NPR 224.37 (Book Close Adjusted)
  if (text.startsWith('Book Value NPR ') || text.startsWith('Book Value ')) {
      const match = text.match(/Book Value\s*(?:NPR)?\s*([\d.,]+)/i);
      if (match) detail.bookValue = match[1];
  }
});

console.log(detail);
