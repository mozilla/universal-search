/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['HighlightManager'];

function HighlightManager(opts) {
  this.win = opts.win;
  this.events = opts.events;
  // this is a recommendation view, because the highlight
  // class manages passing focus between it and the list of results
  this.recommendation = opts.recommendation;
  this.stealHighlightTimeout = null;

  this.adjustHighlight = this.adjustHighlight.bind(this);
  this.stealHighlight = this.stealHighlight.bind(this);
  this.mutationHandler = this.mutationHandler.bind(this);
  this.initMutationObserver = this.initMutationObserver.bind(this);
}

HighlightManager.prototype = {
  init: function() {
    this.events.subscribe('navigational-key', this.adjustHighlight);
    // It seems that the recommendation is rarely in the XUL DOM when this init
    // function runs, so listen for the recommendation to be found in the DOM,
    // then try a second time to attach the MutationObserver to the element.
    this.events.subscribe('recommendation-created', this.initMutationObserver);
    this.events.subscribe('recommendation-shown', this.stealHighlight);

    this.popup = this.win.document.getElementById('PopupAutoCompleteRichResult');

    this.initMutationObserver();
  },
  initMutationObserver: function() {
    // The existing code doesn't insert all the results at once; instead, rows
    // are inserted after repeated timeouts, to keep the urlbar responsive (see
    // _appendResultTimeout in autocomplete.xml). Each time a row is appended,
    // the existing code reapplies the highlight to an item in the results
    // list. So, as that happens, we want to continually steal the focus back.
    // The simplest way to do this, it turns out, is with a MutationObserver.
    // We listen for changes to the `url` attribute on the rows inside the
    // richlistbox. This ensures changes are detected, even when rows are
    // reused, rather than created (see _adjustAcItem in autocomplete.xml).
    //
    // TODO: Might want to throttle the callback if performance seems slow.
    this.resultsObserver = new this.win.MutationObserver(this.mutationHandler);
    const results = this.win.document.getAnonymousElementByAttribute(this.popup, 'anonid', 'richlistbox');
    const resultsObserverConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['url']
    };
    this.resultsObserver.observe(results, resultsObserverConfig);
  },
  destroy: function() {
    this.resultsObserver.disconnect();
    this.events.unsubscribe('recommendation-shown', this.stealHighlight);
    this.events.unsubscribe('navigational-key', this.adjustHighlight);
    delete this.popup;
    delete this.recommendationView;
    delete this.win;
  },
  mutationHandler: function() {
    if (this.recommendation.el && !this.recommendation.el.collapsed) {
      this.stealHighlight();
    }
  },
  stealHighlight: function() {
    // When the recommendation has just been shown, if the default list item is
    // highlighted, steal the highlight and set it on the recommendation.
    //
    // The existing XBL code wraps each insertion in a setTimeout, so we can't
    // rely on setTimeout to steal the highlight: if 30 row rendering calls are
    // in the event loop ahead of this code, the blue highlight will very
    // noticeably flicker on the top result row. To avoid this, we steal the
    // highlight immediately, then use rAF to steal it just before the next
    // paint, then set *another* rAF inside the first rAF, preventing another
    // paint from showing a result in the list as highlighted. This seems a
    // little excessive, but actually the inner rAF seems to be the key to
    // truly minimizing the flickering as we steal the highlight.
    this.recommendation.isHighlighted = true;
    this.popup.selectedIndex = -1;
    this.win.requestAnimationFrame(() => {
      this.recommendation.isHighlighted = true;
      this.popup.selectedIndex = -1;
      this.win.requestAnimationFrame(() => {
        this.recommendation.isHighlighted = true;
        this.popup.selectedIndex = -1;
      });
    });
  },
  clearHighlight: function() {
    const resultsContainer = this.win.document.getAnonymousElementByAttribute(this.popup, 'anonid', 'richlistbox');
    const resultRows = resultsContainer.getElementsByClassName('autocomplete-richlistitem');
    Array.prototype.forEach.call(resultRows, row => { row.selected = false; });
  },
  // Due to constraints in combining XBL and JS, we have to totally take over
  // highlight management for the list of results as well as the recommendation.
  adjustHighlight: function(evt) {
    // Batch all DOM access here at the start of the function.
    const resultsContainer = this.win.document.getAnonymousElementByAttribute(this.popup, 'anonid', 'richlistbox');
    // TODO: should this be var, not const?
    const resultRows = resultsContainer.getElementsByClassName('autocomplete-richlistitem');
    // resultRows is a live collection, and the XBL code inserts elements over
    // several turns, so we'll use listLength for calculating the past state
    // of the world, but when we want to assign focus to the last item in the
    // list, we'll use the live collection.
    const listLength = resultRows.length;
    const selectedIndex = this.popup.selectedIndex;
    const recommendationVisible = this.recommendation.el && !this.recommendation.el.collapsed;
    const recommendationHighlighted = this.recommendation.el && this.recommendation.isHighlighted;

    // Clear all highlights. The DOM is now dirty and not trustworthy.
    this.clearHighlight();

    // Start by checking what's currently highlighted, and alter the state:

    // recommendation
    if (recommendationHighlighted) {
      this.recommendation.isHighlighted = false;
      this.popup.selectedIndex = (evt.forward) ? 0 : resultRows.length - 1;

    // top of the list
    } else if (selectedIndex === 0) {
      if (evt.forward) {
        this.popup.selectedIndex = 1;
      } else if (recommendationVisible) {
        this.popup.selectedIndex = -1;
        this.recommendation.isHighlighted = true;
      } else {
        this.popup.selectedIndex = resultRows.length - 1;
      }

    // bottom of the list
    } else if (selectedIndex === listLength - 1) {
      if (evt.forward && recommendationVisible) {
        this.popup.selectedIndex = -1;
        this.recommendation.isHighlighted = true;
      } else if (evt.forward && !recommendationVisible) {
        this.popup.selectedIndex = 0;
      } else {
        this.popup.selectedIndex = selectedIndex - 1;
      }

    // middle of the list
    } else {
      this.popup.selectedIndex = evt.forward ? selectedIndex + 1 : selectedIndex - 1;
    }
  }
};
