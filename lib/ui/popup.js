/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Popup'];

function Popup(opts) {
  /*
  The Popup module abstracts the XUL popup. Currently only used to listen for
  events emitted by the popup.
  */
  this.win = opts.win;
  this.events = opts.events;
  this.eTLD = opts.eTLD;
  this.io = opts.io;
  this.mouseOverTimeout = null;

  this.resultsContainer = null;

  // Public property used when we need to ignore a single mouseover event,
  // due to the mouse pointer being positioned over the popup when the results
  // list scrolls itself. See HighlightManager for more.
  this.ignoreNextMouseOver = false;

  this.beforePopupHide = this.beforePopupHide.bind(this);
  this.onResultsMouseOver = this.onResultsMouseOver.bind(this);
  this.onPopupReady = this.onPopupReady.bind(this);
}

Popup.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('PopupAutoCompleteRichResult');
    this.el.addEventListener('popuphiding', this.beforePopupHide);
    // Assign this.resultsContainer once the popup has rendered.
    this.events.subscribe('recommendation-created', this.onPopupReady);
  },
  destroy: function() {
    this.el.removeEventListener('popuphiding', this.beforePopupHide);
    this.events.unsubscribe('recommendation-created', this.onPopupReady);

    this.win.clearTimeout(this.mouseOverTimeout);

    delete this.resultsContainer;
    delete this.el;
    delete this.win;
  },
  onPopupReady: function() {
    this.events.unsubscribe('recommendation-created', this.onPopupReady);
    this.resultsContainer = this.el.richlistbox;
  },
  beforePopupHide: function(evt) {
    this.events.publish('before-popup-hide');
  },
  onResultsMouseOver: function(evt) {
    if (this.ignoreNextMouseOver) {
      this.ignoreNextMouseOver = false;
      return;
    }

    // Throttle mouseover events, which fire rapidly if the user quickly moves
    // the mouse across different DOM elements in the results list.
    if (this.mouseOverTimeout) {
      return;
    }
    this.mouseOverTimeout = this.win.setTimeout(() => {
      this.win.clearTimeout(this.mouseOverTimeout);
      this.mouseOverTimeout = null;
    }, 15);

    this.events.publish('results-list-mouse-highlighted');
  },
  domainVisible: function(recommendationUrl) {
    // The domainVisible method checks if the recommendationUrl's *domain*
    // matches the domain of at least one result in the first page of results
    // in the popup. (There can be up to 6 items shown in the popup without
    // scrolling.)
    //
    // Return true if a visible result has the same domain as the
    // recommendationUrl. Otherwise, return undefined.

    // If the popup hasn't been shown yet, there won't be results to compare
    // against.
    if (!this.resultsContainer) {
      return;
    }

    // Start by constructing a URI object from the passed-in URL.
    // If the input was malformed, bail.
    let recommendationURI;
    try {
      recommendationURI = this.io.newURI(recommendationUrl, null, null);
    } catch (ex) {
      return;
    }

    // Grab a non-live NodeList of currently-visible results. Bail if there
    // are none.
    const results = this.resultsContainer.querySelectorAll('.autocomplete-richlistitem:not([collapsed])');
    if (!results.length) {
      return;
    }

    // Only check the first page of results, which may be up to six items.
    let visibleCount = Math.min(results.length, 6);

    for (let i = 0; i < visibleCount; i++) {
      let resultURI;
      const resultUrl = results[i].getAttribute('url');
      // If the result URL is malformed or empty, move on to the next one.
      try {
        resultURI = this.io.newURI(resultUrl, null, null);
      } catch (ex) {
        continue;
      }

      // 'moz-action' URLs (switch to tab, or search suggestion) have an empty
      // string asciiHost. Don't bother trying to compare domains in this case.
      if (!resultURI.asciiHost) {
        continue;
      }

      // The eTLD service should give us a good, cheap guess at the domain.
      if (this.eTLD.getBaseDomain(resultURI) === this.eTLD.getBaseDomain(recommendationURI)) {
        return true;
      }
    }
  }
};
