import Asciidoctor from '@asciidoctor/core';
import hljs from 'highlight.js';
import fs from 'node:fs';
import path from 'node:path';
import { validateOutputFlags } from './shared.js';

const asciidoctor = Asciidoctor();

/**
 * Extract mermaid source blocks from a parsed Asciidoctor document.
 * Returns an array of { source, lineNumber } objects.
 */
function findMermaidBlocks(doc) {
  const blocks = [];
  const visit = (node) => {
    if (node.getNodeName && node.getNodeName() === 'listing') {
      const attrs = node.getAttributes();
      if (attrs.language === 'mermaid') {
        blocks.push({
          source: node.getSource(),
          lineNumber: node.getSourceLocation()?.getLineNumber() ?? null,
        });
      }
    }
    if (node.getBlocks) {
      for (const child of node.getBlocks()) {
        visit(child);
      }
    }
  };
  visit(doc);
  return blocks;
}

/**
 * Extract source code blocks (non-mermaid) from a parsed Asciidoctor document.
 * Returns an array of { language, lineNumber } objects.
 */
function findCodeBlocks(doc) {
  const blocks = [];
  const visit = (node) => {
    if (node.getNodeName && node.getNodeName() === 'listing') {
      const attrs = node.getAttributes();
      if (attrs.language && attrs.language !== 'mermaid') {
        blocks.push({
          language: attrs.language,
          lineNumber: node.getSourceLocation()?.getLineNumber() ?? null,
        });
      }
    }
    if (node.getBlocks) {
      for (const child of node.getBlocks()) {
        visit(child);
      }
    }
  };
  visit(doc);
  return blocks;
}

/**
 * Register the validate subcommand on the given Commander program.
 *
 * @param {import('commander').Command} program
 */
export function registerValidateCommand(program) {
  program
    .command('validate')
    .description('Validate an AsciiDoc file without rendering')
    .argument('<file>', 'Path to the .adoc file to validate')
    .option('--verbose', 'Print additional diagnostic information')
    .option('--quiet', 'Suppress all non-error output')
    .action(async (file, options) => {
      validateOutputFlags(options);
      const verbose = options.verbose || false;
      const quiet = options.quiet || false;

      let errors = 0;
      let warnings = 0;

      try {
        const filePath = path.resolve(file);

        // Validate file exists
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
        } catch (err) {
          if (err.code === 'ENOENT') {
            process.stderr.write(`Error: File not found: ${filePath}\n`);
          } else {
            process.stderr.write(`Error: Cannot read file: ${filePath}\n`);
          }
          process.exit(1);
        }

        const source = fs.readFileSync(filePath, 'utf-8');

        if (!quiet) {
          process.stdout.write(`Validating ${path.basename(filePath)}...\n`);
        }

        // Parse with MemoryLogger to capture messages
        const logger = asciidoctor.MemoryLogger.create();
        asciidoctor.LoggerManager.setLogger(logger);

        const startTime = Date.now();
        const doc = asciidoctor.load(source, {
          safe: 'safe',
          sourcemap: true,
          base_dir: path.dirname(filePath),
        });
        const parseTime = Date.now() - startTime;

        // Collect AsciiDoc parse messages
        const messages = logger.getMessages();
        for (const msg of messages) {
          const severity = msg.getSeverity();
          const text = msg.getText();
          if (severity === 'ERROR' || severity === 'FATAL') {
            process.stderr.write(`  ERROR: ${text}\n`);
            errors++;
          } else {
            process.stderr.write(`  WARN: ${text}\n`);
            warnings++;
          }
        }

        // Validate Mermaid blocks
        const mermaidBlocks = findMermaidBlocks(doc);
        if (verbose) process.stderr.write(`Found ${mermaidBlocks.length} Mermaid block(s)\n`);

        if (mermaidBlocks.length > 0) {
          // Dynamically import mermaid for validation
          const { default: mermaid } = await import('mermaid');
          mermaid.initialize({ startOnLoad: false, suppressErrors: true });

          for (const block of mermaidBlocks) {
            try {
              await mermaid.parse(block.source);
            } catch (err) {
              const loc = block.lineNumber ? ` (line ${block.lineNumber})` : '';
              const errMsg = err.message || String(err);
              process.stderr.write(`  ERROR: Invalid Mermaid syntax in block${loc}: ${errMsg}\n`);
              errors++;
            }
          }
        }

        // Validate source code block languages
        const codeBlocks = findCodeBlocks(doc);
        if (verbose) process.stderr.write(`Found ${codeBlocks.length} source code block(s)\n`);

        for (const block of codeBlocks) {
          if (!hljs.getLanguage(block.language)) {
            const loc = block.lineNumber ? ` (line ${block.lineNumber})` : '';
            process.stderr.write(`  WARN: Unrecognized source language "${block.language}"${loc}\n`);
            warnings++;
          }
        }

        if (verbose) process.stderr.write(`Parse time: ${parseTime}ms\n`);

        // Summary
        if (!quiet) {
          process.stdout.write(`\n${errors} error(s), ${warnings} warning(s)\n`);
        }

        process.exit(errors > 0 ? 1 : 0);
      } catch (err) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
      }
    });
}
