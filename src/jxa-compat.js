'use strict';

require('core-js/index.js');

// JavaScriptCore's native Error.isError does not recognize every error class
// supplied by core-js, so use one implementation across native and polyfills.
const $export = require('core-js/internals/export');
const classof = require('core-js/internals/classof');
const isObject = require('core-js/internals/is-object');

$export({
  target: 'Error',
  stat: true,
  forced: true,
  sham: true
}, {
  isError: function isError(value) {
    if (!isObject(value)) return false;
    const tag = classof(value);
    return tag === 'Error' || tag === 'AggregateError' ||
      tag === 'SuppressedError' || tag === 'DOMException';
  },
});
