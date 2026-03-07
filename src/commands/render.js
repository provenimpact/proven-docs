import fs from 'node:fs';
import path from 'node:path';
import { renderToHtml } from '../render.js';
import { enrichHtml } from '../enrich.js';
import { printToPdf } from '../print.js';
import { validateOutputFlags } from './shared.js';

/**
 * Register the render subcommand on the given Commander program.
 *
 * @param {import('commander').Command} program
 */
export function registerRenderCommand(program) {
  program
    .command('render')
    .description('Render an AsciiDoc file to PDF')
    .argument('<input>', 'Path to the .adoc file to render')
    .option('-o, --output <path>', 'Output PDF file path')
    .option('--verbose', 'Print additional diagnostic information')
    .option('--quiet', 'Suppress all non-error output')
    .action(async (input, options) => {
      validateOutputFlags(options);
      const verbose = options.verbose || false;
      const quiet = options.quiet || false;

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
        if (verbose) process.stderr.write(`Reading ${inputPath}\n`);
        const source = fs.readFileSync(inputPath, 'utf-8');

        // Render AsciiDoc to HTML
        if (verbose) process.stderr.write('Parsing AsciiDoc...\n');
        const baseDir = path.dirname(inputPath);
        let html;
        try {
          html = renderToHtml(source, baseDir);
        } catch (err) {
          process.stderr.write(`Error: AsciiDoc rendering failed: ${err.message}\n`);
          process.exit(1);
        }

        // Enrich HTML with mermaid diagrams and syntax highlighting
        if (verbose) process.stderr.write('Enriching HTML...\n');
        html = enrichHtml(html);

        // Resolve output path
        const outputPath = options.output
          ? path.resolve(options.output)
          : inputPath.replace(/\.adoc$/, '.pdf');

        // Print HTML to PDF via headless browser
        if (verbose) process.stderr.write('Launching browser...\n');
        try {
          await printToPdf(html, outputPath);
        } catch (err) {
          process.stderr.write(`Error: Failed to launch browser or print PDF: ${err.message}\n`);
          process.exit(1);
        }

        if (!quiet) {
          const relativePath = path.relative(process.cwd(), outputPath);
          process.stdout.write(`Created ${relativePath}\n`);
        }
        process.exit(0);
      } catch (err) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
      }
    });
}
