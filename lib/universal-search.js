/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'console',
  'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CustomizableUI',
  'resource:///modules/CustomizableUI.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'PrivateBrowsingUtils',
  'resource://gre/modules/PrivateBrowsingUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');
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

    win.universalSearch.prefs = this._initializePrefs(win);
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

  _initializePrefs: function(win) {
    return Services.prefs.getBranch('extensions.universalsearch.');
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
    // Each module's EXPORTED_SYMBOLS will be properties on win.universalSearch.
    Cu.import('resource://gre/modules/Console.jsm', win.universalSearch);

    Cu.import('chrome://universalsearch-lib/content/events.js', win.universalSearch);
    Cu.import('chrome://universalsearch-lib/content/recommendation-server.js', win.universalSearch);

    Cu.import('chrome://universalsearch-ui/content/highlight-manager.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/popup.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/recommendation.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/urlbar.js', win.universalSearch);
  },

  _unloadScripts: function(win) {
    // Unload scripts from the namespace. Not clear on whether this is necessary
    // if we just delete win.universalSearch.
    Cu.unload('chrome://universalsearch-ui/content/highlight-manager.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/popup.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/recommendation.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/urlbar.js', win.universalSearch);

    Cu.unload('chrome://universalsearch-lib/content/recommendation-server.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-lib/content/events.js', win.universalSearch);

    Cu.unload('resource://gre/modules/Console.jsm', win.universalSearch);
  },

  _startApp: function(win) {
    // Initialize libraries and attach to the app global here
    const app = win.universalSearch;

    app.events = new app.Events();
    app.events.init();

    app.recommendationServer = new app.RecommendationServer({
      events: app.events,
      xhr: Cc['@mozilla.org/xmlextras/xmlhttprequest;1'],
      timeout: 1000,
      // app.console is provided by loading Console.jsm
      console: app.console,
      prefs: app.prefs
    });
    app.recommendationServer.init();

    // NOTE: order matters here, the urlbar and highlightManager both need
    // to be handed the initialized recommendation
    app.recommendation = new app.Recommendation({
      win: win,
      events: app.events
    });
    app.recommendation.init();

    app.urlbar = new app.Urlbar({
      win: win,
      events: app.events,
      privateBrowsingUtils: PrivateBrowsingUtils,
      recommendation: app.recommendation
    });
    app.urlbar.init();

    app.highlightManager = new app.HighlightManager({
      win: win,
      events: app.events,
      recommendation: app.recommendation
    });
    app.highlightManager.init();

    app.popup = new app.Popup({
      win: win,
      events: app.events
    });
    app.popup.init();
  },

  _stopApp: function(win) {
    const app = win.universalSearch;

    app.popup.destroy();
    app.recommendationView.destroy();
    app.highlightManager.destroy();
    app.urlbar.destroy();
    app.recommendationServer.destroy();
    app.events.destroy();

    delete win.universalSearch;
  },

  onError: function(msg) {
    console.error(msg);
  }
};

// Expose a singleton, since we only need one of these for the add-on.
const UniversalSearch = new Search();
