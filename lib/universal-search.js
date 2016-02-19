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

  loadIntoWindow: function(win) {
    console.log('loadIntoWindow start');
    const document = win.document;

    // Sets the app global per window.
    win.universalSearch = win.universalSearch || {}

    // If the search bar is visible, note the location and hide it.
    const searchBarLocation = CustomizableUI.getPlacementOfWidget('search-container');
    if (searchBarLocation) {
      win.universalSearch.searchBarLocation = searchBarLocation;
      CustomizableUI.removeWidgetFromArea('search-container');
    }

    console.log('loadIntoWindow finish');
  },

  unloadFromWindow: function(win) {
    console.log('unloadFromWindow start');

    // If the search bar was originally visible, restore it.
    if (win.universalSearch.searchBarLocation) {
      const loc = win.universalSearch.searchBarLocation;
      CustomizableUI.addWidgetToArea('search-container', loc.area, loc.position);
    }

    // Delete any remaining references.
    delete win.universalSearch;

    console.log('unloadFromWindow finish');
  },

  onError: function(msg) {
    console.error(msg);
  }
};

// Expose a singleton, since we only need one of these for the add-on.
const UniversalSearch = new Search();
