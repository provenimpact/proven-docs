import hljs from 'highlight.js';
import { mermaidJsContent as _mermaidJsContent, hljsCss } from './assets.js';

// Re-export for print.js to use with page.addScriptTag({ content })
export const mermaidJsContent = _mermaidJsContent;

/**
 * Transform Asciidoctor's mermaid code blocks into <pre class="mermaid"> elements.
 *
 * Asciidoctor renders [source,mermaid] blocks as:
 *   <pre class="highlight"><code data-lang="mermaid">...diagram...</code></pre>
 *
 * Mermaid.js expects:
 *   <pre class="mermaid">...diagram...</pre>
 */
function transformMermaidBlocks(html) {
  return html.replace(
    /<pre class="highlight"><code[^>]*data-lang="mermaid"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_match, diagramSource) => `<pre class="mermaid">${diagramSource}</pre>`,
  );
}

/**
 * Apply syntax highlighting to source code blocks using highlight.js (server-side).
 *
 * Asciidoctor renders [source,<lang>] blocks as:
 *   <pre class="highlight"><code data-lang="<lang>">...code...</code></pre>
 *
 * This function highlights the code server-side and wraps it with hljs classes.
 */
function highlightCodeBlocks(html) {
  return html.replace(
    /<pre class="highlight"><code(?:\s+class="language-([^"]*)")?\s+data-lang="([^"]*)">([\s\S]*?)<\/code><\/pre>/g,
    (_match, _langClass, lang, code) => {
      // Skip mermaid blocks (already handled)
      if (lang === 'mermaid') return _match;

      // Decode HTML entities before highlighting
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      let highlighted;
      try {
        if (hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(decoded, { language: lang }).value;
        } else {
          // Unrecognised language — render as plain text
          highlighted = code;
        }
      } catch {
        // On any highlighting error, fall back to plain text
        highlighted = code;
      }

      return `<pre class="highlight"><code class="hljs language-${lang}" data-lang="${lang}">${highlighted}</code></pre>`;
    },
  );
}

/**
 * Enrich an HTML document with syntax highlighting and Mermaid block transformation.
 *
 * - Syntax highlighting: Applies highlight.js server-side and injects the CSS theme
 * - Mermaid: Transforms code blocks into <pre class="mermaid"> elements for
 *   browser-side rendering (the actual mermaid.js execution happens in print.js
 *   via page.addScriptTag + page.evaluate)
 *
 * @param {string} html - Complete HTML document string from renderToHtml()
 * @returns {string} Enriched HTML with highlighted code and transformed mermaid blocks
 */
export function enrichHtml(html) {
  // Check if there are any mermaid blocks
  const hasMermaid = /data-lang="mermaid"/.test(html);

  // Check if there are any source code blocks (non-mermaid)
  const hasCode = /<code[^>]*data-lang="(?!mermaid)[^"]*"/.test(html);

  // Step 1: Apply server-side syntax highlighting (before mermaid transform)
  if (hasCode) {
    html = highlightCodeBlocks(html);
  }

  // Step 2: Transform mermaid blocks (after highlighting, so highlighting skips them)
  if (hasMermaid) {
    html = transformMermaidBlocks(html);
  }

  // Step 3: Inject highlight.js CSS into <head>
  if (hasCode) {
    html = html.replace('</head>', `<style>${hljsCss}</style>\n</head>`);
  }

  return html;
}
