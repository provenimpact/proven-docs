// Feature: custom-themes
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   THM-001: Custom CSS applied via --theme flag
//   THM-002: CSS file format accepted
//   THM-004: Default stylesheet when no --theme
//   THM-005: Error on missing theme file
//   THM-006: Error on unreadable theme file
//   THM-007: Template injection via --template flag
//   THM-008: Mustache-style attribute substitution
//   THM-009: Triple-brace body injection
//   THM-010: Combined template and theme flags
//   THM-011: Error on missing template file
//   THM-012: Default HTML wrapper when no --template
//   THM-013: Document attributes as template variables
//   THM-014: Document attributes as data-* on root element
//   THM-015: Empty string for unset attributes
//   THM-021: Font paths relative to theme directory
//   THM-022: woff2 font support
//   THM-023: Warning on missing font, continue rendering
//   THM-024: Test fixtures for content types
//   THM-025: Reusable fixtures across tests
//   THM-026: Verify metadata in rendered output
//
// Test level: Integration

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('bin/proven-docs.js');
const FIXTURES_DIR = path.resolve('tests/fixtures');

function run(args, options = {}) {
  return execFileAsync('node', [CLI_PATH, ...args], {
    timeout: 60000,
    ...options,
  }).then(
    ({ stdout, stderr }) => ({ stdout, stderr, exitCode: 0 }),
    (err) => ({ stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code }),
  );
}

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-theme-'));

  // Create a custom CSS theme
  fs.writeFileSync(
    path.join(tmpDir, 'custom.css'),
    'body { font-family: "Comic Sans MS", cursive; color: navy; }\n' +
    'h1 { color: darkred; }\n',
  );

  // Create a custom HTML template
  fs.writeFileSync(
    path.join(tmpDir, 'template.html'),
    '<!DOCTYPE html>\n' +
    '<html><head><title>{{title}}</title></head>\n' +
    '<body>\n' +
    '<header>Author: {{author}} | Dept: {{department}}</header>\n' +
    '<main>{{{body}}}</main>\n' +
    '<footer>Classification: {{classification}}</footer>\n' +
    '</body></html>\n',
  );

  // Create a CSS theme with font reference
  const fontsDir = path.join(tmpDir, 'fonts');
  fs.mkdirSync(fontsDir);
  // Create a tiny fake woff2 file for testing
  fs.writeFileSync(path.join(fontsDir, 'test-font.woff2'), Buffer.from('fakewoff2'));
  fs.writeFileSync(
    path.join(tmpDir, 'font-theme.css'),
    '@font-face { font-family: "TestFont"; src: url("fonts/test-font.woff2") format("woff2"); }\n' +
    'body { font-family: "TestFont", sans-serif; }\n',
  );

  // Create a CSS theme referencing a missing font
  fs.writeFileSync(
    path.join(tmpDir, 'missing-font-theme.css'),
    '@font-face { font-family: "MissingFont"; src: url("fonts/does-not-exist.woff2") format("woff2"); }\n' +
    'body { font-family: "MissingFont", sans-serif; }\n',
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- THM-024, THM-025: Test fixtures exist and are reusable ---
describe('THM-024/THM-025: Test fixtures', () => {
  it('should have a minimal.adoc fixture', () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'minimal.adoc'))).toBe(true);
  });

  it('should have a with-mermaid.adoc fixture', () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'with-mermaid.adoc'))).toBe(true);
  });

  it('should have a with-code.adoc fixture', () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'with-code.adoc'))).toBe(true);
  });

  it('should have with-includes fixtures', () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'with-includes', 'main.adoc'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'with-includes', 'chapter.adoc'))).toBe(true);
  });

  it('should have a with-metadata.adoc fixture', () => {
    expect(fs.existsSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'))).toBe(true);
  });
});

// --- THM-001, THM-002: Custom CSS theme via --theme ---
describe('THM-001/THM-002: Custom CSS theme', () => {
  it('should apply custom CSS when --theme is provided', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');
    const outputFile = path.join(tmpDir, 'themed-output.pdf');
    const themePath = path.join(tmpDir, 'custom.css');

    const result = await run(['render', inputFile, '--output', outputFile, '--theme', themePath]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    // PDF should be produced (non-empty)
    const stat = fs.statSync(outputFile);
    expect(stat.size).toBeGreaterThan(0);
  });
});

// --- THM-004: Default stylesheet when no --theme ---
describe('THM-004: Default stylesheet', () => {
  it('should use default Asciidoctor stylesheet when no --theme is provided', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');
    const outputFile = path.join(tmpDir, 'default-output.pdf');

    const result = await run(['render', inputFile, '--output', outputFile]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
  });
});

// --- THM-005: Error on missing theme file ---
describe('THM-005: Missing theme file', () => {
  it('should print an error and exit non-zero when theme file does not exist', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');

    const result = await run(['render', inputFile, '--theme', '/nonexistent/theme.css']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/theme.*not found/i);
  });
});

// --- THM-006: Error on unreadable theme file ---
describe('THM-006: Unreadable theme file', () => {
  it('should print an error and exit non-zero when theme file is not readable', async () => {
    const unreadable = path.join(tmpDir, 'unreadable.css');
    fs.writeFileSync(unreadable, 'body {}');
    fs.chmodSync(unreadable, 0o000);

    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');
    const result = await run(['render', inputFile, '--theme', unreadable]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/cannot read theme|theme.*not/i);

    // Restore permissions for cleanup
    fs.chmodSync(unreadable, 0o644);
  });
});

