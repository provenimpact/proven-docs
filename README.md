# Proven Docs

A CLI tool for working with AsciiDoc documentation. Converts AsciiDoc files to PDF using headless browser printing, with Mermaid diagram rendering, source code syntax highlighting, and custom themes with HTML templates.

## Features

- **Mermaid diagrams**: `[source,mermaid]` blocks render as visual SVG diagrams (flowchart, sequence, class, state, C4)
- **Syntax highlighting**: `[source,<lang>]` blocks render with colour-coded syntax (190+ languages)
- **Custom themes**: Override the default CSS with your own stylesheet
- **HTML templates**: Use custom HTML templates with Mustache-style variable substitution
- **Built-in classified template**: Classification banners, running metadata header, and cover page — driven entirely by AsciiDoc attributes
- **File watching**: Automatically re-render PDFs when source files change
- **Validation**: Check AsciiDoc files for errors, invalid Mermaid syntax, and unrecognized source languages without rendering
- **Document info**: Inspect document metadata (title, author, revision, custom attributes) from the command line
- **Fully offline**: No network requests during operation. Fonts, mermaid.js, and highlight.js are all bundled locally.
- **Print-friendly**: Highlight.js `github` theme is legible on paper

## Prerequisites

- Node.js 22+

## Install

```bash
npm install -g .
npx playwright install chromium
```

After installation, the `proven-docs` command is available globally.

## Quick Start

Render an AsciiDoc file to PDF:

```bash
proven-docs render docs/report.adoc
```

This produces `docs/report.pdf` in the same directory as the input file.

## Usage

### Render

```bash
proven-docs render <file.adoc>
```

Specify a custom output path:

```bash
proven-docs render docs/report.adoc --output build/report.pdf
```

### Themes and Templates

Apply a custom CSS theme:

```bash
proven-docs render docs/report.adoc --theme path/to/custom.css
```

Use a custom HTML template:

```bash
proven-docs render docs/report.adoc --template path/to/template.html
```

Use a custom theme together with a template:

```bash
proven-docs render docs/report.adoc --theme path/to/custom.css --template path/to/template.html
```

#### Built-in Classified Template

The `classified` template adds classification banners, a running metadata header table on every page, and a cover page. All content is driven by standard AsciiDoc attributes:

```bash
proven-docs render docs/report.adoc --template classified
```

The template reads these attributes from your `.adoc` file:

```asciidoc
= Quarterly Risk Assessment
:author: Jane Smith
:classification: CONFIDENTIAL
:handling: INTERNAL ONLY
:distribution: Board of Directors
:document-id: RISK-2026-Q1
:review-date: 2026-06-30
:department: Risk & Compliance
:retention: 5 years
```

Classification levels (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) each get a distinct banner colour. See `examples/classified-report.adoc` for a full working example.

### Watch

Watch a file or directory and re-render on changes:

```bash
proven-docs watch docs/report.adoc
proven-docs watch docs/          # watches all .adoc files in directory
```

Watch with a theme or template:

```bash
proven-docs watch docs/report.adoc --template classified
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

### Global Flags

All commands support `--verbose` (additional diagnostics to stderr) and `--quiet` (suppress non-error output). These flags are mutually exclusive.

```bash
proven-docs render report.adoc --verbose
proven-docs validate report.adoc --quiet
```

## Examples

The `examples/` directory contains ready-to-render documents:

| File | Description | Command |
|------|-------------|---------|
| `basic.adoc` | Standard document with diagrams and code blocks | `proven-docs render examples/basic.adoc` |
| `classified-report.adoc` | Classified document with banners and metadata | `proven-docs render examples/classified-report.adoc --template classified` |

The GitHub Actions workflow renders these automatically on every push and PR, and uploads the resulting PDFs as build artifacts.

## Running Tests

```bash
npm test
```

## License

Apache-2.0
