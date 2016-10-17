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
  this.popup = opts.popup;
  // this is a recommendation view, because the highlight
  // class manages passing focus between it and the list of results
  this.recommendation = opts.recommendation;

  // hasInteracted tracks whether the user has moused over the popup, or keyed
  // through the popup, since the last urlbar input (typed printable keys or
  // pasted text). If the user has not interacted with the popup, it's safe to
  // steal the highlight.
  this.hasInteracted = false;

  this.adjustHighlight = this.adjustHighlight.bind(this);
  this.onResultsListMouseMove = this.onResultsListMouseMove.bind(this);
  this.initMutationObserver = this.initMutationObserver.bind(this);
  this.onRecommendationMouseEnter = this.onRecommendationMouseEnter.bind(this);
  this.onRecommendationMouseLeave = this.onRecommendationMouseLeave.bind(this);
  this.onRecommendationMouseMove = this.onRecommendationMouseMove.bind(this);
  this.resetInteractionState = this.resetInteractionState.bind(this);
  this.onUrlbarChange = this.onUrlbarChange.bind(this);
  this.stealHighlight = this.stealHighlight.bind(this);
}

HighlightManager.prototype = {
  init: function() {
    this.events.subscribe('navigational-key', this.adjustHighlight);
    // It seems that the recommendation is rarely in the XUL DOM when this init
    // function runs, so listen for the recommendation to be found in the DOM,
    // then try a second time to attach the MutationObserver to the element.
    this.events.subscribe('recommendation-created', this.initMutationObserver);
    this.events.subscribe('recommendation-shown', this.stealHighlight);
    this.events.subscribe('urlbar-change', this.onUrlbarChange);
    this.events.subscribe('after-popup-hide', this.resetInteractionState);

    this.attachMouseListeners();
    this.initMutationObserver();
  },
  destroy: function() {
    this.resultsObserver.disconnect();
    this.detachMouseListeners();

    this.events.unsubscribe('recommendation-created', this.initMutationObserver);
    this.events.unsubscribe('recommendation-shown', this.stealHighlight);
    this.events.unsubscribe('navigational-key', this.adjustHighlight);
    this.events.unsubscribe('urlbar-change', this.onUrlbarChange);
    this.events.subscribe('after-popup-hide', this.resetInteractionState);

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
    //
    // Additionally, once the mouse moves over the results list, we do not
    // steal the highlight until the popup contents change, or until the
    // popup is closed and reopened.
    this.events.subscribe('results-list-mouse-highlighted', this.onResultsListMouseMove);
  },
  detachMouseListeners: function() {
    this.events.unsubscribe('recommendation-mouseenter', this.stealHighlight);
    this.events.unsubscribe('recommendation-mouseleave', this.onRecommendationMouseLeave);
    this.events.unsubscribe('recommendation-mousemove', this.onRecommendationMouseMove);
    this.events.unsubscribe('results-list-mouse-highlighted', this.onResultsListMouseMove);
  },
  onRecommendationMouseEnter: function() {
    // See attachMouseListeners() for documentation.
    this.hasInteracted = true;
    this.popup.el.richlistbox.selectedIndex = -1;
    this.recommendation.isHighlighted = true;
  },
  onRecommendationMouseMove: function() {
    // See attachMouseListeners() for documentation.
    this.hasInteracted = true;
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
  onResultsListMouseMove: function() {
    // See attachMouseListeners() for documentation.
    this.hasInteracted = true;
    this.recommendation.isHighlighted = false;
  },
  resetInteractionState: function() {
    // Because clearHighlight checks the `hasInteracted` state, unset it when
    // the popup closes, not when it reopens, to avoid races that could lead
    // to the highlight not being correctly stolen. See also the hasInteracted
    // docs in the constructor.
    this.hasInteracted = false;
  },
  onUrlbarChange: function() {
    // When the contents of the urlbar are updated, we need to reset the
    // interaction state, and re-steal the highlight (new results will be
    // rendered in response to the urlbar change).
    this.resetInteractionState();
    this.stealHighlight();
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
    this.resultsObserver = new this.win.MutationObserver(this.stealHighlight);
    const results = this.win.document.getAnonymousElementByAttribute(this.popup.el, 'anonid', 'richlistbox');
    const resultsObserverConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['url']
    };
    this.resultsObserver.observe(results, resultsObserverConfig);
  },
  stealHighlight: function() {
    // Current default Firefox behavior is to highlight the top 'heuristic'
    // result when the popup is first shown. For a given input string foo, the
    // heuristic result either reads, "Visit foo", if foo looks like a URL,
    // or it reads, "foo - Search with $searchProvider".
    //
    // We want to remove the highlight from the top result, so that it appears
    // that the urlbar is focused when the popup first appears.
    //
    // The Firefox autocomplete popup implementation makes stealing the
    // highlight a bit complicated:
    //
    // The existing XBL code batches insertions in timeouts. By default,
    // the code invokes setTimeout 5 times, inserting 6 rows per turn, up
    // to the default max of 30 rows.
    //
    // Because the event loop already has up to 5 timers waiting, we can't
    // rely on setTimeout to steal the highlight: our request will be queued
    // behind all those other timers, causing a noticeably long flicker of the
    // blue highlight on the top result row.
    //
    // Our workaround relies on using requestAnimationFrame to cut in line,
    // interleaving our highlight stealing between the setTimeouts.
    //
    // Specifically, each time stealHighlight is called (in response to a DOM
    // mutation fired when rows are inserted into the list), we ask the browser
    // to steal the highlight six times: immediately, just before the next
    // frame is painted (the outer rAF), and just before the next four frames
    // (the inner rAF calls).
    //
    // This is a weird hack, but it works fairly well. Because setTimeout makes
    // no guarantees about precisely when a callback will be executed, and
    // because the row insertion timeouts are called closely together, ours is
    // a pretty good, though nondeterministic, solution.
    this.clearHighlight();
    this.win.requestAnimationFrame(() => {
      this.clearHighlight();
      this.win.requestAnimationFrame(() => {
        this.clearHighlight();
        this.win.requestAnimationFrame(() => {
          this.clearHighlight();
          this.win.requestAnimationFrame(() => {
            this.clearHighlight();
            this.win.requestAnimationFrame(() => {
              this.clearHighlight();
            });
          });
        });
      });
    });
  },
  clearHighlight: function() {
    // If the user has interacted with the popup since the last urlbar input,
    // don't mess with the highlight.
    if (this.hasInteracted) {
      return;
    }
    this.popup.el.richlistbox.selectedIndex = -1;
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
    const resultsContainer = this.win.document.getAnonymousElementByAttribute(this.popup.el, 'anonid', 'richlistbox');
    const resultRows = resultsContainer.querySelectorAll('.autocomplete-richlistitem:not([collapsed])');
    const recommendationUrl = this.recommendation.el.querySelector('#universal-search-recommendation-url');
    const listLength = resultRows.length;
    const selectedIndex = this.popup.el.selectedIndex;
    const recommendationVisible = this.recommendation.el && !this.recommendation.el.collapsed;
    const recommendationHighlighted = this.recommendation.el && this.recommendation.isHighlighted;

    // Here's where we will temporarily store the state updates that we'll
    // actually make at the end:
    //
    // newIndex gives the new index that should be highlighted in the results
    // list, or -1 if the list shouldn't be highlighted.
    let newIndex;
    // newUrl is the URL of the new item. It's set in the urlbar as part of
    // the highlight update.
    let newUrl;
    // Also keep track of what we want to do next with the recommendation.
    let shouldHighlightRecommendation;

    // Clear all highlights. The DOM is now dirty and not trustworthy.
    this.clearHighlight();

    // Now, we look at the state of the recommendation and the results list,
    // and decide what should be highlighted next.

    // These utility functions abstract out the state changes, and make the
    // state transition logic more readable.
    function highlightUrlbar() {
      shouldHighlightRecommendation = false;
      newIndex = -1;
      newUrl = null;
    }

    function highlightRecommendation() {
      shouldHighlightRecommendation = true;
      newIndex = -1;
      newUrl = recommendationUrl.getAttribute('data-url');
    }

    function highlightResult(index) {
      shouldHighlightRecommendation = false;
      newIndex = index;
      newUrl = resultRows[newIndex].getAttribute('url');
    }

    function highlightFirstResult() {
      highlightResult(0);
    }

    function highlightLastResult() {
      highlightResult(resultRows.length - 1);
    }

    // If the urlbar has focus,
    // a 'forward' key moves the highlight to the recommendation, if it's
    // visible, or else the first result;
    // a 'backward' key moves the highlight to the bottom of the list.
    if (!recommendationHighlighted && selectedIndex === -1) {
      if (evt.forward) {
        recommendationVisible ? highlightRecommendation() : highlightFirstResult();
      } else {
        highlightLastResult();
      }

    // If the recommendation was highlighted,
    // a 'forward' key moves the highlight to the first result in the list,
    // a 'backward' key moves the highlight to the urlbar.
    } else if (recommendationHighlighted) {
      if (evt.forward) {
        highlightFirstResult();
      } else {
        highlightUrlbar();
      }

    // If the first result in the list was highlighted,
    // a 'forward' key moves the highlight to the 2nd result in the list,
    // a 'backward' key moves the highlight to the recommendation, if it's
    // visible, or else to the urlbar.
    } else if (selectedIndex === 0) {
      if (evt.forward) {
        highlightResult(1);
      } else {
        recommendationVisible ? highlightRecommendation() : highlightUrlbar();
      }

    // If the last result in the list was highlighted,
    // a 'forward' key moves the highlight to the urlbar, scrolling the
    // results list back to the first item,
    // a 'backward' key moves the highlight to the result 2nd from the end
    // of the list.
    //
    // It turns out that scrolling the results list (the 'forward' case)
    // causes the top result in the results list to retake the highlight, so we
    // steal it back.
    //
    } else if (selectedIndex === listLength - 1) {
      if (evt.forward) {
        this.stealHighlight();
        resultsContainer.ensureIndexIsVisible(0);
        highlightUrlbar();
      } else {
        highlightResult(selectedIndex - 1);
      }

    // If the highlighted result was in the middle of the list,
    // then move the highlight to one of its neighbors.
    } else {
      if (evt.forward) {
        highlightResult(selectedIndex + 1);
      } else {
        highlightResult(selectedIndex - 1);
      }
    }

    // Now that we've figured out which item will take the highlight,
    // update the DOM, and fire a signal that sets the newUrl in the urlbar.
    if ('setInitiallySelectedIndex' in this.popup.el.input.controller) {
      this.popup.el.input.controller.setInitiallySelectedIndex(newIndex);
    } else {
      this.popup.el.selectedIndex = newIndex;
    }
    this.recommendation.isHighlighted = shouldHighlightRecommendation;
    this.events.publish('selection-change', { newUrl: newUrl });
  }
};
