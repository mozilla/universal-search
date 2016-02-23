/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['HighlightManager'];

function HighlightManager(opts) {
  this.win = opts.win;
  this.events = opts.events;
  // this is a recommendation view, because the highlight
  // class manages passing focus between it and the list of results
  this.recommendationView = opts.recommendationView;

  this.adjustHighlight = this.adjustHighlight.bind(this);
}

HighlightManager.prototype = {
  init: function() {
    this.events.subscribe('navigational-key', this.adjustHighlight);
    this.events.subscribe('recommendation-shown', this.adjustHighlight);

    this.popup = this.win.document.getElementById('PopupAutoCompleteRichResult');

    // TODO: maybe we can hook into the XBL mousemove handler and steal focus
    // that way instead of manually setting a mousemove listener
    this.popup.addEventListener('mousemove', this.adjustHighlight);
  },
  destroy: function() {
    this.popup.removeEventListener('mousemove', this.adjustHighlight);
    this.events.unsubscribe('recommendation-shown', this.adjustHighlight);
    this.events.unsubscribe('navigational-key', this.adjustHighlight);
    delete this.popup;
    delete this.recommendationView;
    delete this.win;
  },
  adjustHighlight: function(evt) {
    // if the recommendation isn't shown, do nothing: let the popup manage focus
    // otherwise,
    // check if the recommendation is shown + highlighted
    // check the selectedIndex of the popup
    // if it's a down key, move the focus downward, wrapping around if needed
    // if it's an up key, move the focus upward, wrapping around if needed
  }
};
