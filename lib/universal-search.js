/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'console',
  'resource://gre/modules/Console.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CustomizableUI',
  'resource:///modules/CustomizableUI.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Logger',
  'chrome://universalsearch-lib/content/logger.js');
XPCOMUtils.defineLazyModuleGetter(this, 'ObjectUtils',
  'resource://gre/modules/ObjectUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'PrivateBrowsingUtils',
  'resource://gre/modules/PrivateBrowsingUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'WindowWatcher',
  'chrome://universalsearch-lib/content/window-watcher.js');

const EXPORTED_SYMBOLS = ['UniversalSearch'];

function Search() {
  /*
  The main UniversalSearch module manages the add-on lifecycle, loading and
  unloading code when the add-on is installed, enabled, disabled, or
  uninstalled. It's invoked by the bootstrap.js file.
  */

  // Due to limitations in passing objects between window contexts, we have to
  // bind the callbacks passed to WindowWatcher.start().
  this.loadIntoWindow = this.loadIntoWindow.bind(this);
  this.unloadFromWindow = this.unloadFromWindow.bind(this);
  this.onError = this.onError.bind(this);
}

Search.prototype = {
  load: function() {
    WindowWatcher.start(this.loadIntoWindow, this.unloadFromWindow, this.onError);
  },

  unload: function() {
    WindowWatcher.stop();
  },

  loadIntoWindow: function(win) {
    this.logger = new Logger('main', win);

    this.logger.log('loadIntoWindow start');

    // Sets the app global per window.
    win.universalSearch = win.universalSearch || {};

    win.universalSearch.Logger = Logger;
    win.universalSearch.prefs = this._initializePrefs();
    win.universalSearch.urlbarPrefs = this._initializeUrlbarPrefs();
    this._hideSearchBar(win);
    this._loadStyleSheets(win);
    this._loadScripts(win);
    this._startApp(win);

    this.logger.log('loadIntoWindow finish');
  },

  unloadFromWindow: function(win) {
    this.logger.log('unloadFromWindow start');

    // NOTE: order matters here: _restoreSearchBar needs `win.universalSearch`
    // to be defined, while _stopApp deletes `win.universalSearch`.
    this._restoreSearchBar(win);
    this._stopApp(win);
    this._unloadScripts(win);
    this._unloadStyleSheets(win);

    // Delete any remaining references.
    delete win.universalSearch;

    this.logger.log('unloadFromWindow finish');
    delete this.logger;

    // We invoke console.log above, so we cannot safely unload Console.jsm
    // until this point.
    Cu.unload('chrome://universalsearch-lib/content/logger.js', win.universalSearch);
    Cu.unload('resource://gre/modules/Console.jsm', win.universalSearch);
  },

  _initializePrefs: function() {
    return Services.prefs.getBranch('extensions.universalsearch.');
  },

  _initializeUrlbarPrefs: function() {
    return Services.prefs.getBranch('browser.urlbar.');
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

    // Insert the main stylesheet with platform-independent styles.
    const stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheet.href = 'chrome://universalsearch-skin/content/style.css';
    stylesheet.rel = 'stylesheet';
    stylesheet.type = 'text/css';
    stylesheet.id = 'universal-search-stylesheet';
    stylesheet.style.display = 'none';

    // Insert platform-specific styles, using `Services.appinfo.OS` to
    // distinguish between Mac OS ('Darwin'), Linux, and Windows ('WINNT').
    const stylesheetPlatform = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheetPlatform.rel = 'stylesheet';
    stylesheetPlatform.type = 'text/css';
    stylesheetPlatform.id = 'universal-search-stylesheet-platform';
    stylesheetPlatform.style.display = 'none';

    if (Services.appinfo.OS === 'Darwin') {
      stylesheetPlatform.href = 'chrome://universalsearch-skin/content/style-osx.css';
    } else if (Services.appinfo.OS === 'WINNT') {
      stylesheetPlatform.href = 'chrome://universalsearch-skin/content/style-windows.css';
    } else {
      stylesheetPlatform.href = 'chrome://universalsearch-skin/content/style-linux.css';
    }

    docEl.appendChild(stylesheet);
    docEl.appendChild(stylesheetPlatform);
  },

  _unloadStyleSheets: function(win) {
    const doc = win.document;
    const docEl = win.document.documentElement;

    const stylesheet = doc.getElementById('universal-search-stylesheet');
    const stylesheetPlatform = doc.getElementById('universal-search-stylesheet-platform');

    docEl.removeChild(stylesheet);
    docEl.removeChild(stylesheetPlatform);
  },

  _loadScripts: function(win) {
    // Note that we load the scripts into the app namespace, to ease cleanup.
    // Each module's EXPORTED_SYMBOLS will be properties on win.universalSearch.
    Cu.import('resource://gre/modules/Console.jsm', win.universalSearch);
    Cu.import('resource://gre/modules/Services.jsm', win.universalSearch);

    Cu.import('chrome://universalsearch-lib/content/events.js', win.universalSearch);
    Cu.import('chrome://universalsearch-lib/content/metrics.js', win.universalSearch);
    Cu.import('chrome://universalsearch-lib/content/logger.js', win.universalSearch);
    Cu.import('chrome://universalsearch-lib/content/recommendation-server.js', win.universalSearch);

    Cu.import('chrome://universalsearch-ui/content/highlight-manager.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/popup.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/recommendation.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/recommendation-row.js', win.universalSearch);
    Cu.import('chrome://universalsearch-ui/content/urlbar.js', win.universalSearch);
  },

  _unloadScripts: function(win) {
    // Unload scripts from the namespace. Not clear on whether this is necessary
    // if we just delete win.universalSearch.
    Cu.unload('chrome://universalsearch-ui/content/highlight-manager.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/popup.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/recommendation.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/recommendation-row.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-ui/content/urlbar.js', win.universalSearch);

    Cu.unload('chrome://universalsearch-lib/content/recommendation-server.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-lib/content/metrics.js', win.universalSearch);
    Cu.unload('chrome://universalsearch-lib/content/events.js', win.universalSearch);

    // NOTE: we can't unload Console.jsm until the last console call.
    // It's unloaded by the caller (the unloadFromWindow method).
  },

  _startApp: function(win) {
    // Initialize modules and assemble the object graph.

    const app = win.universalSearch;

    app.events = new app.Events();
    app.events.init();

    app.recommendationServer = new app.RecommendationServer({
      events: app.events,
      xhr: Cc['@mozilla.org/xmlextras/xmlhttprequest;1'],
      timeout: 1000,
      Logger: app.Logger,
      prefs: app.prefs,
      urlbarPrefs: app.urlbarPrefs,
      win: win
    });
    app.recommendationServer.init();

    // NOTE: order matters here, the urlbar and highlightManager both need
    // to be handed the initialized recommendation
    app.recommendation = new app.Recommendation({
      eTLD: Services.eTLD,
      events: app.events,
      io: Services.io,
      Logger: app.Logger,
      objectUtils: ObjectUtils,
      win: win,
      RecommendationRow: app.RecommendationRow
    });
    app.recommendation.init();

    app.urlbar = new app.Urlbar({
      win: win,
      events: app.events,
      privateBrowsingUtils: PrivateBrowsingUtils,
      recommendation: app.recommendation
    });
    app.urlbar.init();

    app.popup = new app.Popup({
      win: win,
      events: app.events
    });
    app.popup.init();

    app.highlightManager = new app.HighlightManager({
      win: win,
      events: app.events,
      recommendation: app.recommendation,
      popup: app.popup
    });
    app.highlightManager.init();

    app.metrics = new app.Metrics({
      events: app.events,
      popup: app.popup,
      recommendation: app.recommendation,
      win: win,
      observerService: Cc["@mozilla.org/observer-service;1"]
                       .getService(Ci.nsIObserverService)
    });
    app.metrics.init();
  },

  _stopApp: function(win) {
    const app = win.universalSearch;

    app.popup.destroy();
    app.recommendation.destroy();
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
