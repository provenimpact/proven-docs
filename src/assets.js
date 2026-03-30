import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Mermaid: read the full library source for browser injection ---
const mermaidPath = require.resolve('mermaid/dist/mermaid.min.js');
export const mermaidJsContent = fs.readFileSync(mermaidPath, 'utf-8');

// --- Highlight.js: read the CSS theme ---
const hljsCssPath = require.resolve('highlight.js/styles/github.css');
export const hljsCss = fs.readFileSync(hljsCssPath, 'utf-8');

// --- Asciidoctor: read the default stylesheet ---
// In Bun-compiled binary, static-assets-generated.js is bundled with the CSS.
// In Node.js dev mode, read from filesystem.
let asciidoctorCss;
try {
  const generated = await import('./static-assets-generated.js');
  asciidoctorCss = generated.asciidoctorCss;
} catch {
  const asciidoctorCssPath = path.join(
    __dirname, '..', 'node_modules', '@asciidoctor', 'core', 'dist', 'css', 'asciidoctor.css',
  );
  asciidoctorCss = fs.readFileSync(asciidoctorCssPath, 'utf-8');
}
export { asciidoctorCss };

// --- Fonts: eagerly read all font files and cache as data URIs ---
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');

function readFontAsDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:font/woff2;base64,${buf.toString('base64')}`;
}

// Eagerly read all fonts at module load. In Node.js this reads from disk.
// For Bun compile, the build script pre-generates src/fonts-generated.js
// which is used instead (see below).
let fontCache;

try {
  // In Bun-compiled binary, static-assets-generated.js is bundled with pre-computed data URIs
  const generated = await import('./static-assets-generated.js');
  fontCache = generated.default;
} catch {
  // In Node.js dev mode, read from filesystem
  fontCache = new Map();
  const fontFiles = fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2'));
  for (const file of fontFiles) {
    fontCache.set(file, readFontAsDataUri(path.join(fontsDir, file)));
  }
}

/**
 * Return a base64 data URI for a font file.
 * @param {string} filename - Font filename (e.g., 'open-sans-400-normal-latin.woff2')
 * @returns {string} Base64 data URI
 */
export function fontDataUri(filename) {
  const uri = fontCache instanceof Map ? fontCache.get(filename) : fontCache[filename];
  if (!uri) {
    throw new Error(`Unknown font file: ${filename}`);
  }
  return uri;
}
