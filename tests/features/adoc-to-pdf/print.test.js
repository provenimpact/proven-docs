// Feature: adoc-to-pdf
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-003: PDF via headless browser printing
//
// Test level: Integration

import { describe, it, expect, afterEach } from 'vitest';
import { printToPdf } from '../../../src/print.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('PDF-003: Produce PDF by printing HTML in a headless browser', { timeout: 30000 }, () => {
  const tmpFiles = [];

  afterEach(() => {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    tmpFiles.length = 0;
  });

  it('should produce a valid PDF file from an HTML string', async () => {
    const html = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
    const outputPath = path.join(os.tmpdir(), `test-${Date.now()}.pdf`);
    tmpFiles.push(outputPath);

    await printToPdf(html, outputPath);

    expect(fs.existsSync(outputPath)).toBe(true);
    const contents = fs.readFileSync(outputPath);
    // PDF files start with %PDF
    expect(contents.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('should produce a non-empty PDF', async () => {
    const html = '<!DOCTYPE html><html><head></head><body><p>Content</p></body></html>';
    const outputPath = path.join(os.tmpdir(), `test-nonempty-${Date.now()}.pdf`);
    tmpFiles.push(outputPath);

    await printToPdf(html, outputPath);

    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(0);
  });
});
