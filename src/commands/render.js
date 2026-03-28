import fs from 'node:fs';
import path from 'node:path';
import { renderToHtml } from '../render.js';
import { enrichHtml } from '../enrich.js';
import { applyTheme } from '../theme.js';
import { printToPdf } from '../print.js';
import { validateOutputFlags, validateThemeFlags } from './shared.js';

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
    .option('--theme <path>', 'Custom CSS theme file')
    .option('--template <path>', 'Custom HTML template file or built-in name')
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

        // Validate theme and template files if provided
        const themeOptions = validateThemeFlags(options);

        // Read the AsciiDoc source
        if (verbose) process.stderr.write(`Reading ${inputPath}\n`);
        const source = fs.readFileSync(inputPath, 'utf-8');

        // Render AsciiDoc to HTML
        if (verbose) process.stderr.write('Parsing AsciiDoc...\n');
        const baseDir = path.dirname(inputPath);
        let html;
        let attributes;
        try {
          ({ html, attributes } = renderToHtml(source, baseDir));
        } catch (err) {
          process.stderr.write(`Error: AsciiDoc rendering failed: ${err.message}\n`);
          process.exit(1);
        }

        // Enrich HTML with mermaid diagrams and syntax highlighting
        if (verbose) process.stderr.write('Enriching HTML...\n');
        html = enrichHtml(html);

        // Apply theme (CSS override, template, data attributes)
        if (verbose) process.stderr.write('Applying theme...\n');
        html = applyTheme(html, attributes, themeOptions);

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
