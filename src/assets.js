import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mermaid: read the full library source for browser injection ---
const mermaidPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'mermaid',
  'dist',
  'mermaid.min.js',
);
export const mermaidJsContent = fs.readFileSync(mermaidPath, 'utf-8');

// --- Highlight.js: read the CSS theme ---
const hljsCssPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'highlight.js',
  'styles',
  'github.css',
);
export const hljsCss = fs.readFileSync(hljsCssPath, 'utf-8');

// --- Fonts: read woff2 files as base64 data URIs ---
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

/**
 * Read a font file and return it as a base64 data URI for woff2.
 * @param {string} filename - Font filename (e.g., 'open-sans-400-normal-latin.woff2')
 * @returns {string} Base64 data URI
 */
export function fontDataUri(filename) {
  const buf = fs.readFileSync(path.join(fontsDir, filename));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}
