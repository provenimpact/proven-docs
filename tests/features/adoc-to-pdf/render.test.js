// Feature: adoc-to-pdf
// Spec version: 1.2.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-002: Render AsciiDoc to HTML
//   PDF-023: Include directives resolve relative to input file (unit)
//
// Test level: Unit

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { renderToHtml } from '../../../src/render.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('PDF-002: Render AsciiDoc content to HTML', () => {
  it('should convert AsciiDoc source to a standalone HTML document', () => {
    const source = '= My Document\n\nHello, world.';
    const { html } = renderToHtml(source);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('My Document');
    expect(html).toContain('Hello, world.');
  });

  it('should render AsciiDoc formatting (headings, lists, bold)', () => {
    const source = [
      '= Title',
      '',
      '== Section Heading',
      '',
      'Some *bold* text.',
      '',
      '* Item one',
      '* Item two',
    ].join('\n');

    const { html } = renderToHtml(source);

    expect(html).toContain('Section Heading');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('Item one');
    expect(html).toContain('Item two');
  });

  it('should produce a complete HTML document with head and body', () => {
    const source = '= Test\n\nContent.';
    const { html } = renderToHtml(source);

    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('should return document attributes alongside the HTML', () => {
    const source = '= My Doc\n:author: Jane Smith\n:classification: CONFIDENTIAL\n\nBody.';
    const { html, attributes } = renderToHtml(source);

    expect(html).toContain('My Doc');
    expect(attributes).toBeDefined();
    expect(attributes['author']).toBe('Jane Smith');
    expect(attributes['classification']).toBe('CONFIDENTIAL');
  });
});

describe('PDF-023: Include directives resolve relative to base directory (unit)', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-render-unit-'));
    const subDir = path.join(tmpDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'part.adoc'), 'Included part content.\n');
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should resolve include directives when baseDir is provided', () => {
    const source = '= Test\n\ninclude::sub/part.adoc[]\n';
    const { html } = renderToHtml(source, tmpDir);

    expect(html).toContain('Included part content.');
  });

  it('should still work without baseDir (backward compatible)', () => {
    const source = '= Test\n\nHello.';
    const { html } = renderToHtml(source);

    expect(html).toContain('Hello.');
  });
});
