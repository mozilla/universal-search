/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'console',
  'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'WindowWatcher',
  'chrome://usearch-lib/content/window-watcher.js');

const EXPORTED_SYMBOLS = ['UniversalSearch'];

function Search() {}

Search.prototype = {
  load: function() {
    WindowWatcher.start(this.loadIntoWindow, this.unloadFromWindow, this.onError);
  },

  unload: function() {
    WindowWatcher.stop();
  },

  loadIntoWindow: function(win) {},

  unloadFromWindow: function(win) {},

  onError: function(msg) {
    console.error(msg);
  }
};

// Expose a singleton, since we only need one of these for the add-on.
const UniversalSearch = new Search();
