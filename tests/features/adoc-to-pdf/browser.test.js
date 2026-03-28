// Feature: adoc-to-pdf
// Spec version: 1.3.0
// Generated from: spec.adoc
//
// Spec coverage:
//   PDF-028: Detect and use system-installed browser
//   PDF-029: Consistent browser preference order
//   PDF-030: BROWSER_PATH override
//   PDF-031: Error when no browser found
//   PDF-032: Cross-platform browser detection
//   PDF-033: No Playwright browser download required
//
// Test level: Unit

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import child_process from 'node:child_process';

// The module under test will be dynamically imported to allow mocking
let discoverBrowser;

describe('PDF-028: Detect and use system-installed browser', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROWSER_PATH;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return a path to an existing browser executable', async () => {
    // Import fresh to pick up current platform
    const mod = await import('../../../src/browser.js');
    discoverBrowser = mod.discoverBrowser;

    const browserPath = discoverBrowser();
    expect(browserPath).toBeTypeOf('string');
    expect(browserPath.length).toBeGreaterThan(0);
    expect(fs.existsSync(browserPath)).toBe(true);
  });

  it('should return a path that is a Chromium-based browser', async () => {
    const mod = await import('../../../src/browser.js');
    discoverBrowser = mod.discoverBrowser;

    const browserPath = discoverBrowser();
    // The path should contain a recognisable browser name
    const lower = browserPath.toLowerCase();
    const isKnownBrowser =
      lower.includes('chrome') ||
      lower.includes('chromium') ||
      lower.includes('edge') ||
      lower.includes('msedge');
    expect(isKnownBrowser).toBe(true);
  });
});

describe('PDF-029: Consistent browser preference order', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROWSER_PATH;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return the same browser path on consecutive calls', async () => {
    const mod = await import('../../../src/browser.js');
    discoverBrowser = mod.discoverBrowser;

    const first = discoverBrowser();
    const second = discoverBrowser();
    expect(first).toBe(second);
  });
});

describe('PDF-030: BROWSER_PATH override', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should use BROWSER_PATH when set to a valid executable', async () => {
    const mod = await import('../../../src/browser.js');
    discoverBrowser = mod.discoverBrowser;

    // First discover the real browser, then set it as BROWSER_PATH
    const realBrowser = discoverBrowser();
    process.env.BROWSER_PATH = realBrowser;

    const result = discoverBrowser();
    expect(result).toBe(realBrowser);
  });

  it('should throw when BROWSER_PATH points to a non-existent path', async () => {
    const mod = await import('../../../src/browser.js');
    discoverBrowser = mod.discoverBrowser;

    process.env.BROWSER_PATH = '/nonexistent/path/to/browser';

    expect(() => discoverBrowser()).toThrow(/BROWSER_PATH/);
    expect(() => discoverBrowser()).toThrow('/nonexistent/path/to/browser');
  });
});

describe('PDF-031: Error when no browser found', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROWSER_PATH;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should throw a descriptive error when no browser is found', async () => {
    // Mock fs.existsSync to always return false (no browser installed)
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    // Mock execFileSync to always throw (no browser in PATH on Linux)
    vi.spyOn(child_process, 'execFileSync').mockImplementation(() => {
      throw new Error('not found');
    });

    // Re-import to pick up mocks
    vi.resetModules();
    const mod = await import('../../../src/browser.js');

    expect(() => mod.discoverBrowser()).toThrow(/No supported browser found/);
  });

  it('should list supported browsers in the error message', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(child_process, 'execFileSync').mockImplementation(() => {
      throw new Error('not found');
    });

    vi.resetModules();
    const mod = await import('../../../src/browser.js');

    try {
      mod.discoverBrowser();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.message).toMatch(/Chrome/i);
      expect(err.message).toMatch(/Edge/i);
      expect(err.message).toMatch(/Chromium/i);
    }
  });

  it('should mention BROWSER_PATH in the error message', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(child_process, 'execFileSync').mockImplementation(() => {
      throw new Error('not found');
    });

    vi.resetModules();
    const mod = await import('../../../src/browser.js');

    try {
      mod.discoverBrowser();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err.message).toMatch(/BROWSER_PATH/);
    }
  });
});

describe('PDF-032: Cross-platform browser detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROWSER_PATH;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should detect a browser on the current platform without BROWSER_PATH', async () => {
    // This test runs on whatever platform the CI/dev machine is
    // and verifies auto-detection works without any env override
    const mod = await import('../../../src/browser.js');

    const browserPath = mod.discoverBrowser();
    expect(browserPath).toBeTypeOf('string');
    expect(fs.existsSync(browserPath)).toBe(true);
  });
});

describe('PDF-033: No Playwright browser download required', () => {
  it('should import chromium from playwright-core, not playwright', async () => {
    // Verify that print.js imports from playwright-core
    const printSource = fs.readFileSync(
      new URL('../../../src/print.js', import.meta.url),
      'utf-8',
    );
    expect(printSource).toMatch(/from\s+['"]playwright-core['"]/);
    expect(printSource).not.toMatch(/from\s+['"]playwright['"]\s*;/);
  });

  it('should not list playwright (full) as a dependency', async () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        new URL('../../../package.json', import.meta.url),
        'utf-8',
      ),
    );
    expect(pkg.dependencies).not.toHaveProperty('playwright');
    expect(pkg.dependencies).toHaveProperty('playwright-core');
  });
});
