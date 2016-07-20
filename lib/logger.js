/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Logger'];

function Logger(prefix, win) {
  this.classPrefix = 'universal-search';
  this.instancePrefix = prefix;
  this.console = win.console;
}

Logger.prototype = {
  _prefix: function() {
    return `[${this.classPrefix}.${this.instancePrefix}]`;
  },

  info: function() {
    [].splice.apply(arguments, [0, 0, this._prefix()]);
    this.console.info.apply(this.console, arguments);
  },

  log: function() {
    [].splice.apply(arguments, [0, 0, this._prefix()]);
    this.console.log.apply(this.console, arguments);
  },

  warn: function() {
    [].splice.apply(arguments, [0, 0, this._prefix()]);
    this.console.warn.apply(this.console, arguments);
  },

  error: function() {
    [].splice.apply(arguments, [0, 0, this._prefix()]);
    this.console.error.apply(this.console, arguments);
  }
};

