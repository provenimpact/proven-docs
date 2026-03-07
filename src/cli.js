import { Command } from 'commander';
import { createRequire } from 'node:module';
import { registerRenderCommand } from './commands/render.js';
import { registerWatchCommand } from './commands/watch.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerInfoCommand } from './commands/info.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

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
