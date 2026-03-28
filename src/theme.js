import fs from 'node:fs';
import path from 'node:path';

/**
 * Internal Asciidoctor attribute names and prefixes to exclude from data-*
 * injection. Uses a denylist approach: any attribute matching these exact
 * names or starting with these prefixes is considered internal.
 */
const INTERNAL_ATTR_EXACT = new Set([
  'backend', 'basebackend', 'doctype', 'embedded', 'filetype',
  'htmlsyntax', 'outfilesuffix', 'prewrap', 'sectids', 'toc',
  'nofooter', 'noheader', 'notitle', 'showtitle', 'webfonts',
  'stylesheet', 'stylesdir', 'copycss', 'linkcss',
  'iconfont-remote', 'iconfont-cdn', 'iconfont-name',
  'safe-mode-level', 'safe-mode-name', 'safe-mode-safe',
  'safe-mode-unsafe', 'safe-mode-server', 'safe-mode-secure',
  // Name-derived attributes
  'doctitle', 'firstname', 'lastname', 'authorinitials', 'authors', 'authorcount',
  'email', 'revnumber', 'revdate', 'revremark',
]);

const INTERNAL_ATTR_PREFIXES = [
  'asciidoctor-', 'attribute-', 'appendix-', 'caution-', 'chapter-',
  'example-', 'figure-', 'important-', 'note-', 'part-', 'section-',
  'table-', 'tip-', 'untitled-', 'version-', 'warning-',
  'last-update-', 'localdate', 'localdatetime', 'localtime', 'localyear',
  'docdate', 'docdatetime', 'docdir', 'docfile', 'docfilesuffix',
  'docname', 'doctime', 'docyear',
  'user-home', 'iconsdir', 'imagesdir', 'stylesdir',
  'max-include-depth', 'source-highlighter',
];

/**
 * Check if an attribute name is a user-defined attribute (not internal).
 */
function isUserAttribute(name) {
  // Skip numeric attributes
  if (/^\d+$/.test(name)) return false;
  // Skip exact matches
  if (INTERNAL_ATTR_EXACT.has(name)) return false;
  // Skip prefix matches
  for (const prefix of INTERNAL_ATTR_PREFIXES) {
    if (name === prefix || name.startsWith(prefix)) return false;
  }
  return true;
}

/**
 * Sanitise an attribute name for use as a data-* attribute.
 * Lowercase, underscores become hyphens.
 */
function sanitiseAttrName(name) {
  return name.toLowerCase().replace(/_/g, '-');
}

/**
 * HTML-escape a string for safe insertion into attribute values and text.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolve font paths in CSS: replace relative url() references with base64
 * data URIs.
 *
 * @param {string} css - CSS content
 * @param {string} cssDir - Directory containing the CSS file
 * @returns {string} CSS with resolved font paths
 */
function resolveFontPaths(css, cssDir) {
  return css.replace(
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/g,
    (match, urlValue) => {
      // Skip data URIs, absolute URLs, and file: URLs
      if (
        urlValue.startsWith('data:') ||
        urlValue.startsWith('http:') ||
        urlValue.startsWith('https:') ||
        urlValue.startsWith('file:')
      ) {
        return match;
      }

      const fontPath = path.resolve(cssDir, urlValue);

      try {
        const buf = fs.readFileSync(fontPath);
        // Determine MIME type from extension
        const ext = path.extname(fontPath).toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === '.woff2') mime = 'font/woff2';
        else if (ext === '.woff') mime = 'font/woff';
        else if (ext === '.ttf') mime = 'font/ttf';
        else if (ext === '.otf') mime = 'font/otf';
        else if (ext === '.svg') mime = 'image/svg+xml';
        else if (ext === '.png') mime = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';

        const dataUri = `data:${mime};base64,${buf.toString('base64')}`;
        return `url('${dataUri}')`;
      } catch {
        process.stderr.write(
          `Warning: Font file not found: ${fontPath} (referenced in theme CSS)\n`,
        );
        return match;
      }
    },
  );
}

