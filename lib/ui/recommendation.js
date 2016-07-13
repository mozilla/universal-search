/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Recommendation'];
const RECOMMENDATION_ID = 'universal-search-recommendation';
// borrowed from urlbarBindings.xml, _parseActionUrl method
const MOZ_ACTION_REGEX = /^moz-action:([^,]+),(.*)$/;

const Ci = Components.interfaces;

function Recommendation(opts) {
  /*
  The Recommendation module manages the XUL UI for the server recommendation.
  */
  this.win = opts.win;
  this.events = opts.events;
  this.eTLD = opts.eTLD;
  this.io = opts.io;
  this.objectUtils = opts.objectUtils;
  this.RecommendationRow = opts.RecommendationRow;
  this.transforms = {
    tld: opts.tldTransform,
    wikipedia: opts.wikipediaTransform,
    movie: opts.movieTransform
  };

  this.el = null;
  this.timeout = null;
  this.mouseMoveTimeout = null;
  // this.rawData is the raw response data from the server.
  this.rawData = null;
  // this.data is the data after its type is inferred and it is transformed.
  this.data = null;
  this.row = null;
  this.searchResults = null;
  this.searchController = null;

  Object.defineProperty(this, 'isHighlighted', {
    get: () => {
      return this.el && this.el.classList.contains('highlight');
    },
    set: (shouldHighlight) => {
      if (!this.el) {
        return;
      }
      if (shouldHighlight) {
        this.el.classList.add('highlight');
      } else {
        this.el.classList.remove('highlight');
      }
    }
  });

  this.navigate = this.navigate.bind(this);
  this.show = this.show.bind(this);
  this.onData = this.onData.bind(this);
  this.hide = this.hide.bind(this);
  this._hide = this._hide.bind(this);
  this._pollForElement = this._pollForElement.bind(this);
  this.pollController = this.pollController.bind(this);
  this._controllerCheck = this._controllerCheck.bind(this);
  this.onMouseEnter = this.onMouseEnter.bind(this);
  this.onMouseMove = this.onMouseMove.bind(this);
  this.onMouseLeave = this.onMouseLeave.bind(this);
}

