import Asciidoctor from '@asciidoctor/core';
import { fontDataUri, asciidoctorCss } from './assets.js';

const asciidoctor = Asciidoctor();

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
    safe: 'safe',
  };
  if (baseDir) {
    options.base_dir = baseDir;
  }

  // Use load() to access document attributes and get the body HTML.
  // We render with standalone:false to avoid Asciidoctor reading its CSS
  // from the filesystem (which fails in Bun-compiled binaries). Instead,
  // we wrap the body in a full HTML document ourselves with the pre-loaded
  // Asciidoctor CSS and inline font-face declarations.
  const doc = asciidoctor.load(source, options);
  const attributes = doc.getAttributes();
  const body = doc.convert();

  const title = doc.getDocumentTitle() || '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${asciidoctorCss}</style>
<style>${fontFaceCss}</style>
</head>
<body class="article">
${body}
</body>
</html>`;

  return { html, attributes };
}