/**
 * Decode HTML entities back to raw characters.
 * Asciidoctor returns attribute values with HTML encoding (e.g., & → &amp;).
 * For template substitution, we need the raw values so that {{}} escaping
 * produces correct single-encoded output.
 */
function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Apply Mustache-style substitution on a template string.
 *
 * - `{{{name}}}` — raw (unescaped) substitution
 * - `{{name}}` — HTML-escaped substitution
 *
 * Asciidoctor attribute values arrive HTML-encoded. We decode them first,
 * then {{}} re-encodes for HTML safety, while {{{}}} passes through raw.
 *
 * @param {string} template - Template string with placeholders
 * @param {Record<string, string>} vars - Variables to substitute
 * @returns {string}
 */
function substitute(template, vars) {
  // First pass: triple-brace (raw/unescaped)
  let result = template.replace(/\{\{\{([^}]+)\}\}\}/g, (_match, key) => {
    const trimmed = key.trim();
    if (trimmed === 'body') return vars['body'] || '';
    if (trimmed === 'theme-css') return vars['theme-css'] || '';
    const val = vars[trimmed];
    return val != null ? decodeHtmlEntities(String(val)) : '';
  });

  // Second pass: double-brace (escaped)
  result = result.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
    const trimmed = key.trim();
    const val = vars[trimmed];
    if (val == null) return '';
    // Decode first (undo Asciidoctor encoding), then re-encode for HTML
    return escapeHtml(decodeHtmlEntities(String(val)));
  });

  return result;
}

/**
 * Extract the <body> content from an HTML document string.
 */
function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

/**
 * Apply theme transformations to enriched HTML.
 *
 * Steps:
 *   1. Inject data-* attributes on <body> for all user-defined document attributes
 *   2. If custom CSS provided, replace default Asciidoctor stylesheet
 *   3. If custom template provided, wrap/replace HTML with the template
 *
 * @param {string} html - Enriched HTML document string
 * @param {Record<string, string>} attributes - AsciiDoc document attributes
 * @param {{ themePath?: string, templatePath?: string }} options
 * @returns {string} Themed HTML
 */
export function applyTheme(html, attributes, options = {}) {
  const { themePath, templatePath } = options;

  // --- Step 1: Inject data-* attributes on <body> ---
  // Note: Asciidoctor attribute values are already HTML-entity-encoded
  // (e.g., & becomes &amp;). We only need to escape double quotes for
  // the attribute value context.
  const dataAttrs = Object.entries(attributes)
    .filter(([name]) => isUserAttribute(name))
    .map(([name, value]) => `data-${sanitiseAttrName(name)}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');

  if (dataAttrs) {
    html = html.replace(/<body([^>]*)>/, `<body$1 ${dataAttrs}>`);
  }

  // --- Step 2: Load CSS theme if provided ---
  let resolvedCss = null;
  if (themePath) {
    const cssDir = path.dirname(themePath);
    resolvedCss = fs.readFileSync(themePath, 'utf-8');
    resolvedCss = resolveFontPaths(resolvedCss, cssDir);
  }

  // --- Step 3: Template application ---
  if (templatePath) {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const body = extractBody(html);

    // Build substitution variables: all attributes + body + title + theme-css
    const vars = { ...attributes, body };

    // Add title from the HTML <title> tag if not already an attribute
    if (!vars.title) {
      const titleMatch = html.match(/<title>([^<]*)<\/title>/);
      if (titleMatch) vars.title = titleMatch[1];
    }

    // Make the resolved CSS available as a template variable
    if (resolvedCss) {
      vars['theme-css'] = resolvedCss;
    }

    html = substitute(templateContent, vars);
  } else if (resolvedCss) {
    // No template — replace the Asciidoctor default stylesheet in-place
    // but preserve the highlight.js CSS (injected after by the enricher)
    html = html.replace(
      /(<head[^>]*>[\s\S]*?)<style>[^<]*<\/style>/,
      `$1<style>${resolvedCss}</style>`,
    );
  }

  return html;
}
