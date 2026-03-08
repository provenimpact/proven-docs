# Proven Docs

A CLI tool for working with AsciiDoc documentation. Converts AsciiDoc files to PDF using headless browser printing, with Mermaid diagram rendering and source code syntax highlighting. Includes commands for file watching, validation, and metadata inspection.

## Features

- **Mermaid diagrams**: `[source,mermaid]` blocks render as visual SVG diagrams (flowchart, sequence, class, state, C4)
- **Syntax highlighting**: `[source,<lang>]` blocks render with colour-coded syntax (190+ languages)
- **File watching**: Automatically re-render PDFs when source files change
- **Validation**: Check AsciiDoc files for errors, invalid Mermaid syntax, and unrecognized source languages without rendering
- **Document info**: Inspect document metadata (title, author, revision, custom attributes) from the command line
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

### Render

Convert an AsciiDoc file to PDF:

```bash
proven-docs render <file.adoc>
```

Output goes to the same directory as the input file, with a `.pdf` extension:

```bash
proven-docs render docs/report.adoc
# produces docs/report.pdf
```

Specify a custom output path:

```bash
proven-docs render docs/report.adoc --output build/report.pdf
```

### Watch

Watch a file or directory and re-render on changes:

```bash
proven-docs watch docs/report.adoc
proven-docs watch docs/          # watches all .adoc files in directory
```

### Validate

Check an AsciiDoc file for errors without producing a PDF:

```bash
proven-docs validate docs/report.adoc
```

Reports AsciiDoc parse errors, invalid Mermaid syntax, and unrecognized source block languages. Exits with code 0 if no errors are found. Does not require a browser.

### Info

Display document metadata:

```bash
proven-docs info docs/report.adoc
```

Shows title, author, revision, date, and any user-defined attributes (e.g. `:classification:`, `:department:`).

### Global flags

All commands support `--verbose` (additional diagnostics to stderr) and `--quiet` (suppress non-error output). These flags are mutually exclusive.

```bash
proven-docs render report.adoc --verbose
proven-docs validate report.adoc --quiet
```

## Running tests

```bash
npm test
```

## License

Apache-2.0
