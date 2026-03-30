import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerRenderCommand } from './commands/render.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerInfoCommand } from './commands/info.js';

/* global PROVEN_DOCS_VERSION */
// In Bun-compiled binaries, PROVEN_DOCS_VERSION is injected via --define.
// In Node.js dev mode, fall back to reading package.json.
let version;
try {
  version = PROVEN_DOCS_VERSION;
} catch {
  const require = createRequire(import.meta.url);
  version = require('../package.json').version;
}

const program = new Command();

program
  .name('proven-docs')
  .description('Docs-as-Code CLI for creating verifiable, publishable documentation artifacts using AsciiDoc.')
  .version(version);

// Register subcommands
registerRenderCommand(program);
registerWatchCommand(program);
registerValidateCommand(program);
registerInfoCommand(program);

program.parse();
