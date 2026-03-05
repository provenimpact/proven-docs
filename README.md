# Proven Docs

A CLI tool that converts AsciiDoc files to PDF using headless browser printing.

## How it works

1. Reads an `.adoc` file
2. Renders it to HTML via `@asciidoctor/core`
3. Opens the HTML in a headless Chromium browser (Playwright)
4. Prints to PDF using the browser's print engine
5. Saves the PDF with the same name as the input file

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
