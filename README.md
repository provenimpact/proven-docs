# Proven Docs

A CLI tool that converts AsciiDoc files to PDF using headless browser printing. Supports Mermaid diagram rendering and source code syntax highlighting.

## How it works

1. Reads an `.adoc` file
2. Renders it to HTML via `@asciidoctor/core` (with bundled offline fonts)
3. Applies syntax highlighting to code blocks (highlight.js, server-side)
4. Transforms Mermaid diagram blocks for browser rendering
5. Opens the HTML in a headless Chromium browser (Playwright)
6. Renders Mermaid diagrams to inline SVG in the browser
7. Prints to PDF using the browser's print engine
8. Saves the PDF with the same name as the input file

## Features

- **Mermaid diagrams**: `[source,mermaid]` blocks render as visual SVG diagrams (flowchart, sequence, class, state, C4)
- **Syntax highlighting**: `[source,<lang>]` blocks render with colour-coded syntax (190+ languages)
- **Fully offline**: No network requests during operation. Fonts, mermaid.js, and highlight.js are all bundled locally.
- **Print-friendly**: Highlight.js `github` theme is legible on paper

## Prerequisites

- Node.js 22+
- Playwright browsers installed (`npx playwright install chromium`)

## Install

```bash
npm install
```

## Usage

```bash
node bin/proven-docs.js render <file.adoc>
```

Output goes to the same directory as the input file, with a `.pdf` extension:

```bash
node bin/proven-docs.js render docs/report.adoc
# produces docs/report.pdf
```

Specify a custom output path:

```bash
node bin/proven-docs.js render docs/report.adoc --output build/report.pdf
```

## Running tests

```bash
npm test
```

## License

Apache-2.0
