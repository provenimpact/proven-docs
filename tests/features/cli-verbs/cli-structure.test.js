// Feature: cli-verbs
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   CLI-021: Four subcommands available
//   CLI-022: --version displays version
//   CLI-023: --help lists subcommands
//   CLI-024: Subcommand --help shows usage
//   CLI-025: --verbose and --quiet on all subcommands
//   CLI-026: --verbose prints diagnostics
//   CLI-027: --quiet suppresses non-error output
//   CLI-028: --verbose + --quiet is an error
//
// Test level: Integration

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('bin/proven-docs.js');

const require = createRequire(import.meta.url);
const pkg = require('../../../package.json');

function run(args, options = {}) {
  return execFileAsync('node', [CLI_PATH, ...args], {
    timeout: 60000,
    ...options,
  }).then(
    ({ stdout, stderr }) => ({ stdout, stderr, exitCode: 0 }),
    (err) => ({ stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code }),
  );
}

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-cli-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI-021: Four subcommands available', () => {
  it('should list render, watch, validate, and info as subcommands', async () => {
    const result = await run(['--help']);

    expect(result.stdout).toContain('render');
    expect(result.stdout).toContain('watch');
    expect(result.stdout).toContain('validate');
    expect(result.stdout).toContain('info');
  });
});

describe('CLI-022: --version displays version', () => {
  it('should display the current version number from package.json', async () => {
    const result = await run(['--version']);

    expect(result.stdout.trim()).toBe(pkg.version);
  });
});

describe('CLI-023: --help lists subcommands with descriptions', () => {
  it('should list all subcommands with descriptions', async () => {
    const result = await run(['--help']);

    expect(result.exitCode).toBe(0);
    // Each subcommand should appear with some description text
    expect(result.stdout).toMatch(/render\s+.+/);
    expect(result.stdout).toMatch(/watch\s+.+/);
    expect(result.stdout).toMatch(/validate\s+.+/);
    expect(result.stdout).toMatch(/info\s+.+/);
  });
});

describe('CLI-024: Subcommand --help shows usage', () => {
  it('should display watch-specific help when --help is passed to watch', async () => {
    const result = await run(['watch', '--help']);

    expect(result.stdout).toContain('watch');
    expect(result.stdout + result.stderr).toMatch(/file|dir|input/i);
  });

  it('should display validate-specific help when --help is passed to validate', async () => {
    const result = await run(['validate', '--help']);

    expect(result.stdout).toContain('validate');
    expect(result.stdout + result.stderr).toMatch(/file|input/i);
  });

  it('should display info-specific help when --help is passed to info', async () => {
    const result = await run(['info', '--help']);

    expect(result.stdout).toContain('info');
    expect(result.stdout + result.stderr).toMatch(/file|input/i);
  });
});

describe('CLI-025: --verbose and --quiet on all subcommands', () => {
  it('should show --verbose option in render help', async () => {
    const result = await run(['render', '--help']);
    expect(result.stdout).toMatch(/--verbose/);
  });

  it('should show --quiet option in render help', async () => {
    const result = await run(['render', '--help']);
    expect(result.stdout).toMatch(/--quiet/);
  });

  it('should show --verbose option in watch help', async () => {
    const result = await run(['watch', '--help']);
    expect(result.stdout).toMatch(/--verbose/);
  });

  it('should show --quiet option in validate help', async () => {
    const result = await run(['validate', '--help']);
    expect(result.stdout).toMatch(/--quiet/);
  });

  it('should show --verbose option in info help', async () => {
    const result = await run(['info', '--help']);
    expect(result.stdout).toMatch(/--verbose/);
  });
});

describe('CLI-026: --verbose prints diagnostics', () => {
  it('should print additional diagnostic information to stderr when --verbose is active', async () => {
    const inputFile = path.join(tmpDir, 'test-verbose.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nHello.');

    const result = await run(['render', inputFile, '--verbose']);

    expect(result.exitCode).toBe(0);
    // Verbose should produce diagnostic output on stderr
    expect(result.stderr.length).toBeGreaterThan(0);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('CLI-027: --quiet suppresses non-error output', () => {
  it('should suppress the success message when --quiet is active', async () => {
    const inputFile = path.join(tmpDir, 'test-quiet.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nHello.');

    const result = await run(['render', inputFile, '--quiet']);

    expect(result.exitCode).toBe(0);
    // Quiet should produce no stdout output on success
    expect(result.stdout.trim()).toBe('');

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('CLI-028: --verbose + --quiet is an error', () => {
  it('should print an error and exit with non-zero code when both flags are used', async () => {
    const inputFile = path.join(tmpDir, 'test-both.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nHello.');

    const result = await run(['render', inputFile, '--verbose', '--quiet']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/verbose|quiet/i);
  });
});
