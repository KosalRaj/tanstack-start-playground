import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function test(symbol) {
  const targetUrl = `https://nepsealpha.com/stocks/${symbol}/info`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log(`Navigating to ${targetUrl}...`);
  // Try networkidle0 instead
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // wait for an element that contains "LTP" or similar just in case
  try {
     await page.waitForSelector('.table-responsive', { timeout: 5000 });
  } catch(e) {}

  const html = await page.content();
  await browser.close();
  
  const $ = cheerio.load(html);
  const detail = { symbol };
  
  // Try Cheerio selectors mimicking what we put in server
  detail.name = $('title').text().split('|')[0].trim() ||
        $('h4.text-primary.box-title').first().text().trim() ||
        $('h1, h2').text().match(/([A-Z\s]+(Limited|Ltd|Bank|Finance)!?)/i)?.[0]?.trim();

  const ltpMatch = html.match(/class="font-weight-bold"[^>]*>\s*([\d.,]+)\s*<\/span>/) ||
                   html.match(/style="font-size:\s*2rem;"[^>]*>\s*([\d.,]+)\s*<\/span>/);
  if(ltpMatch) detail.ltp = ltpMatch[1];

  const getStat = (label) => {
    let value = '';
    $('tr').each(function () {
      const htmlStr = $(this).html() || '';
      if (htmlStr.toLowerCase().replace(/\s/g, '').includes(label.toLowerCase().replace(/\s/g, ''))) {
        const th = $(this).find('td.text-bold, th').filter(function () { return $(this).text().toLowerCase().includes(label.toLowerCase()); });
        if (th.length) {
          value = $(this).find('td').not('.text-bold').first().text().trim();
        }
      }
    });
    return value.replace(/\s+/g, ' ');
  };
  
  detail.sector = getStat('Sector') || html.match(/Sector:\s*<em[^>]*>([^<]+)<\/em>/i)?.[1];
  detail.marketCap = getStat('Market Capitalization') || getStat('Market Capitalization (Rs.)');
  detail.open = getStat('Open');
  detail.high = getStat('High');
  detail.low = getStat('Low');
  detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low') || getStat('120 Days Avg');

  console.log("Extracted:", detail);
}

test('ADBL').catch(console.error);
