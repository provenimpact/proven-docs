// Feature: custom-themes
// Spec version: 1.1.0
// Generated from: spec.adoc
//
// Spec coverage:
//   THM-016: Example classified template shipped at examples/templates/classified/
//   THM-017: Colour-coded classification banner via CSS data-classification selectors
//   THM-018: Cover page with metadata fields
//   THM-019: Omit banner when classification not set
//   THM-020: Support multiple classification levels, styling entirely in CSS
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
const CLASSIFIED_TEMPLATE = path.resolve('examples/templates/classified/template.html');
const CLASSIFIED_THEME = path.resolve('examples/templates/classified/theme.css');

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-classified-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- THM-016: Example classified template ---
describe('THM-016: Example classified template', () => {
  it('should ship template.html and theme.css at examples/templates/classified/', () => {
    expect(fs.existsSync(CLASSIFIED_TEMPLATE)).toBe(true);
    expect(fs.existsSync(CLASSIFIED_THEME)).toBe(true);
  });

  it('should render a PDF when using the example template via file path', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'with-metadata.adoc');
    const outputFile = path.join(tmpDir, 'classified-output.pdf');

    const result = await run([
      'render', inputFile,
      '--output', outputFile,
      '--template', CLASSIFIED_TEMPLATE,
      '--theme', CLASSIFIED_THEME,
    ]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    const stat = fs.statSync(outputFile);
    expect(stat.size).toBeGreaterThan(0);
  });
});

// --- THM-017: Colour-coded classification banner via CSS selectors ---
describe('THM-017: Classification banner with CSS attribute selectors', () => {
  it('should render a classification banner when classification attribute is set', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = fs.readFileSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'), 'utf-8');
    const baseDir = FIXTURES_DIR;
    const { html, attributes } = renderToHtml(source, baseDir);
    const enriched = enrichHtml(html);
    const themed = applyTheme(enriched, attributes, {
      templatePath: CLASSIFIED_TEMPLATE,
      themePath: CLASSIFIED_THEME,
    });

    // Should contain the classification text
    expect(themed).toContain('CONFIDENTIAL');
    // Should have the header/footer template structure
    expect(themed).toContain('data-pdf-header');
    expect(themed).toContain('data-pdf-footer');
  });

  it('should use CSS attribute selectors for banner colours, not engine-injected values', () => {
    // Read the theme CSS directly and verify it uses [data-classification] selectors
    const themeCss = fs.readFileSync(CLASSIFIED_THEME, 'utf-8');
    expect(themeCss).toContain('[data-classification="CONFIDENTIAL"]');
    expect(themeCss).toContain('#c62828');
  });
});

// --- THM-018: Cover page with metadata ---
describe('THM-018: Cover page with metadata fields', () => {
  it('should include a cover page with all metadata fields', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = fs.readFileSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'), 'utf-8');
    const baseDir = FIXTURES_DIR;
    const { html, attributes } = renderToHtml(source, baseDir);
    const enriched = enrichHtml(html);
    const themed = applyTheme(enriched, attributes, {
      templatePath: CLASSIFIED_TEMPLATE,
      themePath: CLASSIFIED_THEME,
    });

    // Cover page should contain metadata values
    expect(themed).toContain('Jane Smith');
    expect(themed).toContain('CONFIDENTIAL');
    expect(themed).toContain('INTERNAL ONLY');
    expect(themed).toContain('Board of Directors');
    expect(themed).toContain('RISK-2026-Q1');
    expect(themed).toContain('2026-06-30');
    expect(themed).toContain('cover-page');
  });
});

// --- THM-019: Omit banner when classification not set ---
describe('THM-019: Omit banner when classification not set', () => {
  it('should include CSS rules that hide the banner when classification is absent', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    // Document without classification attribute
    const source = '= Simple Document\n:author: Bob\n\nContent here.';
    const { html, attributes } = renderToHtml(source);
    const enriched = enrichHtml(html);
    const themed = applyTheme(enriched, attributes, {
      templatePath: CLASSIFIED_TEMPLATE,
      themePath: CLASSIFIED_THEME,
    });

    // The themed HTML should contain CSS rules that hide the banner
    // when data-classification is absent or empty
    expect(themed).toContain('display: none');
    // The header/footer template structure should still be present
    expect(themed).toContain('data-pdf-header');
    expect(themed).toContain('data-pdf-footer');
  });

  it('should have CSS rules for hiding banners when classification is absent', () => {
    const themeCss = fs.readFileSync(CLASSIFIED_THEME, 'utf-8');
    // CSS should hide banners when data-classification is empty or absent
    expect(themeCss).toMatch(/body:not\(\[data-classification\]\)/);
    expect(themeCss).toMatch(/\[data-classification=""\]/);
    expect(themeCss).toContain('display: none');
  });
});

// --- THM-020: Support multiple classification levels ---
describe('THM-020: Multiple classification levels with CSS-only styling', () => {
  const levels = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

  for (const level of levels) {
    it(`should produce a PDF with classification level ${level}`, async () => {
      const adocContent = `= Test Document\n:classification: ${level}\n\nContent.`;
      const inputFile = path.join(tmpDir, `test-${level.toLowerCase()}.adoc`);
      const outputFile = path.join(tmpDir, `test-${level.toLowerCase()}.pdf`);
      fs.writeFileSync(inputFile, adocContent);

      const result = await run([
        'render', inputFile,
        '--output', outputFile,
        '--template', CLASSIFIED_TEMPLATE,
        '--theme', CLASSIFIED_THEME,
      ]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  }

  it('should have distinct CSS colour rules for each classification level', () => {
    const themeCss = fs.readFileSync(CLASSIFIED_THEME, 'utf-8');

    // Each level should have a [data-classification="LEVEL"] selector with a distinct colour
    const expectedColours = {
      PUBLIC: '#2e7d32',
      INTERNAL: '#f57c00',
      CONFIDENTIAL: '#c62828',
      RESTRICTED: '#4a148c',
    };

    for (const [level, colour] of Object.entries(expectedColours)) {
      expect(themeCss).toContain(`[data-classification="${level}"]`);
      expect(themeCss).toContain(colour);
    }
  });

  it('should not contain any classification colour logic in the theme engine', async () => {
    // Read the theme engine source and verify no classification colours
    const themeSource = fs.readFileSync(path.resolve('src/theme.js'), 'utf-8');
    expect(themeSource).not.toContain('classificationColours');
    expect(themeSource).not.toContain('banner-bg');
    expect(themeSource).not.toContain('banner-fg');
  });
});
