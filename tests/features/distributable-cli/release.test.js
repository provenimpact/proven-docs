// Feature: distributable-cli
// Spec version: 1.0.0
// Generated from: spec.adoc
//
// Spec coverage:
//   DIST-001: Pre-built binaries for 6 platforms (build script exists)
//   DIST-008: Release workflow triggered by version tag
//   DIST-009: Binaries uploaded to GitHub Release
//   DIST-011: No partial artifacts on failure
//
// Test level: Unit (static analysis of workflow and build script)

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..');

describe('DIST-001: Pre-built binaries for 6 platforms', () => {
  it('should have a build script at script/build.js', () => {
    expect(fs.existsSync(path.join(projectRoot, 'script', 'build.js'))).toBe(true);
  });

  it('should define all 6 target platforms in the build script', () => {
    const buildSource = fs.readFileSync(
      path.join(projectRoot, 'script', 'build.js'),
      'utf-8',
    );
    const expectedTargets = [
      'bun-darwin-arm64',
      'bun-darwin-x64',
      'bun-linux-arm64',
      'bun-linux-x64',
      'bun-windows-arm64',
      'bun-windows-x64',
    ];
    for (const target of expectedTargets) {
      expect(buildSource).toContain(target);
    }
  });
});

describe('DIST-008: Release workflow triggered by version tag', () => {
  it('should have a release workflow file', () => {
    expect(
      fs.existsSync(path.join(projectRoot, '.github', 'workflows', 'release.yml')),
    ).toBe(true);
  });

  it('should trigger on v* tag push', () => {
    const workflow = fs.readFileSync(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf-8',
    );
    expect(workflow).toMatch(/tags:\s*\n\s*-\s*['"]?v\*/);
  });
});

describe('DIST-009: Binaries uploaded to GitHub Release', () => {
  it('should upload binaries to the release', () => {
    const workflow = fs.readFileSync(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf-8',
    );
    expect(workflow).toMatch(/gh release upload/);
  });
});

describe('DIST-011: No partial artifacts on failure', () => {
  it('should run tests before building', () => {
    const workflow = fs.readFileSync(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf-8',
    );
    // Test step should appear before build step
    const testIndex = workflow.indexOf('npm test');
    const buildIndex = workflow.indexOf('script/build');
    expect(testIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(-1);
    expect(testIndex).toBeLessThan(buildIndex);
  });

  it('should build before uploading to the release', () => {
    const workflow = fs.readFileSync(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf-8',
    );
    const buildIndex = workflow.indexOf('script/build');
    const uploadIndex = workflow.indexOf('gh release upload');
    expect(buildIndex).toBeGreaterThan(-1);
    expect(uploadIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeLessThan(uploadIndex);
  });
});
