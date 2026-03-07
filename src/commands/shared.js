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
