import './jxa-compat.js';
import 'web-streams-polyfill/polyfill';

const { TextEncoder, TextDecoder } = require('@zxing/text-encoding');
for (const [name, value] of Object.entries({ TextEncoder, TextDecoder })) {
  if (typeof globalThis[name] !== 'function') {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
}

// The package's browser export assumes Blob already exists, while JXA has no
// native Blob. Load its packaged implementation directly instead.
const { Blob: BlobPolyfill } = require('../node_modules/@web-std/blob/dist/src/lib.node.cjs');
if (typeof globalThis.Blob !== 'function') {
  Object.defineProperty(globalThis, 'Blob', {
    value: BlobPolyfill,
    writable: true,
    configurable: true,
  });
}

const streamConstructors = [
  globalThis.ReadableStream,
  globalThis.ReadableStreamDefaultReader,
  globalThis.ReadableStreamBYOBReader,
  globalThis.WritableStream,
  globalThis.WritableStreamDefaultWriter,
  globalThis.TransformStream,
  globalThis.ByteLengthQueuingStrategy,
  globalThis.CountQueuingStrategy,
];

if (!streamConstructors.every(value => typeof value === 'function')) {
  throw new Error('web-streams-polyfill failed to initialize in JXA');
}

const stream = new ReadableStream({
  start(controller) {
    controller.enqueue('web-streams-polyfill loaded');
    controller.close();
  },
});

if (typeof stream.getReader !== 'function') {
  throw new Error('ReadableStream is unusable in JXA');
}

const blob = new Blob(['hello', new Uint8Array([32, 74, 88, 65])], {
  type: 'text/plain',
});
if (blob.size !== 9 || blob.type !== 'text/plain' ||
    typeof blob.arrayBuffer !== 'function' || typeof blob.slice !== 'function' ||
    typeof blob.stream !== 'function' || typeof blob.text !== 'function') {
  throw new Error('Blob polyfill failed to initialize in JXA');
}

'core-js ' + require('core-js/package.json').version +
  ', web-streams-polyfill ' + require('web-streams-polyfill/package.json').version +
  ', and @web-std/blob loaded in JXA';
