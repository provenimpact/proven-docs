import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// playwright-core is imported dynamically to allow the build script to
// handle its package.json requirement via a Bun plugin.
const { chromium } = await import('playwright-core');

/**
 * Well-known browser installation paths by platform.
 * Order within each platform defines preference: Chrome > Edge > Chromium.
 */
const PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [],
  linux: [],
};

// Build Windows paths by expanding environment variables at import time.
if (process.platform === 'win32') {
  const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env['LOCALAPPDATA'] || '';

  PATHS.win32 = [
    `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
    ...(localAppData ? [`${localAppData}\\Google\\Chrome\\Application\\chrome.exe`] : []),
    `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${programFiles}\\Chromium\\Application\\chrome.exe`,
    ...(localAppData ? [`${localAppData}\\Chromium\\Application\\chrome.exe`] : []),
  ];
}

/**
 * Binary names to search in PATH on Linux, in preference order.
 */
const LINUX_BINARIES = [
  'google-chrome-stable',
  'google-chrome',
  'microsoft-edge-stable',
  'microsoft-edge',
  'chromium-browser',
  'chromium',
];

/**
 * Resolve a binary name to an absolute path via `which`.
 * Returns the path string on success, or null if not found.
 */
function whichSync(bin) {
  try {
    return execFileSync('which', [bin], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/**
 * Detect a Chromium-based browser installed on the host system.
 *
 * Preference order: BROWSER_PATH env var → Chrome → Edge → Chromium → Playwright cache.
 *
 * @returns {string} Absolute path to the browser executable.
 * @throws {Error} If no supported browser is found.
 */
export function discoverBrowser() {
  // 1. Environment variable override
  const envPath = process.env.BROWSER_PATH;
  if (envPath) {
    if (!fs.existsSync(envPath)) {
      throw new Error(
        `Browser not found at path specified by BROWSER_PATH: ${envPath}`,
      );
    }
    return envPath;
  }

  const platform = process.platform;

  // 2. Linux: resolve binary names via PATH
  if (platform === 'linux') {
    for (const bin of LINUX_BINARIES) {
      const resolved = whichSync(bin);
      if (resolved && fs.existsSync(resolved)) {
        return resolved;
      }
    }
  }

  // 3. macOS / Windows: check well-known file paths
  const candidates = PATHS[platform];
  if (candidates) {
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  // 4. Fallback: check for a Playwright-cached browser (from a prior npx playwright install)
  try {
    const pwPath = chromium.executablePath();
    if (pwPath && fs.existsSync(pwPath)) {
      return pwPath;
    }
  } catch {
    // chromium.executablePath() throws if no browser is cached -- fall through
  }

  // 5. No browser found
  throw new Error(
    'No supported browser found.\n\n' +
    'proven-docs requires a Chromium-based browser (Google Chrome, Microsoft Edge, or Chromium).\n\n' +
    'Install one of these browsers, or set the BROWSER_PATH environment variable\n' +
    'to the path of a Chromium-based browser executable.',
  );
}
