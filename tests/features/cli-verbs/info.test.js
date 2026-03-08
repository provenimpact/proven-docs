// Feature: cli-verbs
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   CLI-015: Info prints document attributes
//   CLI-016: Info shows title, author, revision, date
//   CLI-017: Info shows user-defined attributes
//   CLI-018: Info omits unset attributes
//   CLI-019: Info file-not-found error
//   CLI-020: Info runs without browser
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-info-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI-015: Info prints document attributes', () => {
  it('should parse the file and print attributes to stdout', async () => {
    const inputFile = path.join(tmpDir, 'test-015.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= My Document',
        ':author: Jane Smith',
        ':revnumber: 1.0',
        '',
        'Content here.',
      ].join('\n'),
    );

    const result = await run(['info', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('My Document');
    expect(result.stdout).toContain('Jane Smith');
  });
});

describe('CLI-016: Info shows title, author, revision, date', () => {
  it('should display title, author, revision number, and revision date', async () => {
    const inputFile = path.join(tmpDir, 'test-016.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Quarterly Report',
        ':author: John Doe',
        ':revnumber: 2.1',
        ':revdate: 2026-03-06',
        '',
        'Report body.',
      ].join('\n'),
    );

    const result = await run(['info', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Quarterly Report');
    expect(result.stdout).toContain('John Doe');
    expect(result.stdout).toContain('2.1');
    expect(result.stdout).toContain('2026-03-06');
  });
});

describe('CLI-017: Info shows user-defined attributes', () => {
  it('should display user-defined document attributes', async () => {
    const inputFile = path.join(tmpDir, 'test-017.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Risk Assessment',
        ':author: Jane Smith',
        ':classification: CONFIDENTIAL',
        ':department: Risk & Compliance',
        ':document-id: RISK-2026-Q1',
        '',
        'Assessment content.',
      ].join('\n'),
    );

    const result = await run(['info', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CONFIDENTIAL');
    expect(result.stdout).toMatch(/Risk & Compliance/);
    expect(result.stdout).toContain('RISK-2026-Q1');
  });
});

describe('CLI-018: Info omits unset attributes', () => {
  it('should omit attributes that are not set in the document', async () => {
    const inputFile = path.join(tmpDir, 'test-018.adoc');
    fs.writeFileSync(
      inputFile,
      [
        '= Title Only Document',
        '',
        'No author, no revision.',
      ].join('\n'),
    );

    const result = await run(['info', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Title Only Document');
    // Should not display "Author:" with empty value
    expect(result.stdout).not.toMatch(/Author:\s*$/m);
    expect(result.stdout).not.toMatch(/Revision:\s*$/m);
  });
});

describe('CLI-019: Info file-not-found error', () => {
  it('should exit with non-zero code when file does not exist', async () => {
    const result = await run(['info', '/nonexistent/file.adoc']);

    expect(result.exitCode).not.toBe(0);
  });

  it('should print an error message identifying the missing file', async () => {
    const missingPath = '/nonexistent/missing.adoc';
    const result = await run(['info', missingPath]);

    expect(result.stderr).toContain(missingPath);
  });
});

describe('CLI-020: Info runs without browser', () => {
  it('should complete without launching a headless browser', async () => {
    const inputFile = path.join(tmpDir, 'test-020.adoc');
    fs.writeFileSync(inputFile, '= No Browser\n:author: Test\n\nContent.');

    // Force Playwright to fail if it tries to launch
    const result = await run(['info', inputFile], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/nonexistent/browsers' },
    });

    expect(result.exitCode).toBe(0);
  });
});
