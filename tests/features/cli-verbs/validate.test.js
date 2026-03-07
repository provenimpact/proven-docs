// Feature: cli-verbs
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   CLI-008: Validate parses without producing PDF
//   CLI-009: Validate exits 0 on success
//   CLI-010: Validate exits non-zero on errors
//   CLI-011: Validate checks Mermaid syntax
//   CLI-012: Validate checks source block languages
//   CLI-013: Validate file-not-found error
//   CLI-014: Validate runs without browser
//
// Test level: Integration

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('bin/proven-docs.js');

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-validate-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI-008: Validate parses without producing PDF', () => {
  it('should parse the file and not produce a PDF', async () => {
    const inputFile = path.join(tmpDir, 'test-008.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Valid Document\n\nSome content.');

    await run(['validate', inputFile]);

    // No PDF should be created
    expect(fs.existsSync(pdfFile)).toBe(false);
  });
});

describe('CLI-009: Validate exits 0 on success', () => {
  it('should exit with code 0 when validation passes', async () => {
    const inputFile = path.join(tmpDir, 'test-009.adoc');
    fs.writeFileSync(inputFile, '= Valid Document\n:author: Test Author\n\nSome valid content.');

    const result = await run(['validate', inputFile]);

    expect(result.exitCode).toBe(0);
  });
});

describe('CLI-010: Validate exits non-zero on errors', () => {
  it('should exit with non-zero code when the file has Mermaid errors', async () => {
    const inputFile = path.join(tmpDir, 'test-010.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Error Test',
        '',
        '[source,mermaid]',
        '----',
        'this is not valid mermaid %%%',
        '----',
      ].join('\n'),
    );

    const result = await run(['validate', inputFile]);

    expect(result.exitCode).not.toBe(0);
    // Should print error descriptions
    expect(result.stderr).toMatch(/error|mermaid|syntax/i);
  });
});

describe('CLI-011: Validate checks Mermaid syntax', () => {
  it('should report invalid Mermaid syntax', async () => {
    const inputFile = path.join(tmpDir, 'test-011-bad.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Mermaid Validation',
        '',
        '[source,mermaid]',
        '----',
        'this is not valid mermaid syntax at all',
        '----',
      ].join('\n'),
    );

    const result = await run(['validate', inputFile]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/mermaid|syntax|error/i);
  });

  it('should accept valid Mermaid syntax', async () => {
    const inputFile = path.join(tmpDir, 'test-011-good.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Mermaid Validation',
        '',
        '[source,mermaid]',
        '----',
        'flowchart LR',
        '  A --> B',
        '----',
      ].join('\n'),
    );

    const result = await run(['validate', inputFile]);

    expect(result.exitCode).toBe(0);
  });
});

describe('CLI-012: Validate checks source block languages', () => {
  it('should warn about unrecognized language in source blocks', async () => {
    const inputFile = path.join(tmpDir, 'test-012.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Language Check',
        '',
        '[source,fakeLang]',
        '----',
        'some code in a language that does not exist',
        '----',
      ].join('\n'),
    );

    const result = await run(['validate', inputFile]);

    // Warnings alone should not cause non-zero exit
    expect(result.exitCode).toBe(0);
    // But should report the unrecognized language
    expect(result.stderr + result.stdout).toMatch(/fakeLang|unrecognized|unknown/i);
  });

  it('should not warn about recognized languages', async () => {
    const inputFile = path.join(tmpDir, 'test-012-good.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Good Languages',
        '',
        '[source,javascript]',
        '----',
        'const x = 1;',
        '----',
      ].join('\n'),
    );

    const result = await run(['validate', inputFile]);

    expect(result.exitCode).toBe(0);
    // No warnings about language recognition
    expect(result.stderr + result.stdout).not.toMatch(/unrecognized|unknown/i);
  });
});

describe('CLI-013: Validate file-not-found error', () => {
  it('should exit with non-zero code when file does not exist', async () => {
    const result = await run(['validate', '/nonexistent/file.adoc']);

    expect(result.exitCode).not.toBe(0);
  });

  it('should print an error message identifying the missing file', async () => {
    const missingPath = '/nonexistent/missing.adoc';
    const result = await run(['validate', missingPath]);

    expect(result.stderr).toContain(missingPath);
  });
});

describe('CLI-014: Validate runs without browser', () => {
  it('should complete without launching a headless browser', async () => {
    const inputFile = path.join(tmpDir, 'test-014.adoc');
    fs.writeFileSync(inputFile, '= No Browser\n\nContent.');

    // Force Playwright to fail if it tries to launch — set browsers path to nonexistent
    const result = await run(['validate', inputFile], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/nonexistent/browsers' },
    });

    // Should still succeed even though Playwright browsers are unavailable
    expect(result.exitCode).toBe(0);
  });
});
