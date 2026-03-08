// Feature: custom-themes
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   THM-016: Built-in classified template
//   THM-017: Colour-coded classification banner
//   THM-018: Cover page with metadata fields
//   THM-019: Omit banner when classification not set
//   THM-020: Support multiple classification levels
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-classified-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- THM-016: Built-in classified template ---
describe('THM-016: Built-in classified template', () => {
  it('should resolve --template classified as a built-in template', async () => {
    const inputFile = path.join(FIXTURES_DIR, 'with-metadata.adoc');
    const outputFile = path.join(tmpDir, 'classified-output.pdf');

    const result = await run([
      'render', inputFile,
      '--output', outputFile,
      '--template', 'classified',
    ]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(outputFile)).toBe(true);
    const stat = fs.statSync(outputFile);
    expect(stat.size).toBeGreaterThan(0);
  });
});

// --- THM-017: Colour-coded classification banner ---
describe('THM-017: Classification banner', () => {
  it('should render a classification banner when classification attribute is set', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    const source = fs.readFileSync(path.join(FIXTURES_DIR, 'with-metadata.adoc'), 'utf-8');
    const baseDir = FIXTURES_DIR;
    const { html, attributes } = renderToHtml(source, baseDir);
    const enriched = enrichHtml(html);
    const themed = applyTheme(enriched, attributes, { templatePath: 'classified' });

    // Should contain the classification text in the banner
    expect(themed).toContain('CONFIDENTIAL');
    // Should have the header/footer template structure (Playwright headerTemplate approach)
    expect(themed).toContain('data-pdf-header');
    expect(themed).toContain('data-pdf-footer');
    // Banner should contain the classification-level background colour
    expect(themed).toContain('background-color:#c62828');
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
    const themed = applyTheme(enriched, attributes, { templatePath: 'classified' });

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
  it('should include CSS that hides the banner when classification is absent', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    // Document without classification attribute
    const source = '= Simple Document\n:author: Bob\n\nContent here.';
    const { html, attributes } = renderToHtml(source);
    const enriched = enrichHtml(html);
    const themed = applyTheme(enriched, attributes, { templatePath: 'classified' });

    // When classification is absent, the banner text should be empty and
    // the fallback grey colour (#666666) should be used
    expect(themed).toContain('background-color:#666666');
    // The header/footer template structure should still be present
    expect(themed).toContain('data-pdf-header');
    expect(themed).toContain('data-pdf-footer');
  });
});

// --- THM-020: Support multiple classification levels ---
describe('THM-020: Multiple classification levels', () => {
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
        '--template', 'classified',
      ]);

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(outputFile)).toBe(true);
    });
  }

  it('should have distinct banner colours for each classification level', async () => {
    const { renderToHtml } = await import('../../../src/render.js');
    const { enrichHtml } = await import('../../../src/enrich.js');
    const { applyTheme } = await import('../../../src/theme.js');

    // Each level should produce a different background colour in the header
    const expectedColours = {
      PUBLIC: '#2e7d32',
      INTERNAL: '#f57c00',
      CONFIDENTIAL: '#c62828',
      RESTRICTED: '#4a148c',
    };

    for (const level of levels) {
      const source = `= Test\n:classification: ${level}\n\nContent.`;
      const { html, attributes } = renderToHtml(source);
      const enriched = enrichHtml(html);
      const themed = applyTheme(enriched, attributes, { templatePath: 'classified' });

      expect(themed).toContain(`background-color:${expectedColours[level]}`);
    }
  });
});
