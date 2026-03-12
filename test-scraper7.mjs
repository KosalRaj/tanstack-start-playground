import * as fs from 'fs';

const html = fs.readFileSync('nepsealpha_shivm.html', 'utf8');
const detail = {};

// 1. Name
detail.name = html.match(/<title>([^|]+)/)?.[1]?.trim() || '';

// 2. LTP
// Based on the output: <span class="font-weight-bold" style="font-size: 1.25rem;"> 670 </span>
const ltpMatch = html.match(/class="font-weight-bold"[^>]*>\s*([\d.,]+)\s*<\/span>/) ||
                 html.match(/style="font-size:\s*2rem;"[^>]*>\s*([\d.,]+)\s*<\/span>/);
if(ltpMatch) detail.ltp = ltpMatch[1];


// 3. Percent Change
// <span class="ml-2" style="color: rgb(220, 53, 69);"><i class="fa fa-sort-desc"></i> <em style="font-size: 1rem;"> (-0.74)% </em></span>
const pcMatch = html.match(/style="color:\s*rgb\([0-9\s,]+\);"[^>]*>.*?<em[^>]*>\s*([-+\d.,]+%)\s*<\/em>/);
if(pcMatch) detail.percentChange = pcMatch[1];


// 4. Point Change
// Can be inferred or extracted if we find it. For now, it seems they only prominently display % change in the header

// 5. Volume
// <i class="fa fa-bar-chart"></i> Volume: <strong>726890</strong>
const volMatch = html.match(/Volume:\s*(?:<[^>]*>)*\s*([\d.,]+)/i);
if(volMatch) detail.volume = volMatch[1];


// general stat table rows
const getStat = (label) => {
  // Try to find the label in a td or th, then get the text of the next td
  // We'll use a regex that looks for the label, followed by the end of its cell, and captures the contents of the next cell
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:<td|<th)[^>]*>(?:<[^>]+>)*\\s*${escapedLabel}[^<]*(?:<\\/[^>]+>)*\\s*<\\/(?:td|th)>\\s*<td[^>]*>(.*?)<\\/td>`, 'is');
  const match = html.match(regex);
  if (match) {
    // Strip HTML tags and clean up spaces
    return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  return '';
};


detail.sector = getStat('Sector') || html.match(/Sector:\s*<em[^>]*>([^<]+)<\/em>/i)?.[1];
detail.marketCap = getStat('Market Capitalization') || getStat('Market Capitalization (Rs.)');
detail.shareOutstanding = getStat('Shares Outstanding');
detail.open = getStat('Open');
detail.high = getStat('High');
detail.low = getStat('Low');
detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low') || getStat('120 Days Avg');

console.log(detail);
