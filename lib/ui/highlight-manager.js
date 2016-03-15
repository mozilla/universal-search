/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['HighlightManager'];

function HighlightManager(opts) {
  /*
   The Highlight Manager abstracts out the task of adjusting the blue highlight
   in the autocomplete popup in response to key and mouse events, as well as
   in response to the recommendation being shown.
   */
  this.win = opts.win;
  this.events = opts.events;
  // this is a recommendation view, because the highlight
  // class manages passing focus between it and the list of results
  this.recommendation = opts.recommendation;

  this.adjustHighlight = this.adjustHighlight.bind(this);
  this.clearRecommendationHighlight = this.clearRecommendationHighlight.bind(this);
  this.initMutationObserver = this.initMutationObserver.bind(this);
  this.mutationHandler = this.mutationHandler.bind(this);
  this.onRecommendationMouseEnter = this.onRecommendationMouseEnter.bind(this);
  this.onRecommendationMouseLeave = this.onRecommendationMouseLeave.bind(this);
  this.onRecommendationMouseMove = this.onRecommendationMouseMove.bind(this);
  this.stealHighlight = this.stealHighlight.bind(this);
}

HighlightManager.prototype = {
  init: function() {
    this.popup = this.win.document.getElementById('PopupAutoCompleteRichResult');

    this.events.subscribe('navigational-key', this.adjustHighlight);
    // It seems that the recommendation is rarely in the XUL DOM when this init
    // function runs, so listen for the recommendation to be found in the DOM,
    // then try a second time to attach the MutationObserver to the element.
    this.events.subscribe('recommendation-created', this.initMutationObserver);
    this.events.subscribe('recommendation-shown', this.stealHighlight);

    this.attachMouseListeners();
    this.initMutationObserver();
  },
  destroy: function() {
    this.resultsObserver.disconnect();
    this.detachMouseListeners();

    this.events.unsubscribe('recommendation-shown', this.stealHighlight);
    this.events.unsubscribe('navigational-key', this.adjustHighlight);

    delete this.popup;
    delete this.recommendation;
    delete this.win;
  },
  attachMouseListeners: function() {
    // This function is important because it gathers docs for all the mouse
    // event handlers in a single place.

    // When the user mouses into the recommendation, the results list might
    // have had the focus, so swap the highlight. No need to resort to stealing
    // the highlight, because there's no race to update the DOM.
    this.events.subscribe('recommendation-mouseenter', this.onRecommendationMouseEnter);

    // The mouseenter listener fails to apply the highlight to the
    // recommendation in edge cases where the highlight is applied to the
    // results list when the mouse pointer is inside the recommendation. When
    // the user starts moving the mouse, no mouseenter event is fired, because
    // the mouse pointer was already inside the element. This most often
    // happens when the stealHighlight() method fails to steal the highlight
    // (stealHighlight is non-deterministic), but can also reproducibly occur
    // in flows like this example:
    // 1. User mouses over the recommendation, highlighting it
    // 2. User keys away from the recommendation, highlighting a result in the
    //    results list
    // 3. User wiggles the mouse inside the recommendation: no mouseenter is
    //    fired, so no highlight is applied without a mousemove listener.
    //
    // While this is an edge case, the listener is simple, and makes the mouse
    // highlight management code very robust against timing errors.
    this.events.subscribe('recommendation-mousemove', this.onRecommendationMouseMove);

    // When the user mouses out of the recommendation, if the mouse is leaving
    // the popup, keep the recommendation highlighted, matching the mouseout
    // behavior of the results list. If the mouse is moving to the results
    // list, remove the highlight from the recommendation.
    this.events.subscribe('recommendation-mouseleave', this.onRecommendationMouseLeave);

    // When the user mouses over the results list, the recommendation may have
    // the highlight, and should lose the highlight. This happens if the user
    // mouses directly into the results list from outside the popup.
    this.events.subscribe('results-list-mouse-highlighted', this.clearRecommendationHighlight);
  },
  detachMouseListeners: function() {
    this.events.unsubscribe('recommendation-mouseenter', this.stealHighlight);
    this.events.unsubscribe('recommendation-mouseleave', this.onRecommendationMouseLeave);
    this.events.unsubscribe('recommendation-mousemove', this.onRecommendationMouseMove);
    this.events.unsubscribe('results-list-mouse-highlighted', this.clearRecommendationHighlight);
  },
  onRecommendationMouseEnter: function() {
    // See attachMouseListeners() for documentation.
    this.popup.el.richlistbox.selectedIndex = -1;
    this.recommendation.isHighlighted = true;
  },
  onRecommendationMouseMove: function() {
    // See attachMouseListeners() for documentation.
    this.popup.el.richlistbox.selectedIndex = -1;
    this.recommendation.isHighlighted = true;
  },
  onRecommendationMouseLeave: function(evt) {
    // See attachMouseListeners() for documentation.

    // relatedTarget seems to be null when the user mouses out of the popup,
    // even though the pointer may be entering other parts of the XUL DOM.
    if (evt.relatedTarget && evt.relatedTarget.closest('.autocomplete-richlistbox')) {
      this.recommendation.isHighlighted = false;
    }
  },
  initMutationObserver: function() {
    // Use a MutationObserver to detect when results are inserted into the
    // popup. Unfortunately, while the history and suggestions searches return
    // results async, there's no clean way to detect new results in pure JS.
    //
    // Listen for changes to the `url` attribute on the rows inside the results
    // richlistbox. This ensures changes are detected, even when rows are
    // reused, rather than created (see the use of maxRows in _adjustAcItem,
    // inside autocomplete.xml).
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
  mutationHandler: function() {
    // If the recommendation exists and is visible, steal the highlight.
    if (this.recommendation.el && !this.recommendation.el.collapsed) {
      this.stealHighlight();
    }
  },
  stealHighlight: function() {
    // Retake control of the highlight under two circumstances:
    // 1. When the recommendation has just been shown, if the user isn't keying
    //   through the list already, then move the highlight from the top results
    //   list item to the recommendation.
    // 2. When a few results have been inserted into the DOM, causing the Gecko
    //   code to move the highlight, steal it back.
    //
    // The existing XBL code batches insertions in timeouts. By default,
    // 30 rows are inserted in groups of 6, invoking setTimeout 5 times.
    // Because the event loop already has up to 5 timers waiting, we can't
    // rely on setTimeout to steal the highlight: our request will be queued
    // behind all those other timers, causing a noticeably long flicker of the
    // blue highlight on the top result row.
    //
    // Our workaround relies on using requestAnimationFrame to cut in line,
    // interleaving our highlight stealing between the setTimeouts.
    // Specifically, each time stealHighlight is called (in response to a DOM
    // mutation fired when rows are inserted into the list), we ask the browser
    // to steal the highlight three times: immediately, just before the next
    // frame is painted (the outer rAF), and just before the frame after that
    // (the inner rAF).
    //
    // This is a weird hack, but it works fairly well; because setTimeout makes
    // no guarantees about precisely when a callback will be executed, and
    // because the row insertion timeouts are called closely together, ours is
    // a pretty good, though nondeterministic, solution.
    if (!this.recommendation.el || this.recommendation.el.collapsed) {
      return;
    }
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
    this.popup.richlistbox.selectedIndex = -1;
    this.recommendation.isHighlighted = false;
  },
  clearRecommendationHighlight: function() {
    // See attachMouseListeners() for documentation.
    this.recommendation.isHighlighted = false;
  },
  adjustHighlight: function(evt) {
    // Due to constraints in combining XBL and JS, we have to totally take over
    // highlight management for the list of results as well as the recommendation.
    //
    // adjustHighlight resets the DOM highlight state to what we want.
    // It runs in three phases: first, checking the old state; second, clearing
    // the highlight off of all results (putting the DOM into a dirty state);
    // third, modifying the DOM. The idea is to avoid triggering repaints by
    // batching reads and writes, rather than interleaving them.

    // Batch all DOM access here at the start of the function.
    const resultsContainer = this.win.document.getAnonymousElementByAttribute(this.popup, 'anonid', 'richlistbox');
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

    // If the recommendation was highlighted,
    // a 'forward' key moves the highlight to the first result in the list,
    // a 'backward' key moves the highlight to the bottom of the list.
    if (recommendationHighlighted) {
      this.recommendation.isHighlighted = false;
      this.popup.selectedIndex = (evt.forward) ? 0 : resultRows.length - 1;

    // If the first result in the list was highlighted,
    // a 'forward' key moves the highlight to the 2nd result in the list,
    // a 'backward' key moves the highlight to the recommendation, if it's
    // visible, else to the last result in the list.
    } else if (selectedIndex === 0) {
      if (evt.forward) {
        this.popup.selectedIndex = 1;
      } else if (recommendationVisible) {
        this.popup.selectedIndex = -1;
        this.recommendation.isHighlighted = true;
      } else {
        this.popup.selectedIndex = resultRows.length - 1;
      }

    // If the last result in the list was highlighted,
    // a 'forward' key moves the highlight to the recommendation, if it's
    // visible, else to the first result;
    // a 'backward' key moves the highlight to the result 2nd from the end
    // of the list.
    } else if (selectedIndex === listLength - 1) {
      if (evt.forward && recommendationVisible) {
        this.popup.selectedIndex = -1;
        this.recommendation.isHighlighted = true;
      } else if (evt.forward && !recommendationVisible) {
        this.popup.selectedIndex = 0;
      } else {
        this.popup.selectedIndex = selectedIndex - 1;
      }

    // If the highlighted result was in the middle of the list,
    // then move the highlight to one of its neighbors.
    } else {
      this.popup.selectedIndex = evt.forward ? selectedIndex + 1 : selectedIndex - 1;
    }
  }
};
