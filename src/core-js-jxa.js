import './jxa-compat.js';

const checks = [
  typeof globalThis === 'object',
  typeof Object.hasOwn === 'function',
  typeof Array.from === 'function',
  typeof Array.prototype.at === 'function',
  typeof Promise.any === 'function',
  typeof structuredClone === 'function',
];

if (!checks.every(Boolean)) {
  throw new Error('core-js failed to initialize in JXA');
}

'core-js ' + require('core-js/package.json').version + ' loaded in JXA';
