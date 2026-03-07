import Asciidoctor from '@asciidoctor/core';
import fs from 'node:fs';
import path from 'node:path';
import { validateOutputFlags } from './shared.js';

const asciidoctor = Asciidoctor();

// Asciidoctor internal attributes to filter out of user-facing output.
// These are set automatically by Asciidoctor and are not user-defined.
const INTERNAL_ATTRS = new Set([
  'asciidoctor', 'asciidoctor-version', 'backend', 'basebackend',
  'doctype', 'doctype-article', 'doctype-book', 'doctype-inline',
  'doctype-manpage', 'filetype', 'filetype-html', 'filetype-pdf',
  'filetype-docbook', 'htmlsyntax', 'localdate', 'localtime',
  'localdatetime', 'docdate', 'doctime', 'docdatetime',
  'outfilesuffix', 'safe-mode-level', 'safe-mode-name',
  'safe-mode-safe', 'safe-mode-server', 'safe-mode-secure',
  'safe-mode-unsafe', 'sectids', 'toc-placement',
  'notitle', 'prewrap', 'attribute-undefined', 'attribute-missing',
  'compat-mode', 'experimental', 'reproducible', 'skip-front-matter',
  'nofooter', 'noheader', 'nofootnotes', 'hardbreaks-option',
  'showtitle', 'webfonts', 'copycss', 'icons', 'iconfont-remote',
  'iconfont-cdn', 'iconfont-name', 'stem', 'source-highlighter',
  'toc', 'toc-title', 'toclevels', 'sectnums', 'sectnumlevels',
  'last-update-label', 'manname', 'manpurpose', 'mansource',
  'manmanual', 'manvolnum', 'max-include-depth', 'linkcss',
  'copycss', 'stylesheet', 'stylesdir', 'imagesdir', 'iconsdir',
  'scriptsdir', 'user-home',
  // Captions and labels set automatically
  'appendix-caption', 'appendix-refsig', 'caution-caption',
  'chapter-refsig', 'example-caption', 'figure-caption',
  'important-caption', 'note-caption', 'part-refsig',
  'section-refsig', 'table-caption', 'tip-caption',
  'untitled-label', 'version-label', 'warning-caption',
  'listing-caption', 'toc-title',
  // Author metadata (already shown via standard attrs)
  'authorcount', 'authors',
  // Date/year
  'docyear', 'localyear',
  // Directory paths
  'docdir', 'docfile', 'docname',
]);

const INTERNAL_PREFIXES = [
  'env-', 'iconfont-', 'safe-mode-', 'doctype-', 'filetype-',
];

/**
 * Decode HTML entities that Asciidoctor may introduce in attribute values.
 */
function decodeEntities(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Standard document header attributes (displayed first, in this order)
const STANDARD_ATTRS = [
  { key: 'doctitle', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'email', label: 'Email' },
  { key: 'revnumber', label: 'Revision' },
  { key: 'revdate', label: 'Date' },
  { key: 'revremark', label: 'Remark' },
];

function isInternal(key) {
  if (INTERNAL_ATTRS.has(key)) return true;
  for (const prefix of INTERNAL_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  // Standard attrs handled separately
  if (STANDARD_ATTRS.some((a) => a.key === key)) return true;
  // Also filter firstname, lastname, middlename, authorinitials, etc.
  if (['firstname', 'lastname', 'middlename', 'authorinitials'].includes(key)) return true;
  return false;
}

/**
 * Register the info subcommand on the given Commander program.
 *
 * @param {import('commander').Command} program
 */
export function registerInfoCommand(program) {
  program
    .command('info')
    .description('Show document metadata from an AsciiDoc file')
    .argument('<file>', 'Path to the .adoc file')
    .option('--verbose', 'Print additional diagnostic information')
    .option('--quiet', 'Suppress all non-error output')
    .action((file, options) => {
      validateOutputFlags(options);
      const verbose = options.verbose || false;

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

        if (verbose) process.stderr.write(`Parsing ${filePath}\n`);

        // Use load() to get the document without full conversion
        const doc = asciidoctor.load(source, { safe: 'safe', base_dir: path.dirname(filePath) });

        const attrs = doc.getAttributes();
        const title = doc.getDocumentTitle();
        const lines = [];

        // Standard attributes (only if present)
        for (const { key, label } of STANDARD_ATTRS) {
          let value;
          if (key === 'doctitle') {
            value = title || undefined;
          } else {
            value = attrs[key];
          }
          if (value !== undefined && value !== null && value !== '') {
            lines.push(`${label}:${' '.repeat(Math.max(1, 12 - label.length))}${decodeEntities(value)}`);
          }
        }

        // Collect user-defined attributes
        const userAttrs = [];
        for (const [key, value] of Object.entries(attrs)) {
          if (!isInternal(key) && value !== undefined && value !== null && value !== '') {
            userAttrs.push([key, value]);
          }
        }

        // Print separator and user-defined attributes
        if (userAttrs.length > 0 && lines.length > 0) {
          lines.push('---');
        }

        // Find max key length for alignment
        const maxKeyLen = userAttrs.reduce((max, [k]) => Math.max(max, k.length), 0);

        for (const [key, value] of userAttrs.sort((a, b) => a[0].localeCompare(b[0]))) {
          lines.push(`${key}:${' '.repeat(Math.max(1, maxKeyLen - key.length + 1))}${decodeEntities(value)}`);
        }

        if (verbose) process.stderr.write(`Found ${Object.keys(attrs).length} total attributes, ${userAttrs.length} user-defined\n`);

        process.stdout.write(lines.join('\n') + '\n');
        process.exit(0);
      } catch (err) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
      }
    });
}
