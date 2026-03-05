import { chromium } from 'playwright';

/**
 * Print an HTML string to PDF using a headless Chromium browser.
 *
 * @param {string} html - Complete HTML document string
 * @param {string} outputPath - File path to write the PDF to
 * @returns {Promise<void>}
 */
export async function printToPdf(html, outputPath) {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