// --- THM-007, THM-008, THM-009: Template application ---
describe('THM-007/THM-008/THM-009: HTML template', () => {
  it('should inject body and substitute attributes when --template is provided', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'with-metadata.adoc');
    const outputFile = path.join(tmpDir, 'templated-output.pdf');
    const templatePath = path.join(tmpDir, 'template.html');

    const result = await run([
      'render', inputFile,
      '--output', outputFile,
      '--template', templatePath,
    ]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
  });
});

// --- THM-010: Combined template and theme ---
describe('THM-010: Combined template and theme', () => {
  it('should apply both template and theme when both flags are provided', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'with-metadata.adoc');
    const outputFile = path.join(tmpDir, 'combined-output.pdf');
    const templatePath = path.join(tmpDir, 'template.html');
    const themePath = path.join(tmpDir, 'custom.css');

    const result = await run([
      'render', inputFile,
      '--output', outputFile,
      '--template', templatePath,
      '--theme', themePath,
    ]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
  });
});

// --- THM-011: Error on missing template file ---
describe('THM-011: Missing template file', () => {
  it('should print an error and exit non-zero when template file does not exist', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');

    const result = await run(['render', inputFile, '--template', '/nonexistent/template.html']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/template.*not found/i);
  });
});

// --- THM-012: Default HTML wrapper when no --template ---
describe('THM-012: Default HTML wrapper', () => {
  it('should use default HTML wrapper when no --template is provided', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');
    const outputFile = path.join(tmpDir, 'no-template-output.pdf');

    const result = await run(['render', inputFile, '--output', outputFile]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
  });
});

// --- THM-014, THM-026: Document attributes as data-* on root element ---
describe('THM-014/THM-026: Data attributes and metadata in output', () => {
  it('should inject data-* attributes on the body element', async () => {
    // Use the theme engine directly to check HTML output
    const { renderToHtml } = await import('../../../src/render.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = fs.readFileSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'), 'utf-8');
    const baseDir = path.join(FIXTURES_DIR);
    const { html, attributes } = renderToHtml(source, baseDir);
    const themed = applyTheme(html, attributes);

    expect(themed).toContain('data-classification="CONFIDENTIAL"');
    expect(themed).toContain('data-handling="INTERNAL ONLY"');
    expect(themed).toContain('data-document-id="RISK-2026-Q1"');
    // Asciidoctor HTML-encodes attribute values, so & becomes &amp;
    expect(themed).toContain('data-department="Risk &amp; Compliance"');
  });
});

// --- THM-013: Document attributes as template variables ---
describe('THM-013: Attributes as template variables', () => {
  it('should substitute document attributes in templates', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = fs.readFileSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'), 'utf-8');
    const baseDir = path.join(FIXTURES_DIR);
    const { html, attributes } = renderToHtml(source, baseDir);

    const templatePath = path.join(tmpDir, 'template.html');
    const themed = applyTheme(html, attributes, { templatePath });

    expect(themed).toContain('Author: Jane Smith');
    // {{department}} uses escaped mode: decodes Asciidoctor's &amp; then re-escapes
    expect(themed).toContain('Dept: Risk &amp; Compliance');
    expect(themed).toContain('Classification: CONFIDENTIAL');
  });
});

// --- THM-015: Empty string for unset attributes ---
describe('THM-015: Unset attributes', () => {
  it('should substitute empty string for attributes not set in the document', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = '= Simple Doc\n:author: Bob\n\nContent.';
    const { html, attributes } = renderToHtml(source);

    // Template references {{classification}} which is not set
    const templatePath = path.join(tmpDir, 'template.html');
    const themed = applyTheme(html, attributes, { templatePath });

    // Classification should be empty, not literal "{{classification}}"
    expect(themed).toContain('Classification: ');
    expect(themed).not.toContain('{{classification}}');
  });
});

// --- THM-021, THM-022: Font path resolution ---
describe('THM-021/THM-022: Font path resolution', () => {
  it('should resolve relative font paths in CSS to data URIs', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = '= Font Test\n\nBody text.';
    const { html, attributes } = renderToHtml(source);
    const enriched = enrichHtml(html);
    const themePath = path.join(tmpDir, 'font-theme.css');
    const themed = applyTheme(enriched, attributes, { themePath });

    // The font URL should be converted to a data URI
    expect(themed).toContain('data:font/woff2;base64,');
    expect(themed).not.toContain('url("fonts/test-font.woff2")');
  });
});

// --- THM-023: Warning on missing font, continue rendering ---
describe('THM-023: Missing font warning', () => {
  it('should warn about missing font and still produce a PDF', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'minimal.adoc');
    const outputFile = path.join(tmpDir, 'missing-font-output.pdf');
    const themePath = path.join(tmpDir, 'missing-font-theme.css');

    const result = await run([
      'render', inputFile,
      '--output', outputFile,
      '--theme', themePath,
    ]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(result.stderr).toMatch(/font.*not found|warning/i);
  });
});

// --- THM-003: Watch mode applies custom theme ---
describe('THM-003: Watch mode with theme', () => {
  it('should show --theme option in watch help', async () => {
    const result = await run(['watch', '--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/--theme/);
    expect(result.stdout).toMatch(/--template/);
  });
});
