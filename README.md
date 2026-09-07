# core-jxa

Runs [`core-js`](https://github.com/zloirock/core-js) under macOS JavaScript for Automation (JXA) and executes its compatible upstream unit tests with `osascript`.

## Requirements

- macOS with JXA and `osascript`
- Node.js and npm
- `curl` and `tar` for retrieving upstream tests

## Setup

```sh
npm install
```

## Run

```sh
npm start
```

This command bundles `src/core-js-jxa.js` and `src/jxa-compat.js` into a browser-format IIFE, then executes it with:

```sh
osascript -l JavaScript dist/core-js-jxa.js
```

`src/jxa-compat.js` loads the complete `core-js` build. It also replaces `Error.isError` because JavaScriptCore's native implementation does not recognize every error class supplied by `core-js`, including `AggregateError` and `SuppressedError`.

## Extended polyfill build

```sh
npm run start:polyfills
```

This separate build produces `dist/polyfills-jxa.js`. It currently includes:

- `core-js`
- [`web-streams-polyfill`](https://www.npmjs.com/package/web-streams-polyfill) 4.3.0
- [`@web-std/blob`](https://www.npmjs.com/package/@web-std/blob) 3.0.5
- `TextEncoder` and `TextDecoder` from `@zxing/text-encoding`
- `fetch`, `Headers`, `Request`, and `Response` from `whatwg-fetch`
- `FormData` and `File` from `formdata-polyfill`
- `AbortController` and `AbortSignal` from `abort-controller`
- `Location` and `location` from the local JXA adapter
- `Promise.allKeyed` from `promise.allkeyed`
- `Promise.allSettledKeyed` from `promise.allsettledkeyed`

The build exposes these APIs plus all Web Streams constructors on `globalThis` as writable, enumerable, configurable properties. `globalThis.location` is a Location-compatible object whose URL is the current working directory, such as `file:///path/to/project/`. Startup checks construct streams, Blob, File, FormData, Headers, Request, Response, Location, and AbortController instances.

The es-shims organization contains 168 repositories, including tooling, abstract-operation libraries, obsolete aggregate shims, and individual shims already covered by the complete `core-js` build. Only current Stage 3 APIs absent from `core-js` are added separately, avoiding duplicate shims and global conflicts.

`whatwg-fetch` implements network requests through `XMLHttpRequest`. JXA does not provide `XMLHttpRequest`, so Fetch object constructors work, but calling `fetch()` requires a separate JXA network transport polyfill.

Use `npm run build:polyfills` to build without executing the bundle.

## Tests

```sh
npm test
```

The test runner:

1. Reads the installed `core-js` version.
2. Downloads the matching tagged upstream source into `.cache/`.
3. Bundles all files from upstream `tests/unit-global` with QUnit 2.
4. Compiles the bundle as a stay-open JXA applet with `osacompile`.
5. Starts QUnit from an async IIFE and waits for its result before closing the applet.

A plain `osascript` process returns immediately when its top-level value is a Promise. The stay-open applet provides event-loop turns through its `idle` handler, allowing native Promise jobs and async functions to finish. The same handler pumps JXA implementations of `setTimeout`, `setInterval`, and their cancellation APIs. Promise, async, microtask, and timer test files are all included.

Verified with `core-js` 3.50.0:

- All 443 upstream core-js unit test files bundled and executed
- 2 focused es-shims tests executed
- 782 tests passed
- 4 upstream-defined tests skipped
- 0 failures

Build output, the generated test applet, test results, and downloaded test sources are generated under `dist/` and `.cache/`; both are ignored by Git.
