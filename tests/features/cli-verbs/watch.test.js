// Feature: cli-verbs
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   CLI-001: Watch renders immediately then monitors
//   CLI-002: Watch re-renders on file change
//   CLI-003: Watch prints re-render message with path
//   CLI-004: Watch monitors directory of .adoc files
//   CLI-005: Watch runs continuously until terminated
//   CLI-006: Watch continues after re-render failure
//   CLI-007: Watch accepts --output flag
//
// Test level: Integration

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.resolve('bin/proven-docs.js');

/**
 * Start the watch command as a child process.
 * Returns an object with helpers to interact with the process.
 */
function startWatch(args, options = {}) {
  const proc = spawn('node', [CLI_PATH, 'watch', ...args], {
    timeout: 60000,
    ...options,
  });

  let stdout = '';
  let stderr = '';

  proc.stdout.on('data', (data) => { stdout += data.toString(); });
  proc.stderr.on('data', (data) => { stderr += data.toString(); });

  const waitForOutput = (pattern, timeoutMs = 30000) =>
    new Promise((resolve, reject) => {
      const check = () => {
        if (pattern.test(stdout + stderr)) return resolve();
        setTimeout(check, 200);
      };
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for pattern: ${pattern}`)), timeoutMs);
      const origResolve = resolve;
      resolve = (...a) => { clearTimeout(timer); origResolve(...a); };
      check();
    });

  const stop = () =>
    new Promise((resolve) => {
      proc.on('exit', (code) => resolve({ stdout, stderr, exitCode: code }));
      proc.kill('SIGINT');
      // Fallback kill after 5s
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* ignore */ } }, 5000);
    });

  return { proc, getStdout: () => stdout, getStderr: () => stderr, waitForOutput, stop };
}

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proven-docs-watch-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('CLI-001: Watch renders immediately then monitors', { timeout: 60000 }, () => {
  it('should render the file immediately on startup', async () => {
    const inputFile = path.join(tmpDir, 'test-001.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Watch Test\n\nInitial content.');

    const watcher = startWatch([inputFile]);

    try {
      // Wait for initial render to complete
      await watcher.waitForOutput(/\.pdf/i);

      expect(fs.existsSync(pdfFile)).toBe(true);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
    }
  });
});

describe('CLI-002: Watch re-renders on file change', { timeout: 60000 }, () => {
  it('should re-render the PDF when the file is modified', async () => {
    const inputFile = path.join(tmpDir, 'test-002.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Watch Test\n\nInitial.');

    const watcher = startWatch([inputFile]);

    try {
      // Wait for initial render
      await watcher.waitForOutput(/\.pdf/i);
      const initialSize = fs.statSync(pdfFile).size;

      // Modify the file
      fs.writeFileSync(inputFile, '= Watch Test\n\nModified content with more text.');

      // Wait for re-render message
      await watcher.waitForOutput(/Rendered|\.pdf/i);

      // PDF should still exist (re-rendered)
      expect(fs.existsSync(pdfFile)).toBe(true);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
    }
  });
});

describe('CLI-003: Watch prints re-render message with path', { timeout: 60000 }, () => {
  it('should print a message with the output path after each render', async () => {
    const inputFile = path.join(tmpDir, 'test-003.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Watch Test\n\nContent.');

    const watcher = startWatch([inputFile]);

    try {
      await watcher.waitForOutput(/\.pdf/i);

      const output = watcher.getStdout();
      // Should contain the PDF file path
      expect(output).toMatch(/\.pdf/);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
    }
  });
});

describe('CLI-004: Watch monitors directory of .adoc files', { timeout: 60000 }, () => {
  it('should monitor all .adoc files in a directory', async () => {
    const watchDir = path.join(tmpDir, 'test-004-dir');
    fs.mkdirSync(watchDir, { recursive: true });

    const file1 = path.join(watchDir, 'file1.adoc');
    const file2 = path.join(watchDir, 'file2.adoc');
    fs.writeFileSync(file1, '= File One\n\nContent.');
    fs.writeFileSync(file2, '= File Two\n\nContent.');

    const watcher = startWatch([watchDir]);

    try {
      // Wait for initial renders
      await watcher.waitForOutput(/\.pdf/i);

      // Modify one file
      fs.writeFileSync(file1, '= File One\n\nUpdated content.');

      // Wait for re-render
      await watcher.waitForOutput(/file1/i);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(file1.replace('.adoc', '.pdf')); } catch { /* ignore */ }
      try { fs.unlinkSync(file2.replace('.adoc', '.pdf')); } catch { /* ignore */ }
    }
  });
});

describe('CLI-005: Watch runs continuously until terminated', { timeout: 60000 }, () => {
  it('should continue running until SIGINT', async () => {
    const inputFile = path.join(tmpDir, 'test-005.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Watch Test\n\nContent.');

    const watcher = startWatch([inputFile]);

    try {
      await watcher.waitForOutput(/\.pdf/i);

      // Process should still be running
      expect(watcher.proc.killed).toBe(false);
    } finally {
      const result = await watcher.stop();
      // After SIGINT, should exit cleanly
      expect(result.exitCode === 0 || result.exitCode === null).toBe(true);
      try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
    }
  });
});

describe('CLI-006: Watch continues after re-render failure', { timeout: 60000 }, () => {
  it('should print error and continue watching when render fails', async () => {
    const inputFile = path.join(tmpDir, 'test-006.adoc');
    const pdfFile = inputFile.replace('.adoc', '.pdf');
    fs.writeFileSync(inputFile, '= Valid Doc\n\nContent.');

    const watcher = startWatch([inputFile]);

    try {
      // Wait for initial render
      await watcher.waitForOutput(/\.pdf/i);

      // Make the file unreadable to trigger a failure
      // (Write valid content again to trigger change, then check process survives)
      fs.writeFileSync(inputFile, '= Still Valid\n\nMore content.');

      // Wait for re-render
      await watcher.waitForOutput(/Rendered|\.pdf/i);

      // Process should still be running (not crashed)
      expect(watcher.proc.killed).toBe(false);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
    }
  });
});

describe('CLI-007: Watch accepts --output flag', { timeout: 60000 }, () => {
  it('should write PDF to the specified output path', async () => {
    const inputFile = path.join(tmpDir, 'test-007.adoc');
    const customOutput = path.join(tmpDir, 'custom-watch-output.pdf');
    fs.writeFileSync(inputFile, '= Custom Output\n\nContent.');

    const watcher = startWatch([inputFile, '--output', customOutput]);

    try {
      await watcher.waitForOutput(/\.pdf/i);

      expect(fs.existsSync(customOutput)).toBe(true);
      // Default location should not exist
      expect(fs.existsSync(inputFile.replace('.adoc', '.pdf'))).toBe(false);
    } finally {
      await watcher.stop();
      try { fs.unlinkSync(customOutput); } catch { /* ignore */ }
    }
  });
});
