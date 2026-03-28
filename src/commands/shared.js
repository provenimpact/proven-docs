import fs from 'node:fs';
import path from 'node:path';

/**
 * Validate that --verbose and --quiet are not both set.
 * Exits with code 1 if they conflict.
 *
 * @param {{ verbose?: boolean, quiet?: boolean }} options
 */
export function validateOutputFlags(options) {
  if (options.verbose && options.quiet) {
    process.stderr.write('Error: --verbose and --quiet cannot be used together\n');
    process.exit(1);
  }
}

/**
 * Validate --theme and --template flags and return resolved options for
 * the theme engine.
 *
 * For --theme: validates that the file exists and is readable.
 * For --template: if it looks like a file path (has separator or extension),
 *   validates that it exists. Built-in names (no separator, no extension) are
 *   validated later by the theme engine.
 *
 * Exits with code 1 on validation failure.
 *
 * @param {{ theme?: string, template?: string }} options
 * @returns {{ themePath?: string, templatePath?: string }}
 */
export function validateThemeFlags(options) {
  const result = {};

  if (options.theme) {
    const themePath = path.resolve(options.theme);
    try {
      fs.accessSync(themePath, fs.constants.R_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        process.stderr.write(`Error: Theme file not found: ${themePath}\n`);
      } else {
        process.stderr.write(`Error: Cannot read theme file: ${themePath}\n`);
      }
      process.exit(1);
    }
    result.themePath = themePath;
  }

  if (options.template) {
    const tpl = options.template;
    const hasPathSep = tpl.includes(path.sep) || tpl.includes('/');
    const hasExt = path.extname(tpl) !== '';

    if (hasPathSep || hasExt) {
      // Looks like a file path — validate it
      const templatePath = path.resolve(tpl);
      try {
        fs.accessSync(templatePath, fs.constants.R_OK);
      } catch (err) {
        if (err.code === 'ENOENT') {
          process.stderr.write(`Error: Template file not found: ${templatePath}\n`);
        } else {
          process.stderr.write(`Error: Cannot read template file: ${templatePath}\n`);
        }
        process.exit(1);
      }
      result.templatePath = templatePath;
    } else {
      // Built-in name — pass through for theme engine to resolve
      result.templatePath = tpl;
    }
  }

  return result;
}
