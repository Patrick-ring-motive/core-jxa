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

- All 443 upstream unit test files bundled and executed
- 780 tests passed
- 4 upstream-defined tests skipped
- 0 failures

Build output, the generated test applet, test results, and downloaded test sources are generated under `dist/` and `.cache/`; both are ignored by Git.
