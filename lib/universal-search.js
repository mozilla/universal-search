/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'console',
  'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CustomizableUI',
  'resource:///modules/CustomizableUI.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'WindowWatcher',
  'chrome://universalsearch-lib/content/window-watcher.js');

const EXPORTED_SYMBOLS = ['UniversalSearch'];

function Search() {}

Search.prototype = {
  load: function() {
    WindowWatcher.start(this.loadIntoWindow, this.unloadFromWindow, this.onError, this);
  },

  unload: function() {
    WindowWatcher.stop();
  },

  loadIntoWindow: function(win) {
    console.log('loadIntoWindow start');

    // Sets the app global per window.
    win.universalSearch = win.universalSearch || {}

    this._hideSearchBar(win);
    this._loadStyleSheets(win);
    this._loadScripts(win);
    this._startApp(win);

    console.log('loadIntoWindow finish');
  },

  unloadFromWindow: function(win) {
    console.log('unloadFromWindow start');

    this._stopApp(win);
    this._unloadScripts(win);
    this._unloadStyleSheets(win);
    this._restoreSearchBar(win);

    // Delete any remaining references.
    delete win.universalSearch;

    console.log('unloadFromWindow finish');
  },

  _hideSearchBar: function(win) {
    // If the search bar is visible, note the location and hide it.
    const searchBarLocation = CustomizableUI.getPlacementOfWidget('search-container');
    if (searchBarLocation) {
      win.universalSearch.searchBarLocation = searchBarLocation;
      CustomizableUI.removeWidgetFromArea('search-container');
    }
  },

  _restoreSearchBar: function(win) {
    // If the search bar was originally visible, restore it.
    if (win.universalSearch.searchBarLocation) {
      const loc = win.universalSearch.searchBarLocation;
      CustomizableUI.addWidgetToArea('search-container', loc.area, loc.position);
    }
  },

  _loadStyleSheets: function(win) {
    const doc = win.document;
    const docEl = doc.documentElement;

    const stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'chrome://universalsearch-skin/content/style.css';
    stylesheet.type = 'text/css';
    stylesheet.id = 'universal-search-stylesheet';
    stylesheet.style.display = 'none';

    docEl.appendChild(stylesheet);
  },

  _unloadStyleSheets: function(win) {
    const docEl = win.document.documentElement;
    const stylesheet = docEl.getElementById('universal-search-stylesheet');

    docEl.removeChild(stylesheet);
  },

  _loadScripts: function(win) {
    // Note that we load the scripts into the app namespace, to ease cleanup.
    // Each module's EXPORTED_SYMBOLS will be properties on win.US.
    // Example: Cu.import('chrome://universalsearch-lib/content/something-in-lib.js', win.US);
  },

  _unloadScripts: function(win) {
    // Unload scripts from the namespace. Not clear on whether this is necessary
    // if we just delete win.US.
    // Example: Cu.unload('chrome://universalsearch-lib/content/something-in-lib.js', win.US);
  },

  _startApp: function(win) {
    // Initialize libraries and attach to the app global here
  },

  _stopApp: function(win) {
    // Detach DOM listeners / elements, unset window pointers
  },

  onError: function(msg) {
    console.error(msg);
  }
};

// Expose a singleton, since we only need one of these for the add-on.
const UniversalSearch = new Search();
