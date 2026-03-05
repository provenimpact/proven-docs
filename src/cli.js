import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { renderToHtml } from './render.js';
import { printToPdf } from './print.js';

const program = new Command();

program
  .name('proven-docs')
  .description('Docs-as-Code CLI for creating verifiable, publishable documentation artifacts using AsciiDoc.');

program
  .command('render')
  .description('Render an AsciiDoc file to PDF')
  .argument('<input>', 'Path to the .adoc file to render')
  .option('-o, --output <path>', 'Output PDF file path')
  .action(async (input, options) => {
    try {
      // Resolve the input path
      const inputPath = path.resolve(input);

      // Validate input file exists and is readable
      try {
        fs.accessSync(inputPath, fs.constants.R_OK);
      } catch (err) {
        if (err.code === 'ENOENT') {
          process.stderr.write(`Error: File not found: ${inputPath}\n`);
        } else {
          process.stderr.write(`Error: Cannot read file: ${inputPath}\n`);
        }
        process.exit(1);
      }

      // Read the AsciiDoc source
      const source = fs.readFileSync(inputPath, 'utf-8');

      // Render AsciiDoc to HTML
      let html;
      try {
        html = renderToHtml(source);
      } catch (err) {
        process.stderr.write(`Error: AsciiDoc rendering failed: ${err.message}\n`);
        process.exit(1);
      }

      // Resolve output path
      const outputPath = options.output
        ? path.resolve(options.output)
        : inputPath.replace(/\.adoc$/, '.pdf');

      // Print HTML to PDF via headless browser
      try {
        await printToPdf(html, outputPath);
      } catch (err) {
        process.stderr.write(`Error: Failed to launch browser or print PDF: ${err.message}\n`);
        process.exit(1);
      }

      const relativePath = path.relative(process.cwd(), outputPath);
      process.stdout.write(`Created ${relativePath}\n`);
      process.exit(0);
    } catch (err) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse();
