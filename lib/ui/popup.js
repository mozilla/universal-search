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
  this.mouseOverTimeout = null;

  // Public property used when we need to ignore a single mouseover event,
  // due to the mouse pointer being positioned over the popup when the results
  // list scrolls itself. See HighlightManager for more.
  this.ignoreNextMouseOver = false;

  this.beforePopupHide = this.beforePopupHide.bind(this);
  this.onResultsMouseOver = this.onResultsMouseOver.bind(this);
}

Popup.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('PopupAutoCompleteRichResult');
    this.el.addEventListener('popuphiding', this.beforePopupHide);
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
  }
};
