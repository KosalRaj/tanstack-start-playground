import puppeteer from 'puppeteer';

async function test(symbol) {
  const targetUrl = `https://nepsealpha.com/stocks/${symbol}/info`;
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  const html = await page.content();
  await browser.close();
  
  import('fs').then(fs => fs.writeFileSync('nepsealpha_shivm.html', html));
  console.log("Saved to nepsealpha_shivm.html")
}

test('SHIVM').catch(console.error);
