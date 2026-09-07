'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  execFileSync
} = require('node:child_process');
const esbuild = require('esbuild');
const pkg = require('core-js/package.json');

const root = path.resolve(__dirname, '..');
const cache = path.join(root, '.cache', `core-js-${pkg.version}`);
const archive = path.join(root, '.cache', `core-js-${pkg.version}.tar.gz`);
const testsDir = path.join(cache, 'tests', 'unit-global');

fs.mkdirSync(path.dirname(cache), {
  recursive: true
});
if (!fs.existsSync(testsDir)) {
  const url = `https://github.com/zloirock/core-js/archive/refs/tags/v${pkg.version}.tar.gz`;
  execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', url, '--output', archive]);
  fs.mkdirSync(cache, {
    recursive: true
  });
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', cache]);
}

const testFiles = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.js'))
  .sort();
const imports = testFiles.map(file => `require('./tests/unit-global/${file}');`).join('\n');
const entry = path.join(cache, 'jxa-test-entry.js');
const resultFile = path.join(root, 'dist', 'test-result.json');

fs.writeFileSync(entry, `
// A stay-open JXA applet calls idle between Promise jobs. Its idle handler pumps
// this timer queue to provide the host APIs expected by core-js and QUnit.
var nextTimerId = 1;
var timers = [];
globalThis.setTimeout = function setTimeout(callback, delay) {
  var args = Array.prototype.slice.call(arguments, 2);
  var timer = { id: nextTimerId++, callback: callback, args: args,
    due: Date.now() + Number(delay || 0), interval: 0, active: true };
  timers.push(timer);
  return timer.id;
};
globalThis.clearTimeout = function clearTimeout(id) {
  for (var i = 0; i < timers.length; i++) if (timers[i].id === id) timers[i].active = false;
};
globalThis.setInterval = function setInterval(callback, delay) {
  var args = Array.prototype.slice.call(arguments, 2);
  var interval = Math.max(1, Number(delay || 0));
  var timer = { id: nextTimerId++, callback: callback, args: args,
    due: Date.now() + interval, interval: interval, active: true };
  timers.push(timer);
  return timer.id;
};
globalThis.clearInterval = function clearInterval(id) {
  globalThis.clearTimeout(id);
};
globalThis.__pumpTimers = function () {
  var now = Date.now();
  var ready = timers.filter(function (timer) { return timer.active && timer.due <= now; });
  timers = timers.filter(function (timer) { return timer.active && (timer.interval || timer.due > now); });
  ready.forEach(function (timer) {
    if (timer.interval && timer.active) { timer.due = now + timer.interval; timers.push(timer); }
    timer.callback.apply(undefined, timer.args);
  });
};

require(${JSON.stringify(path.join(root, 'src/jxa-compat.js'))});
['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'].forEach(function (name) {
  Object.defineProperty(globalThis[name], 'name', { value: name, configurable: true });
});
globalThis.QUnit = require(${JSON.stringify(path.join(root, 'node_modules/qunit/qunit/qunit.js'))});
QUnit.config.autostart = false;
require('./tests/helpers/qunit-helpers.js');

${imports}

var failures = [];
QUnit.on('testEnd', function (data) {
  if (data.status === 'failed' && failures.length < 10) {
    var assertions = data.assertions.filter(function (assertion) { return !assertion.passed; });
    var detail = assertions.map(function (assertion) {
      return assertion.message + ' (actual ' + String(assertion.actual) + ', expected ' + String(assertion.expected) + ')';
    }).join(', ');
    failures.push(data.module + ': ' + data.name + ': ' + detail);
  }
});
QUnit.on('runEnd', function (data) {
  globalThis.__writeTestResult({
    failed: data.testCounts.failed,
    passed: data.testCounts.passed,
    skipped: data.testCounts.skipped,
    total: data.testCounts.total,
    failures: failures
  });
});

globalThis.__runTests = function () {
  (async function () {
    await Promise.resolve();
    QUnit.start();
  })().catch(function (error) {
    globalThis.__writeTestResult({ failed: 1, passed: 0, failures: [String(error)] });
  });
};
`);

esbuild.buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: ['esnext'],
  footer: {
    js: `
ObjC.import('Foundation');
globalThis.__writeTestResult = function (result) {
  var text = $(JSON.stringify(result));
  text.writeToFileAtomicallyEncodingError(${JSON.stringify(resultFile)}, true, $.NSUTF8StringEncoding, null);
  Application.currentApplication().quit();
};
function run() { globalThis.__runTests(); }
function idle() { globalThis.__pumpTimers(); return 0.001; }
`
  },
  outfile: path.join(root, 'dist', 'core-js-jxa-tests.js'),
  nodePaths: [path.join(root, 'node_modules')],
  logLevel: 'info',
});

console.log(`Bundled all ${testFiles.length} upstream core-js unit-global test files.`);
