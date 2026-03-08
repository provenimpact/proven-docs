import Asciidoctor from '@asciidoctor/core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const asciidoctor = Asciidoctor();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

/**
 * Read a font file and return it as a base64 data URI for woff2.
 */
function fontDataUri(filename) {
  const buf = fs.readFileSync(path.join(fontsDir, filename));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

/**
 * Build inline @font-face CSS for the Asciidoctor stylesheet fonts.
 * These are the same fonts that Asciidoctor's default stylesheet references
 * from Google Fonts, but bundled locally so rendering works offline.
 */
function buildFontFaceCss() {
  const faces = [
    // Open Sans - normal
    { family: 'Open Sans', weight: 300, style: 'normal', file: 'open-sans-300-normal-latin.woff2' },
    { family: 'Open Sans', weight: 400, style: 'normal', file: 'open-sans-400-normal-latin.woff2' },
    { family: 'Open Sans', weight: 600, style: 'normal', file: 'open-sans-600-normal-latin.woff2' },
    // Open Sans - italic
    { family: 'Open Sans', weight: 300, style: 'italic', file: 'open-sans-300-italic-latin.woff2' },
    { family: 'Open Sans', weight: 400, style: 'italic', file: 'open-sans-400-italic-latin.woff2' },
    { family: 'Open Sans', weight: 600, style: 'italic', file: 'open-sans-600-italic-latin.woff2' },
    // Noto Serif - normal
    { family: 'Noto Serif', weight: 400, style: 'normal', file: 'noto-serif-400-normal-latin.woff2' },
    { family: 'Noto Serif', weight: 700, style: 'normal', file: 'noto-serif-700-normal-latin.woff2' },
    // Noto Serif - italic
    { family: 'Noto Serif', weight: 400, style: 'italic', file: 'noto-serif-400-italic-latin.woff2' },
    { family: 'Noto Serif', weight: 700, style: 'italic', file: 'noto-serif-700-italic-latin.woff2' },
    // Droid Sans Mono
    { family: 'Droid Sans Mono', weight: 400, style: 'normal', file: 'droid-sans-mono-400-normal-latin.woff2' },
  ];

  return faces
    .map(
      (f) =>
        `@font-face { font-family: '${f.family}'; font-weight: ${f.weight}; font-style: ${f.style}; src: url('${fontDataUri(f.file)}') format('woff2'); }`,
    )
    .join('\n');
}

// Build the font CSS once at module load time
const fontFaceCss = buildFontFaceCss();

/**
 * Render AsciiDoc source text to a standalone HTML document and extract
 * document attributes.
 *
 * The Asciidoctor default stylesheet references Google Fonts via an external
 * <link> tag. This breaks headless browser PDF printing because the fonts
 * cannot be fetched (especially offline). We replace the external link with
 * inline @font-face declarations using locally bundled woff2 font files,
 * so the HTML is fully self-contained and renders identically offline.
 *
 * @param {string} source - Raw AsciiDoc text
 * @param {string} [baseDir] - Base directory for resolving include directives.
 *   When provided, include:: paths are resolved relative to this directory.
 *   When omitted, Asciidoctor defaults to the process working directory.
 * @returns {{ html: string, attributes: Record<string, string> }}
 *   Complete HTML document string and all document attributes.
 */
export function renderToHtml(source, baseDir) {
  const options = {
    standalone: true,
    safe: 'safe',
  };
  if (baseDir) {
    options.base_dir = baseDir;
  }

  // Use load() + convert() to access document attributes
  const doc = asciidoctor.load(source, options);
  const attributes = doc.getAttributes();
  let html = doc.convert();

  // load() with standalone:true followed by convert() produces the body only.
  // We need the full standalone HTML document, so re-convert with the
  // processor directly to get the complete output including <html>/<head>.
  html = asciidoctor.convert(source, options);

  // Replace external Google Fonts link with inline font-face declarations
  html = html.replace(
    /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/g,
    `<style>${fontFaceCss}</style>`,
  );

  return { html, attributes };
}
