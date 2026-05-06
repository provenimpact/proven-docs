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
    await page.emulateMedia({ media: 'print' });

    // If mermaid blocks exist, load and execute mermaid.js in the browser
    if (hasMermaid) {
      await page.addStyleTag({
        content: `@media print {
  .listingblock > .content > pre.mermaid {
    padding: 0 !important;
    border: 0 !important;
    overflow: visible !important;
  }
  .listingblock > .content > pre.mermaid > svg {
    display: block;
    margin: 0 auto;
    max-width: 100% !important;
    height: auto;
  }
}`,
      });

      await page.addScriptTag({ content: mermaidJsContent });

      await page.evaluate(async () => {
        /* global mermaid */
        const PX_PER_INCH = 96;
        const MAX_DIAGRAM_HEIGHT_INCHES = 9.5;
        const maxDiagramHeightPx = MAX_DIAGRAM_HEIGHT_INCHES * PX_PER_INCH;

        const hasPercentDimension = (value) => String(value || '').trim().endsWith('%');

        const readViewBoxSize = (svgEl) => {
          const viewBox = svgEl.viewBox && svgEl.viewBox.baseVal;
          if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
            return { width: viewBox.width, height: viewBox.height };
          }
          return null;
        };

        const normalizeIntrinsicSvgSize = (svgEl) => {
          const viewBoxSize = readViewBoxSize(svgEl);
          if (!viewBoxSize) return;

          const widthAttr = svgEl.getAttribute('width');
          const heightAttr = svgEl.getAttribute('height');
          const shouldNormalize =
            !widthAttr ||
            !heightAttr ||
            hasPercentDimension(widthAttr) ||
            hasPercentDimension(heightAttr);

          if (shouldNormalize) {
            svgEl.setAttribute('width', String(viewBoxSize.width));
            svgEl.setAttribute('height', String(viewBoxSize.height));
          }
        };

        const measureRenderedSvgSize = (svgEl) => {
          const rect = svgEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { width: rect.width, height: rect.height };
          }
          return readViewBoxSize(svgEl);
        };

        const fitSvgToSinglePage = (block, svgEl) => {
          normalizeIntrinsicSvgSize(svgEl);
          svgEl.style.maxWidth = '100%';
          svgEl.style.width = '';
          svgEl.style.height = '';
          block.style.pageBreakInside = '';
          block.style.breakInside = '';

          const renderedSize = measureRenderedSvgSize(svgEl);
          if (!renderedSize) return;

          const heightScale = maxDiagramHeightPx / renderedSize.height;
          const needsHeightFit = heightScale < 1;
          const scale = Math.min(1, heightScale);

          if (needsHeightFit) {
            const scaledWidth = renderedSize.width * scale;
            const scaledHeight = renderedSize.height * scale;
            svgEl.style.width = `${scaledWidth}px`;
            svgEl.style.height = `${scaledHeight}px`;
            block.style.pageBreakInside = 'avoid';
            block.style.breakInside = 'avoid-page';
            block.setAttribute('data-page-fit', 'scaled');
            block.setAttribute('data-page-fit-scale', scale.toFixed(3));
          } else {
            block.setAttribute('data-page-fit', 'native');
          }
        };

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
            const svgEl = block.querySelector('svg');
            if (svgEl) {
              fitSvgToSinglePage(block, svgEl);
            }
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
