'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'dist', 'core-js-jxa-tests.js');
const app = path.join(root, 'dist', 'core-js-jxa-tests.app');
const resultFile = path.join(root, 'dist', 'test-result.json');

fs.rmSync(app, { recursive: true, force: true });
fs.rmSync(resultFile, { force: true });

execFileSync('osacompile', ['-l', 'JavaScript', '-s', '-o', app, source], { stdio: 'inherit' });
execFileSync('open', ['-W', app], { stdio: 'inherit' });

if (!fs.existsSync(resultFile)) {
  throw new Error('JXA test app exited without writing a result');
}

const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
if (result.failed) {
  const details = result.failures?.length ? `; ${result.failures.join('; ')}` : '';
  throw new Error(`core-js JXA tests: ${result.failed} failed, ${result.passed} passed${details}`);
}

console.log(`core-js JXA tests: ${result.passed} passed, ${result.skipped} skipped`);
