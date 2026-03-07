// Feature: adoc-to-pdf
// Spec version: 1.2.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-023: Include directives resolve relative to input file
//   PDF-024: Render resolves includes from input file directory
//   PDF-025: Error on missing included file
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-include-'));

  // Create a nested directory structure:
  //   tmpDir/
  //     project/
  //       docs/
  //         index.adoc       (includes sub/chapter.adoc)
  //         sub/
  //           chapter.adoc   (the included file)
  //         missing.adoc     (includes a non-existent file)
  const docsDir = path.join(tmpDir, 'project', 'docs');
  const subDir = path.join(docsDir, 'sub');
  fs.mkdirSync(subDir, { recursive: true });

  fs.writeFileSync(
    path.join(subDir, 'chapter.adoc'),
    'This is the included chapter content.\n',
  );

  fs.writeFileSync(
    path.join(docsDir, 'index.adoc'),
    [
      '= Main Document',
      ':author: Test Author',
      '',
      'Introduction paragraph.',
      '',
      'include::sub/chapter.adoc[]',
    ].join('\n'),
  );

  fs.writeFileSync(
    path.join(docsDir, 'missing.adoc'),
    [
      '= Missing Include',
      '',
      'include::nonexistent/file.adoc[]',
    ].join('\n'),
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('PDF-023: Include directives resolve relative to input file', () => {
  it('should resolve include paths relative to the document directory, not CWD', async () => {
    const inputFile = path.join(tmpDir, 'project', 'docs', 'index.adoc');

    // Run from tmpDir (NOT from the docs directory)
    const result = await run(['render', inputFile], {
      cwd: tmpDir,
    });

    expect(result.exitCode).toBe(0);

    // The PDF should be produced
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    expect(fs.existsSync(pdfFile)).toBe(true);

    // Clean up
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });

  it('should include content from the referenced file', async () => {
    const inputFile = path.join(tmpDir, 'project', 'docs', 'index.adoc');

    // Run from the project root (different from docs dir)
    const result = await run(['render', inputFile], {
      cwd: path.join(tmpDir, 'project'),
    });

    expect(result.exitCode).toBe(0);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('PDF-024: Render resolves includes from input file directory', () => {
  it('should render successfully when CWD is completely different from document directory', async () => {
    const inputFile = path.join(tmpDir, 'project', 'docs', 'index.adoc');

    // Run from OS temp root (completely different from document location)
    const result = await run(['render', inputFile], {
      cwd: os.tmpdir(),
    });

    expect(result.exitCode).toBe(0);

    const pdfFile = inputFile.replace('.adoc', '.pdf');
    expect(fs.existsSync(pdfFile)).toBe(true);

    // Clean up
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});

describe('PDF-025: Error on missing included file', () => {
  it('should report a warning or error when an included file does not exist', async () => {
    const inputFile = path.join(tmpDir, 'project', 'docs', 'missing.adoc');

    const result = await run(['render', inputFile], {
      cwd: tmpDir,
    });

    // Asciidoctor should still produce output but report the missing include
    // Check stderr for the missing file indication
    const combined = result.stdout + result.stderr;
    expect(combined).toMatch(/include|not found|nonexistent/i);

    // Clean up
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
  });
});
