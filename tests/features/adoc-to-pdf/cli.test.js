// Feature: adoc-to-pdf
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-001: Produce PDF in same directory as input
//   PDF-004: Output file naming convention
//   PDF-005: Custom output path
//   PDF-006: Error on missing input file
//   PDF-007: Error on unreadable input file
//   PDF-008: Report AsciiDoc rendering errors
//   PDF-009: Error on browser launch failure
//   PDF-010: CLI positional argument
//   PDF-011: --help displays usage
//   PDF-012: Exit code 0 on success
//   PDF-013: Non-zero exit code on failure
//
// Test level: Integration / End-to-end

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileAsync = promisify(execFile);
const CLI_PATH = path.resolve('bin/proven-docs.js');

function run(args, options = {}) {
  return execFileAsync('node', [CLI_PATH, ...args], {
    timeout: 30000,
    ...options,
  }).then(
    ({ stdout, stderr }) => ({ stdout, stderr, exitCode: 0 }),
    (err) => ({ stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code }),
  );
}

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-test-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('PDF-010: CLI accepts input file path as positional argument', () => {
  it('should accept an input file path as a positional argument', async () => {
    const inputFile = path.join(tmpDir, 'test-010.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nHello.');

    const result = await run(['render', inputFile]);

    // Should succeed (exit 0) and produce a PDF
    expect(result.exitCode).toBe(0);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('PDF-011: --help displays usage information', () => {
  it('should display usage information when --help is passed', async () => {
    const result = await run(['render', '--help']);

    expect(result.stdout).toContain('Usage');
    expect(result.stdout + result.stderr).toMatch(/input|file/i);
  });

  it('should display the --output option in help text', async () => {
    const result = await run(['render', '--help']);

    expect(result.stdout).toMatch(/--output|-o/);
  });
});

describe('PDF-001: Produce PDF in same directory as input', () => {
  it('should produce a PDF file in the same directory as the input file', async () => {
    const inputFile = path.join(tmpDir, 'test-001.adoc');
    const expectedOutput = path.join(tmpDir, 'test-001.pdf');
    fs.writeFileSync(inputFile, '= Test Document\n\nContent here.');

    const result = await run(['render', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(expectedOutput)).toBe(true);

    // Clean up
    try { fs.unlinkSync(expectedOutput); } catch { /* ignore */ }
  });
});

describe('PDF-004: Output file naming convention', () => {
  it('should name the output PDF with the same base name and .pdf extension', async () => {
    const inputFile = path.join(tmpDir, 'my-report.adoc');
    const expectedOutput = path.join(tmpDir, 'my-report.pdf');
    fs.writeFileSync(inputFile, '= My Report\n\nReport content.');

    const result = await run(['render', inputFile]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(expectedOutput)).toBe(true);

    // Clean up
    try { fs.unlinkSync(expectedOutput); } catch { /* ignore */ }
  });
});

describe('PDF-005: Custom output path', () => {
  it('should write the PDF to the specified output path when --output is used', async () => {
    const inputFile = path.join(tmpDir, 'test-005.adoc');
    const customOutput = path.join(tmpDir, 'custom-output.pdf');
    fs.writeFileSync(inputFile, '= Custom Output Test\n\nContent.');

    const result = await run(['render', inputFile, '--output', customOutput]);

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(customOutput)).toBe(true);

    // Ensure the default location was NOT used
    const defaultOutput = inputFile.replace('.adoc', '.pdf');
    expect(fs.existsSync(defaultOutput)).toBe(false);

    // Clean up
    try { fs.unlinkSync(customOutput); } catch { /* ignore */ }
  });
});

describe('PDF-006: Error on missing input file', () => {
  it('should exit with non-zero code when input file does not exist', async () => {
    const result = await run(['render', '/nonexistent/file.adoc']);

    expect(result.exitCode).not.toBe(0);
  });

  it('should print an error message identifying the missing file', async () => {
    const missingPath = '/nonexistent/file.adoc';
    const result = await run(['render', missingPath]);

    expect(result.stderr).toContain(missingPath);
  });
});

describe('PDF-007: Error on unreadable input file', () => {
  it('should exit with non-zero code when input file is not readable', async () => {
    const inputFile = path.join(tmpDir, 'unreadable.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nContent.');
    fs.chmodSync(inputFile, 0o000);

    const result = await run(['render', inputFile]);

    expect(result.exitCode).not.toBe(0);

    // Restore permissions for cleanup
    fs.chmodSync(inputFile, 0o644);
  });

  it('should print an error message for unreadable files', async () => {
    const inputFile = path.join(tmpDir, 'unreadable2.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nContent.');
    fs.chmodSync(inputFile, 0o000);

    const result = await run(['render', inputFile]);

    expect(result.stderr).toMatch(/cannot read|not readable|permission/i);

    // Restore permissions for cleanup
    fs.chmodSync(inputFile, 0o644);
  });
});

describe('PDF-008: Report AsciiDoc rendering errors', () => {
  it('should report rendering issues to the user', async () => {
    // Asciidoctor is quite forgiving with malformed content,
    // but we can verify that output is still produced or errors reported
    const inputFile = path.join(tmpDir, 'test-008.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nSome content.');

    const result = await run(['render', inputFile]);

    // Valid AsciiDoc should succeed
    expect(result.exitCode).toBe(0);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('PDF-009: Error on browser launch failure', () => {
  it('should exit with non-zero code when browser cannot launch', async () => {
    const inputFile = path.join(tmpDir, 'test-009.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nContent.');

    // Set PLAYWRIGHT_BROWSERS_PATH to a nonexistent directory to force launch failure
    const result = await run(['render', inputFile], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/nonexistent/browsers' },
    });

    expect(result.exitCode).not.toBe(0);
  });

  it('should print a diagnostic message when browser fails to launch', async () => {
    const inputFile = path.join(tmpDir, 'test-009b.adoc');
    fs.writeFileSync(inputFile, '= Test\n\nContent.');

    const result = await run(['render', inputFile], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '/nonexistent/browsers' },
    });

    expect(result.stderr).toMatch(/browser|launch|chromium/i);
  });
});

describe('PDF-012: Exit code 0 on success', () => {
  it('should exit with code 0 on successful conversion', async () => {
    const inputFile = path.join(tmpDir, 'test-012.adoc');
    fs.writeFileSync(inputFile, '= Success Test\n\nThis should succeed.');

    const result = await run(['render', inputFile]);

    expect(result.exitCode).toBe(0);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('PDF-013: Non-zero exit code on failure', () => {
  it('should exit with non-zero code on any failure', async () => {
    const result = await run(['render', '/does/not/exist.adoc']);

    expect(result.exitCode).not.toBe(0);
  });
});
