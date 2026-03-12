import { createServerFn } from '@tanstack/react-start';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const dbPath = path.resolve(process.cwd(), 'db', 'stocks-detail.json');

export type StockDetail = {
  symbol: string;
  name?: string;
  sector?: string;
  ltp?: string;
  change?: string;
  percentChange?: string;
  open?: string;
  high?: string;
  low?: string;
  volume?: string;
  shareOutstanding?: string;
  marketCap?: string;
  fiftyTwoWeekHighLow?: string;
  eps?: string;
  peRatio?: string;
  pbRatio?: string;
  roe?: string;
  bookValue?: string;
  error?: string;
};

export const getOrScrapeStockInfo = createServerFn({ method: "GET" })
  .inputValidator((symbol: string) => symbol)
  .handler(async ({ data: symbol }) => {
    // 1. Read existing cache
    let cache: Record<string, StockDetail> = {};
    if (fs.existsSync(dbPath)) {
      try {
        const rawContent = fs.readFileSync(dbPath, 'utf8');
        // skip if empty since we initialized it with `{}`
        // but just in case it had comments or issues
        if (rawContent.trim().startsWith('{')) {
          cache = JSON.parse(rawContent);
        }
      } catch (e) {
        console.error("Error reading cache:", e);
      }
    }

    // 2. Check if already cached
    const upperSymbol = symbol.toUpperCase();
    if (cache[upperSymbol] && !cache[upperSymbol].error) {
      console.log(`[getOrScrapeStockInfo] Serving from cache: ${upperSymbol}`);
      return cache[upperSymbol];
    }

    // 3. Otherwise, scrape the data
    console.log(`[getOrScrapeStockInfo] Scraping new info for: ${upperSymbol}`);
    const detail: StockDetail = { symbol: upperSymbol };

    try {
      const targetUrl = `https://nepsealpha.com/stocks/${upperSymbol}/info`;

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();

      // Mimic a real browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      const res = await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      if (res && !res.ok()) {
        await browser.close();
        throw new Error(`Failed to fetch nepsealpha for ${upperSymbol}, status: ${res.status()}`);
      }

      // Wait for the data tables to actually mount on the DOM via SPA AJAX fetches
      try {
        await page.waitForSelector('.table-responsive', { timeout: 10000 });
      } catch (e) {
        console.warn(`[getOrScrapeStockInfo] Timeout waiting for .table-responsive for ${upperSymbol}`);
      }

      // get raw html
      const html = await page.content();
      await browser.close();


      const $ = cheerio.load(html);

      // Nepsealpha DOM is heavily nested. Mix of Cheerio and Regex for maximum resilience
      detail.name = $('title').text().split('|')[0].trim() ||
        $('h4.text-primary.box-title').first().text().trim() ||
        $('h1, h2').text().match(/([A-Z\s]+(Limited|Ltd|Bank|Finance)!?)/i)?.[0]?.trim();

      // LTP
      const ltpMatch = html.match(/class="font-weight-bold"[^>]*>\s*([\d.,]+)\s*<\/span>/) ||
                       html.match(/style="font-size:\s*2rem;"[^>]*>\s*([\d.,]+)\s*<\/span>/);
      if(ltpMatch) detail.ltp = ltpMatch[1];

      // Percent Change
      const pcMatch = html.match(/style="color:\s*rgb\([0-9\s,]+\);"[^>]*>.*?<em[^>]*>\s*([-+\d.,]+%)\s*<\/em>/);
      if(pcMatch) detail.percentChange = pcMatch[1];

      // Volume
      const volMatch = html.match(/Volume:\s*(?:<[^>]*>)*\s*([\d.,]+)/i);
      if(volMatch) detail.volume = volMatch[1];

      // standard table stats
      const getStat = (label: string) => {
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Looks for `<td...>...Label...</td> <td...>VALUE</td>`
        const regex = new RegExp(`(?:<td|<th)[^>]*>(?:<[^>]+>)*\\s*${escapedLabel}[^<]*(?:<\\/[^>]+>)*\\s*<\\/(?:td|th)>\\s*<td[^>]*>(.*?)<\\/td>`, 'is');
        const match = html.match(regex);
        if (match) {
          return match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        }
        
        // Fallback for older DOM structures
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
      detail.shareOutstanding = getStat('Shares Outstanding');
      detail.open = getStat('Open');
      detail.high = getStat('High');
      detail.low = getStat('Low');
      detail.fiftyTwoWeekHighLow = getStat('52 Weeks High/Low') || getStat('120 Days Avg');

      // 6. Advanced Financials extracted via text matching
      $('tr').each(function() {
        const text = $(this).text().replace(/\s+/g, ' ').trim();
        
        if (text.startsWith('EPSTTM ')) {
           detail.eps = text.split('EPSTTM ')[1].split(' ')[0];
        }
        if (text.startsWith('PERatioTTM ')) {
           detail.peRatio = text.split('PERatioTTM ')[1].split(' ')[0];
        }
        if (text.startsWith('PBRatio ')) {
           detail.pbRatio = text.split('PBRatio ')[1].split(' ')[0];
        }
        if (text.startsWith('ROETTM ')) {
            detail.roe = text.split('ROETTM ')[1]; 
        }
        if (text.startsWith('Book Value NPR ') || text.startsWith('Book Value ')) {
            const match = text.match(/Book Value\s*(?:NPR)?\s*([\d.,]+)/i);
            if (match) detail.bookValue = match[1];
        }
      });

      // Ensure some base minimal data exists
      if (!detail.ltp && !detail.sector && !detail.name) {
        throw new Error(`Data format on Nepsealpha changed, could not extract info for ${upperSymbol}`);
      }

    } catch (e: any) {
      console.error(`[getOrScrapeStockInfo] Error scraping ${upperSymbol}:`, e);
      detail.error = e.message || 'Error occurred while scraping data.';
    }

    // 4. Save to cache only if no error
    if (!detail.error) {
      cache[upperSymbol] = detail;
      fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2));
    }

    return detail;
  });