Recommendation.prototype = {
  init: function() {
    // Note: the XUL DOM isn't updated to insert the
    // 'universal-search-recommendation' element until the popup is opened
    // once. So, poll for the element until it's ready, then attach listeners
    // to it, and notify the HighlightManager that the recommendation has
    // been created.
    this._pollForElement(() => {
      this.attachListeners();
      this.events.publish('recommendation-created');
    });

    // When the server returns recommendation data, store it, then
    // optimistically trigger the duplicate check.
    this.events.subscribe('recommendation', this.onData);

    // When the urlbar changes, poll the C++ controller for results, then
    // optimistically trigger the duplicate check.
    this.events.subscribe('urlbar-change', this.pollController);

    // When the urlbar changes, the recommendation becomes stale, so hide it.
    this.events.subscribe('urlbar-change', this.hide);

    // When the popup is about to close, hide the recommendation.
    this.events.subscribe('after-popup-hide', this.hide);

    this.searchController = Components.classes["@mozilla.org/autocomplete/controller;1"].
                getService(Components.interfaces.nsIAutoCompleteController);
  },
  attachListeners: function() {
    // When the recommendation is clicked, set some state in the urlbar, then
    // trigger a navigation.
    this.el.addEventListener('click', this.navigate);

    // Relay mouseenter, mouseleave, and mousemove events to the
    // HighlightManager, so it can adjust the location of the highlight.
    // Note that mousemove events are throttled to fire at most every 30 ms.
    this.el.addEventListener('mousemove', this.onMouseMove);
    this.el.addEventListener('mouseenter', this.onMouseEnter);
    this.el.addEventListener('mouseleave', this.onMouseLeave);
  },
  detachListeners: function() {
    // The add-on may be uninstalled or disabled before the popup is ever
    // opened, so check that `this.el` exists before trying to detach
    // event listeners.
    if (this.el) {
      this.el.removeEventListener('click', this.navigate);
      this.el.removeEventListener('mouseenter', this.onMouseEnter);
      this.el.removeEventListener('mousemove', this.onMouseMove);
      this.el.removeEventListener('mouseleave', this.onMouseLeave);
    }
  },
  destroy: function() {
    this.detachListeners();
    this.events.unsubscribe('recommendation', this.show);
    this.events.unsubscribe('urlbar-change', this.hide);
    this.events.unsubscribe('urlbar-change', this.pollController);
    this.events.unsubscribe('after-popup-hide', this.hide);

    this.win.clearTimeout(this.mouseMoveTimeout);

    delete this.searchController;
    delete this.el;
    delete this.win;
  },
  _pollForElement: function(cb) {
    const el = this.win.document.getElementById(RECOMMENDATION_ID);
    if (el) {
      this.el = el;
      cb();
    } else {
      this.win.setTimeout(() => { this._pollForElement(cb) }, 75);
    }
  },
  onMouseEnter: function(evt) {
    this.events.publish('recommendation-mouseenter', evt);
  },
  onMouseLeave: function(evt) {
    this.events.publish('recommendation-mouseleave', evt);
  },
  onMouseMove: function(evt) {
    // Throttle mousemove events so they fire immediately, then no more often
    // than every 30 ms (may be longer than 30 ms due to event loop delays).
    if (this.mouseMoveTimeout) {
      return;
    }
    this.mouseMoveTimeout = this.win.setTimeout(() => {
      this.win.clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = null;
    }, 30);

    this.events.publish('recommendation-mousemove', evt);
  },
  show: function(data) {
    if (this.timeout) {
      this.win.console.log('show clearing timeout');
      this.win.clearTimeout(this.timeout);
      this.timeout = null;
    }

    // If the recommendation container element hasn't been found in the XUL DOM
    // yet, give up. See this._pollForElement() for more docs.
    if (!this.el) {
      return;
    }

    this.win.console.log('about to dupe check inside show().');

    // Reuse the recommendation if it's still in the DOM and the content hasn't
    // changed since the previous recommendation.
    if (this.el.firstChild && data && this.row &&
        this.row.url === data.url) {
      this.el.collapsed = false;
      this.events.publish('recommendation-shown', this);
      this.win.console.log('show found a dupe in the DOM, bailing.');
      return;
    }

    this.data = data;

    this.win.console.log('not a dupe. this.row.url is',this.row && this.row.url,', and data.url is ',data.url);
    this.row = new this.RecommendationRow(this.data, {
      eTLD: this.eTLD,
      io: this.io,
      win: this.win
    });
    this.row.render();

    if (this.el.firstChild) {
      this.el.replaceChild(this.row.el, this.el.firstChild);
    } else {
      this.el.appendChild(this.row.el);
    }
    this.el.collapsed = false;

    this.events.publish('recommendation-shown', this);
  },
  getResultType: function(data) {
    /*
    getResultType contains the rules used to decide if a given data packet
    should be shown as a TLD, movie, or Wikipedia recommendation type.
    */
    let type;
    if ('tld' in data.enhancements) {
      type = 'tld';
    } else if ('movie' in data.enhancements) {
      type = 'movie';
    } else {
      type = 'wikipedia';
    }
    return type;
  },
  // Hide the recommendation after a timeout.
  // Hide immediately if isImmediate is `true`.
  hide: function(isImmediate) {
    this.win.console.log('hide: ', Date.now());
    this.searchResults = null;
    this.data = null;
    this.rawData = null;

    if (!this.el) {
      return;
    }
    if (isImmediate === true) {
      this.win.console.log('hide immediate');
      this._hide();
    } else {
      this.win.console.log('hide after 100 msec');
      this.timeout = this.win.setTimeout(this._hide, 100);
    }
  },
  _hide: function() {
    this.win.console.log('_hide: ', Date.now());
    this.el.collapsed = true;
    this.win.clearTimeout(this.timeout);
    this.timeout = null;
    // We can't save the recommendation in the XUL DOM, because its layout
    // isn't updated when it's reshown, and the window may have been resized.
    // This is a workaround, but not quite a fix, for #241.
    if (this.el.firstChild) {
      this.el.removeChild(this.el.firstChild);
    }
  },
  navigate: function(evt) {
    // Only navigate if it's a left click.
    if (evt.button !== 0) {
      return;
    }

    // Unfortunately, because the urlbar state isn't set by mousing over an
    // item, we have to set the urlbar state, then ask it to navigate.
    // Set state by faking a selection event...
    const urlEl = this.el.querySelector('#universal-search-recommendation-url');
    const url = urlEl.getAttribute('data-url');
    this.events.publish('selection-change', {newUrl: url});
    // ...then, after a turn, fire a 'recommendation-navigate' event to trigger
    // navigation.
    this.win.setTimeout(() => {
      this.events.publish('recommendation-navigate');
    });
  },
  onData: function(data) {
    this.rawData = data;

    this.duplicateCheck();
  },
  pollController: function() {
    if (this.isPollingController) {
      return;
    }
    this.isPollingController = true;

    this._controllerCheck();
  },
  _controllerCheck: function() {
    if (this.searchController.searchStatus == Ci.nsIAutoCompleteController.STATUS_COMPLETE_MATCH) {
      this.isPollingController = false;

      // We only care about duplicates on the first page of results.
      // Current max is 10 per page across all channels of Firefox.
      let firstPage = 10;
      let results = [];
      for (let i = 0; i < firstPage; i++) {
        let value = this.searchController.getValueAt(i);
        if (value) {
          results.push(value);
        }
      }
      this.searchResults = results;

      this.duplicateCheck();
    } else if (this.searchController.searchStatus == Ci.nsIAutoCompleteController.STATUS_COMPLETE_NO_MATCH ||
               this.searchController.searchStatus == Ci.nsIAutoCompleteController.STATUS_NONE) {
      this.isPollingController = false;
    } else { /* this.searchController.searchStatus == Ci.nsIAutoCompleteController.STATUS_SEARCHING */
      this.win.setTimeout(() => { this._controllerCheck() });
    }
  },
  duplicateCheck: function() {
    // Given recommendation and results data, check if the recommendation
    // duplicates one of the results, using nsIURI as a quick, easy way to
    // normalize and compare URLs.
    //
    // If there's no duplicate, call this.show() to render the recommendation.
    // Otherwise, return and nothing will be shown.
    //
    // Comparison rules:
    // a wikipedia or movie recommendation is a duplicate if a result has the
    // same URL;
    // a top-level domain recommendation is a duplicate if any result is a page
    // from that domain (we only want to show new domains).
    if (!this.searchResults || !this.rawData) {
      return;
    }

    let type = this.getResultType(this.rawData);
    let data = this.transforms[type].transform(this.rawData);
    // If the data was malformed, immediately hide any existing recommendation.
    if (!data) {
      this.win.console.log('no data returned by transform, hiding immediately');
      this.hide(true);
      return;
    }

    let isDuplicate = false;

    let recommendationUri;
    try {
      // newURI throws if the recommendation URL is malformed.
      recommendationUri = this.io.newURI(data.url, null, null);
    } catch (ex) {
      return;
    }

    for (let i = 0; i < this.searchResults.length; i++) {
      let result = this.searchResults[i];
      let resultUri;

      // Sometimes the top heuristic result will just be a bare domain, lacking
      // the scheme ("http" or "https") and '://' part. The nsIURI constructor
      // will throw without the scheme, so we must prepend either 'http://' or
      // 'https://'. Wikipedia uses https, and we do exact matching on
      // wikipedia recommendations when checking for duplicates, while for TLD
      // recommendations, we compare base domains, ignoring the scheme.
      // Therefore, we prepend 'https://' if `result` lacks a scheme.
      //
      // It's important to look at the start of the result URL because
      // moz-action URLs contain a URL, but not at the start of the string,
      // and our moz-action handling code (further down) would be broken if
      // 'https://' were prepended.
      if (result.indexOf('http') !== 0) {
        result = 'https://' + result;
      }

      try {
        resultUri = this.io.newURI(result, null, null);
      } catch (ex) {
        continue;
      }

      // If the result is a moz-action URL, we might need to either replace
      // the resultUri, if the moz-action contains a URL inside it; or bail
      // on the current result, if the moz-action doesn't contain a URL.
      if (this._isMozAction(resultUri)) {
        resultUri = this._replaceMozAction(resultUri);
        if (!resultUri) {
          continue;
        }
      }

      // Finally, check for duplicates.
      // For TLD results, the eTLD service should give us a good, cheap guess
      // at the domain.
      // For movie or wikipedia results, use nsIURI.equals() to check for URL
      // equality.
      // If a duplicate is found, immediately exit.
      if (data.type === 'tld' && this.eTLD.getBaseDomain(resultUri) === this.eTLD.getBaseDomain(recommendationUri) ||
         (data.type === 'wikipedia' || data.type === 'movie') && resultUri.equals(recommendationUri)) {
        return;
      }
    }

    this.show(data);
  },
  _isMozAction: function(/* nsIURI */ uri) {
    return MOZ_ACTION_REGEX.test(uri.asciiSpec);
  },
  _replaceMozAction: function(/* nsIURI */ result) {
    // To avoid showing duplicates in the case of special moz-action URLs,
    // convert those that contain URLs (switchtab, remotetab, or visiturl)
    // to plain URLs for comparison.
    //
    // Returns a falsy value if the moz-action lacks URLs (searchengine,
    // keyword), or if exceptions are thrown when trying to parse the URL
    // or convert it into an nsIURI object.
    //
    // Example moz-action result:
    // moz-action:switchtab,{"url":"https%3A%2F%2Fwww.youtube.com%2F"}

    let [, mozActionType, mozActionResult] = result.asciiSpec.match(MOZ_ACTION_REGEX);
    let wrappedUrl;
    let newResult;

    if (['switchtab', 'remotetab', 'visiturl'].indexOf(mozActionType) > -1) {
      try {
        wrappedUrl = JSON.parse(mozActionResult);
      } catch(ex) {
        return;
      }

      let unescapedUrl = this.win.unescape(wrappedUrl.url);

      try {
        newResult = this.io.newURI(unescapedUrl, null, null);
      } catch (ex) {}
    }

    return newResult;
  }
};
