import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All assets use a dual-mode loading strategy:
//   - Bun-compiled binary: import from static-assets-generated.js (built by script/build.js)
//   - Node.js dev mode: read from filesystem via require.resolve / fs.readFileSync

let mermaidJsContent, hljsCss, asciidoctorCss, fontCache;

try {
  // In Bun-compiled binary, all assets are pre-computed JS string literals
  const generated = await import('./static-assets-generated.js');
  mermaidJsContent = generated.mermaidJsContent;
  hljsCss = generated.hljsCss;
  asciidoctorCss = generated.asciidoctorCss;
  fontCache = generated.default;
} catch {
  // In Node.js dev mode, read everything from filesystem
  mermaidJsContent = fs.readFileSync(
    require.resolve('mermaid/dist/mermaid.min.js'), 'utf-8',
  );
  hljsCss = fs.readFileSync(
    require.resolve('highlight.js/styles/github.css'), 'utf-8',
  );
  asciidoctorCss = fs.readFileSync(
    path.join(__dirname, '..', 'node_modules', '@asciidoctor', 'core', 'dist', 'css', 'asciidoctor.css'),
    'utf-8',
  );

  const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
  fontCache = new Map();
  for (const file of fs.readdirSync(fontsDir).filter(f => f.endsWith('.woff2'))) {
    const buf = fs.readFileSync(path.join(fontsDir, file));
    fontCache.set(file, `data:font/woff2;base64,${buf.toString('base64')}`);
  }
}

export { mermaidJsContent, hljsCss, asciidoctorCss };

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
