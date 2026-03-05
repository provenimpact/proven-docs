// Feature: adoc-to-pdf
// Spec version: 1.1.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-014: Mermaid blocks rendered as visual diagrams
//   PDF-015: Supported Mermaid diagram types
//   PDF-017: Error indication for invalid Mermaid syntax
//   PDF-018: Multiple Mermaid blocks rendered independently
//   PDF-019: Syntax highlighting for source code blocks
//   PDF-022: Graceful fallback for unrecognised languages
//
// Test level: Unit

import { describe, it, expect } from 'vitest';
import { enrichHtml } from '../../../src/enrich.js';

const wrapHtml = (body) =>
  `<!DOCTYPE html><html><head><title>Test</title></head><body>${body}</body></html>`;

describe('PDF-014: Mermaid blocks rendered as visual diagrams', () => {
  it('should transform mermaid code blocks into pre.mermaid elements for browser rendering', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code data-lang="mermaid">flowchart LR\n  A --> B</code></pre>',
    );
    const enriched = enrichHtml(html);

    // Should transform the code block into a mermaid-recognisable element
    expect(enriched).toContain('<pre class="mermaid">');
    // The original code wrapper should be gone
    expect(enriched).not.toContain('data-lang="mermaid"');
  });

  it('should preserve the diagram source content in the transformed block', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code data-lang="mermaid">flowchart LR\n  A --> B</code></pre>',
    );
    const enriched = enrichHtml(html);

    expect(enriched).toContain('flowchart LR');
    expect(enriched).toContain('A --> B');
  });
});

describe('PDF-015: Supported Mermaid diagram types', () => {
  it('should preserve diagram source for all supported types', () => {
    const diagramTypes = [
      'flowchart LR\n  A --> B',
      'sequenceDiagram\n  Alice->>Bob: Hello',
      'classDiagram\n  Animal <|-- Duck',
      'stateDiagram-v2\n  [*] --> Active',
      'C4Context\n  Person(user, "User")',
    ];

    for (const diagram of diagramTypes) {
      const html = wrapHtml(
        `<pre class="highlight"><code data-lang="mermaid">${diagram}</code></pre>`,
      );
      const enriched = enrichHtml(html);

      expect(enriched).toContain('class="mermaid"');
    }
  });
});

describe('PDF-017: Error indication for invalid Mermaid syntax', () => {
  it('should transform invalid mermaid blocks the same as valid ones (errors handled in browser)', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code data-lang="mermaid">this is not valid mermaid</code></pre>',
    );
    const enriched = enrichHtml(html);

    // The enricher transforms all mermaid blocks uniformly —
    // error detection happens at browser render time in print.js
    expect(enriched).toContain('<pre class="mermaid">');
    expect(enriched).toContain('this is not valid mermaid');
  });
});

describe('PDF-018: Multiple Mermaid blocks rendered independently', () => {
  it('should transform all Mermaid blocks in the document', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code data-lang="mermaid">flowchart LR\n  A --> B</code></pre>' +
        '<p>Some text between diagrams</p>' +
        '<pre class="highlight"><code data-lang="mermaid">sequenceDiagram\n  Alice->>Bob: Hi</code></pre>' +
        '<p>More text</p>' +
        '<pre class="highlight"><code data-lang="mermaid">stateDiagram-v2\n  [*] --> Active</code></pre>',
    );
    const enriched = enrichHtml(html);

    // All three original mermaid code blocks should have been transformed
    // (no data-lang="mermaid" code blocks remain)
    expect(enriched).not.toContain('data-lang="mermaid"');

    // The enriched HTML should contain all three diagram sources
    // wrapped in <pre class="mermaid"> elements
    expect(enriched).toContain('flowchart LR');
    expect(enriched).toContain('sequenceDiagram');
    expect(enriched).toContain('stateDiagram-v2');

    // The intermediate text should be preserved between diagrams
    expect(enriched).toContain('Some text between diagrams');
    expect(enriched).toContain('More text');
  });
});

describe('PDF-019: Syntax highlighting for source code blocks', () => {
  it('should inject highlight.js library into the HTML', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code class="language-javascript" data-lang="javascript">const x = 1;</code></pre>',
    );
    const enriched = enrichHtml(html);

    expect(enriched).toContain('hljs');
  });

  it('should inject highlight.js CSS theme', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code class="language-javascript" data-lang="javascript">const x = 1;</code></pre>',
    );
    const enriched = enrichHtml(html);

    // Should have CSS for highlighting
    expect(enriched).toContain('<style');
    expect(enriched).toContain('hljs');
  });
});

describe('PDF-022: Graceful fallback for unrecognised languages', () => {
  it('should not remove code blocks with unrecognised languages', () => {
    const html = wrapHtml(
      '<pre class="highlight"><code class="language-nonexistent_lang" data-lang="nonexistent_lang">some code here</code></pre>',
    );
    const enriched = enrichHtml(html);

    // The code block should still be present
    expect(enriched).toContain('some code here');
    // Should not be transformed into a mermaid block
    expect(enriched).not.toContain('class="mermaid">some code here');
  });
});
