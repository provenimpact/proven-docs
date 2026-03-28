// Feature: distributable-cli
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   DIST-002: Self-contained executable (asset availability)
//   DIST-003: CLI commands identical (asset consistency)
//   DIST-006: npm package includes only runtime files
//   DIST-007: package.json declares minimum Node.js version
//   DIST-012: Mermaid.js embedded in binary
//   DIST-013: highlight.js CSS embedded in binary
//
// Test level: Unit / Integration

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..');

describe('DIST-012: Mermaid.js embedded in binary', () => {
  it('should export mermaidJsContent as a non-empty string', async () => {
    const { mermaidJsContent } = await import('../../../src/assets.js');
    expect(mermaidJsContent).toBeTypeOf('string');
    expect(mermaidJsContent.length).toBeGreaterThan(1000);
  });

  it('should contain mermaid initialization code', async () => {
    const { mermaidJsContent } = await import('../../../src/assets.js');
    // mermaid.min.js should contain the mermaid global
    expect(mermaidJsContent).toMatch(/mermaid/);
  });

  it('should no longer export mermaidJsPath from enrich.js', async () => {
    const enrich = await import('../../../src/enrich.js');
    expect(enrich.mermaidJsPath).toBeUndefined();
  });

  it('should export mermaidJsContent from enrich.js', async () => {
    const enrich = await import('../../../src/enrich.js');
    expect(enrich.mermaidJsContent).toBeTypeOf('string');
    expect(enrich.mermaidJsContent.length).toBeGreaterThan(1000);
  });
});

describe('DIST-013: highlight.js CSS embedded in binary', () => {
  it('should export hljsCss as a non-empty string', async () => {
    const { hljsCss } = await import('../../../src/assets.js');
    expect(hljsCss).toBeTypeOf('string');
    expect(hljsCss.length).toBeGreaterThan(100);
  });

  it('should contain hljs CSS class selectors', async () => {
    const { hljsCss } = await import('../../../src/assets.js');
    expect(hljsCss).toMatch(/\.hljs/);
  });
});

describe('DIST-002: Self-contained asset availability', () => {
  it('should export fontDataUri that returns base64 data URIs', async () => {
    const { fontDataUri } = await import('../../../src/assets.js');
    const uri = fontDataUri('open-sans-400-normal-latin.woff2');
    expect(uri).toMatch(/^data:font\/woff2;base64,/);
    expect(uri.length).toBeGreaterThan(100);
  });
});

describe('DIST-003: CLI commands identical (print.js uses content not path)', () => {
  it('should use addScriptTag with content, not path, in print.js', async () => {
    const printSource = fs.readFileSync(
      path.join(projectRoot, 'src', 'print.js'),
      'utf-8',
    );
    // Should use { content: ... } not { path: ... } for mermaid
    expect(printSource).toMatch(/addScriptTag\(\s*\{\s*content/);
    expect(printSource).not.toMatch(/addScriptTag\(\s*\{\s*path:\s*mermaidJsPath/);
  });
});

describe('DIST-006: npm package includes only runtime files', () => {
  it('should have a files field in package.json', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
    );
    expect(pkg.files).toBeDefined();
    expect(Array.isArray(pkg.files)).toBe(true);
  });

  it('should whitelist bin/, src/, and assets/ in files field', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
    );
    expect(pkg.files).toContain('bin/');
    expect(pkg.files).toContain('src/');
    expect(pkg.files).toContain('assets/');
  });

  it('should not include tests, docs, or examples in files field', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
    );
    for (const excluded of ['tests/', 'docs/', 'examples/', '.github/']) {
      expect(pkg.files).not.toContain(excluded);
    }
  });
});

describe('DIST-007: package.json declares minimum Node.js version', () => {
  it('should have an engines field with node constraint', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'),
    );
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines.node).toBeDefined();
    expect(pkg.engines.node).toMatch(/>=\s*22/);
  });
});
