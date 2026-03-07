import { chromium } from 'playwright';
import { mermaidJsPath } from './enrich.js';

/**
 * Print an HTML string to PDF using a headless Chromium browser.
 *
 * If the HTML contains <pre class="mermaid"> blocks (transformed by enrich.js),
 * mermaid.js is loaded via addScriptTag and diagrams are rendered to inline SVG
 * before printing.
 *
 * @param {string} html - Complete HTML document string (enriched)
 * @param {string} outputPath - File path to write the PDF to
 * @returns {Promise<void>}
 */
export async function printToPdf(html, outputPath) {
  const hasMermaid = html.includes('class="mermaid"');
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    // Capture console warnings from mermaid error handling
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        process.stderr.write(`${msg.text()}\n`);
      }
    });

    await page.setContent(html, { waitUntil: 'load' });

    // If mermaid blocks exist, load and execute mermaid.js in the browser
    if (hasMermaid) {
      await page.addScriptTag({ path: mermaidJsPath });

      await page.evaluate(async () => {
        /* global mermaid */
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        const blocks = document.querySelectorAll('pre.mermaid');
        for (const block of blocks) {
          const source = block.textContent;
          try {
            const id = 'mermaid-' + Math.random().toString(36).substring(2, 10);
            const { svg } = await mermaid.render(id, source);
            block.innerHTML = svg;
            block.setAttribute('data-processed', 'true');
          } catch (err) {
            block.innerHTML =
              '<div style="border:2px solid #cc0000;padding:8px;color:#cc0000;' +
              'font-family:monospace;white-space:pre-wrap;">' +
              'Mermaid syntax error:\n' +
              (err.message || String(err)).substring(0, 500) +
              '</div>';
            block.setAttribute('data-error', 'true');
            console.warn('[mermaid] Diagram parse error: ' + (err.message || String(err)));
          }
        }
      });
    }

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
