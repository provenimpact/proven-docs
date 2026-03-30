import { chromium } from 'playwright-core';
import { mermaidJsContent } from './enrich.js';
import { discoverBrowser } from './browser.js';

/**
 * Print an HTML string to PDF using a headless Chromium browser.
 *
 * If the HTML contains <pre class="mermaid"> blocks (transformed by enrich.js),
 * mermaid.js is loaded via addScriptTag and diagrams are rendered to inline SVG
 * before printing.
 *
 * If the HTML contains elements with `data-pdf-header` or `data-pdf-footer`
 * attributes (injected by a custom template), they are extracted from the DOM
 * and passed to Playwright's `headerTemplate` / `footerTemplate` options so
 * that they render in the PDF margin area on every page — completely decoupled
 * from body content.
 *
 * @param {string} html - Complete HTML document string (enriched)
 * @param {string} outputPath - File path to write the PDF to
 * @returns {Promise<void>}
 */
export async function printToPdf(html, outputPath) {
  const hasMermaid = html.includes('class="mermaid"');
  let browser;
  try {
    const executablePath = discoverBrowser();
    browser = await chromium.launch({ executablePath });
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
      await page.addScriptTag({ content: mermaidJsContent });

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

    // Extract header/footer templates from the DOM (if present).
    // These elements are removed from the body so they don't render in
    // the content area — Playwright renders them in the margin zone.
    const templates = await page.evaluate(() => {
      const headerEl = document.querySelector('[data-pdf-header]');
      const footerEl = document.querySelector('[data-pdf-footer]');

      let headerHtml = null;
      let footerHtml = null;

      if (headerEl) {
        headerHtml = headerEl.innerHTML;
        headerEl.remove();
      }
      if (footerEl) {
        footerHtml = footerEl.innerHTML;
        footerEl.remove();
      }

      return { headerHtml, footerHtml };
    });

    // Build PDF options
    const pdfOptions = {
      path: outputPath,
      preferCSSPageSize: true,
      printBackground: true,
    };

    if (templates.headerHtml || templates.footerHtml) {
      pdfOptions.displayHeaderFooter = true;
      // When using Playwright header/footer templates, Playwright must own
      // the page layout.  Disable preferCSSPageSize so that @page CSS does
      // not interfere with the margins, and use format + margin instead.
      pdfOptions.preferCSSPageSize = false;
      pdfOptions.format = 'A4';
      pdfOptions.margin = {
        top: '28mm',
        bottom: '12mm',
        left: '20mm',
        right: '20mm',
      };
      // Playwright renders header/footer templates with font-size:0 by
      // default, so we must set a base font-size.  -webkit-print-color-adjust
      // ensures background colours render in the printed output.
      const wrapStyle = 'width:100%; margin:0; padding:0; font-size:10pt; -webkit-print-color-adjust:exact;';
      pdfOptions.headerTemplate = templates.headerHtml
        ? `<div style="${wrapStyle}">${templates.headerHtml}</div>`
        : '<span></span>';
      pdfOptions.footerTemplate = templates.footerHtml
        ? `<div style="${wrapStyle}">${templates.footerHtml}</div>`
        : '<span></span>';
    }

    await page.pdf(pdfOptions);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
