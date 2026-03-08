import chokidar from 'chokidar';
import fs from 'node:fs';
import path from 'node:path';
import { renderToHtml } from '../render.js';
import { enrichHtml } from '../enrich.js';
import { applyTheme } from '../theme.js';
import { printToPdf } from '../print.js';
import { validateOutputFlags, validateThemeFlags } from './shared.js';

/**
 * Render a single .adoc file to PDF.
 *
 * @param {string} inputPath - Absolute path to the .adoc file
 * @param {string|null} outputPath - Custom output path, or null for default
 * @param {{ verbose: boolean, quiet: boolean, themePath?: string, templatePath?: string }} opts
 * @returns {Promise<string>} The output PDF path
 */
async function renderFile(inputPath, outputPath, opts) {
  const source = fs.readFileSync(inputPath, 'utf-8');

  if (opts.verbose) process.stderr.write(`Parsing ${path.basename(inputPath)}...\n`);
  const baseDir = path.dirname(inputPath);
  let { html, attributes } = renderToHtml(source, baseDir);

  if (opts.verbose) process.stderr.write('Enriching HTML...\n');
  html = enrichHtml(html);

  // Apply theme (re-read files each time so changes are picked up)
  if (opts.themePath || opts.templatePath) {
    if (opts.verbose) process.stderr.write('Applying theme...\n');
    html = applyTheme(html, attributes, {
      themePath: opts.themePath,
      templatePath: opts.templatePath,
    });
  } else {
    // Still inject data attributes even without custom theme/template
    html = applyTheme(html, attributes);
  }

  const pdfPath = outputPath || inputPath.replace(/\.adoc$/, '.pdf');

  if (opts.verbose) process.stderr.write('Printing to PDF...\n');
  await printToPdf(html, pdfPath);

  return pdfPath;
}

/**
 * Register the watch subcommand on the given Commander program.
 *
 * @param {import('commander').Command} program
 */
export function registerWatchCommand(program) {
  program
    .command('watch')
    .description('Watch AsciiDoc file(s) and re-render on change')
    .argument('<input>', 'Path to an .adoc file or directory to watch')
    .option('-o, --output <path>', 'Output PDF file path (file mode only)')
    .option('--theme <path>', 'Custom CSS theme file')
    .option('--template <path>', 'Custom HTML template file or built-in name')
    .option('--verbose', 'Print additional diagnostic information')
    .option('--quiet', 'Suppress all non-error output')
    .action(async (input, options) => {
      validateOutputFlags(options);
      const verbose = options.verbose || false;
      const quiet = options.quiet || false;

      const inputPath = path.resolve(input);
      const stat = fs.statSync(inputPath, { throwIfNoEntry: false });

      if (!stat) {
        process.stderr.write(`Error: File not found: ${inputPath}\n`);
        process.exit(1);
      }

      // Validate theme and template files if provided
      const themeOptions = validateThemeFlags(options);

      const isDirectory = stat.isDirectory();
      const customOutput = options.output ? path.resolve(options.output) : null;

      // Determine what to watch
      const watchPath = isDirectory
        ? path.join(inputPath, '**/*.adoc')
        : inputPath;

      // Render function for a specific file
      const doRender = async (filePath) => {
        const absPath = path.resolve(filePath);
        // In directory mode, each file gets its own PDF (--output not applicable)
        const outPath = isDirectory ? null : customOutput;
        try {
          const pdfPath = await renderFile(absPath, outPath, {
            verbose,
            quiet,
            ...themeOptions,
          });
          if (!quiet) {
            const relativePdf = path.relative(process.cwd(), pdfPath);
            process.stdout.write(`Rendered ${relativePdf}\n`);
          }
        } catch (err) {
          process.stderr.write(`Error rendering ${path.basename(absPath)}: ${err.message}\n`);
        }
      };

      // Initial render
      if (isDirectory) {
        // Find all .adoc files in directory
        const files = fs.readdirSync(inputPath)
          .filter((f) => f.endsWith('.adoc'))
          .map((f) => path.join(inputPath, f));

        for (const file of files) {
          await doRender(file);
        }
      } else {
        await doRender(inputPath);
      }

      // Start watcher
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      watcher.on('change', async (changedPath) => {
        if (verbose) process.stderr.write(`File changed: ${changedPath}\n`);
        await doRender(changedPath);
      });

      if (verbose) {
        process.stderr.write(`Watching ${isDirectory ? inputPath : path.basename(inputPath)} for changes...\n`);
      }

      // Handle SIGINT for clean shutdown
      process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
      });
    });
}
