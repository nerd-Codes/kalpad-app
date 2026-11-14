// tests/e2e/common.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export const PROJECT_ROOT = '/home/srijal/Desktop/kalpad-mvp';
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const BRAVE_BIN = '/usr/bin/brave-browser';

/**
 * Reads a project file as UTF-8 string
 */
export function readProjectFile(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Project file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Checks if a project file exists
 */
export function fileExists(relPath) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(PROJECT_ROOT, relPath);
  return fs.existsSync(fullPath);
}

/**
 * Recursively scans a directory for files matching extensions
 */
export function scanDirectory(dirPath, extensions = ['.js', '.jsx', '.css', '.scss']) {
  const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(PROJECT_ROOT, dirPath);
  const results = [];
  if (!fs.existsSync(fullPath)) return results;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile()) {
        if (extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(entryPath);
        }
      }
    }
  }

  walk(fullPath);
  return results;
}

/**
 * Retrieves all relevant landing page source files
 */
export function getLandingFiles() {
  const files = [
    path.join(PROJECT_ROOT, 'src/app/page.js'),
    path.join(PROJECT_ROOT, 'src/app/globals.css'),
    ...scanDirectory('src/components/landing', ['.js', '.jsx', '.css', '.scss'])
  ];
  return files.filter(f => fs.existsSync(f));
}

/**
 * Helper to check if server is reachable
 */
export async function isServerReachable(url = BASE_URL, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 400;
  } catch (err) {
    return false;
  }
}

/**
 * Captures a screenshot using headless Brave Browser with 5000ms virtual time budget
 */
export function captureBraveScreenshot(url, width, height, outputPath) {
  if (!fs.existsSync(BRAVE_BIN)) {
    throw new Error(`Brave binary not found at ${BRAVE_BIN}`);
  }
  const cmd = `${BRAVE_BIN} --headless --disable-gpu --no-sandbox --window-size=${width},${height} --virtual-time-budget=5000 --screenshot=${outputPath} ${url}`;
  execSync(cmd, { stdio: 'pipe', timeout: 30000 });
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Screenshot was not created at ${outputPath}`);
  }
  const stats = fs.statSync(outputPath);
  return stats;
}

/**
 * Dumps hydrated DOM using headless Brave Browser
 */
export function dumpBraveDOM(url = BASE_URL) {
  if (!fs.existsSync(BRAVE_BIN)) {
    throw new Error(`Brave binary not found at ${BRAVE_BIN}`);
  }
  const cmd = `${BRAVE_BIN} --headless --disable-gpu --no-sandbox --virtual-time-budget=5000 --dump-dom ${url}`;
  return execSync(cmd, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }).toString('utf8');
}
