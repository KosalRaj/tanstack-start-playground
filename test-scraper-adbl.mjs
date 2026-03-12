import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function test(symbol) {
  const targetUrl = `https://nepsealpha.com/stocks/${symbol}/info`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Wait until there are no more than 2 network connections for at least 500 ms.
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for the main tables to appear
    try { await page.waitForSelector('table', { timeout: 10000 }); } catch(e) {}
    
    const html = await page.content();
    fs.writeFileSync('adbl.html', html);
    console.log('Saved adbl.html');
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

test('ADBL').catch(console.error);
