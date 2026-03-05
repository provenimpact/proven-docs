// Feature: adoc-to-pdf
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-002: Render AsciiDoc to HTML
//
// Test level: Unit

import { describe, it, expect } from 'vitest';
import { renderToHtml } from '../../../src/render.js';

describe('PDF-002: Render AsciiDoc content to HTML', () => {
  it('should convert AsciiDoc source to a standalone HTML document', () => {
    const source = '= My Document\n\nHello, world.';
    const html = renderToHtml(source);

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

    const html = renderToHtml(source);

    expect(html).toContain('Section Heading');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('Item one');
    expect(html).toContain('Item two');
  });

  it('should produce a complete HTML document with head and body', () => {
    const source = '= Test\n\nContent.';
    const html = renderToHtml(source);

    expect(html).toContain('<head>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });
});
