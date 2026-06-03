const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('json') || url.includes('eventos')) {
      try {
        const text = await response.text();
        if (text.includes('{') || text.includes('[')) {
          console.log('--- FOUND API ---');
          console.log('URL:', url);
          console.log('Preview:', text.substring(0, 500));
        }
      } catch (e) {}
    }
  });

  await page.goto('https://www.campinas.sp.gov.br/eventos', { waitUntil: 'networkidle0' });
  await browser.close();
})();
