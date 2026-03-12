import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('adbl.html', 'utf8');
const $ = cheerio.load(html);
const detail = {};

const getStat = (label) => {
  let value = '';
  // Try finding label in any td/th, then get the very next td/th element's text
  // The layout often puts label in <td> and value in next <td>
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:<td|<th)[^>]*>(?:<[^>]+>)*\\s*${escapedLabel}[^<]*(?:<\\/[^>]+>)*\\s*<\\/(?:td|th)>\\s*<td[^>]*>(.*?)<\\/td>`, 'is');
  const match = html.match(regex);
  if (match) {
    return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  
  // fallback tr traversal
  $('tr').each(function () {
    const htmlStr = $(this).html() || '';
    if (htmlStr.toLowerCase().replace(/\s/g, '').includes(label.toLowerCase().replace(/\s/g, ''))) {
      const th = $(this).find('td, th').filter(function () { 
         // Check if this cell EXACTLY or closely contains the label without grabbing the whole row
         return $(this).text().toLowerCase().trim().startsWith(label.toLowerCase().trim()) ||
                $(this).text().toLowerCase().trim() === label.toLowerCase().trim() ||
                $(this).text().toLowerCase().includes(label.toLowerCase());
      }).first();
      
      if (th.length) {
        // value is typically the next sibling td
        const nextTd = th.next('td');
        if(nextTd.length) value = nextTd.text().trim();
      }
    }
  });

  return value.replace(/\s+/g, ' ');
};

detail.epsTtm = getStat('EPSTTM') || getStat('EPS TTM');
detail.peRatio = getStat('PERatioTTM') || getStat('PE Ratio TTM') || getStat('PERatio');
detail.pbRatio = getStat('PBRatio') || getStat('PB Ratio');
detail.roeTtm = getStat('ROETTM') || getStat('ROE TTM');
detail.bookValue = getStat('Book Value') || getStat('BVPS');

console.log(detail);
