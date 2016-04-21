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
  this.popupOpenObserver = null;

  // Public property used when we need to ignore a single mouseover event,
  // due to the mouse pointer being positioned over the popup when the results
  // list scrolls itself. See HighlightManager for more.
  this.ignoreNextMouseOver = false;

  this.beforePopupHide = this.beforePopupHide.bind(this);
  this.onResultsMouseOver = this.onResultsMouseOver.bind(this);
  this.onFirstPopupOpen = this.onFirstPopupOpen.bind(this);
}

Popup.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('PopupAutoCompleteRichResult');
    this.el.addEventListener('popuphiding', this.beforePopupHide);

    // The first time the popup opens, a bit of popup state is not set
    // correctly, causing no results to be shown, and causing the popup to fail
    // to appear more than once (#138). To work around this bug, listen for the
    // popup to be opened for the first time, and set the missing state.
    //
    // (The changes that introduced this bug are large (~1800 lines) and
    // complex: https://github.com/mozilla/gecko-dev/commit/ee27759c)
    //
    // Listen for the popup's first open by using a MutationObserver to detect
    // a change in the popup element's 'hidden' attribute.
    this.popupOpenObserver = new this.win.MutationObserver(this.onFirstPopupOpen);
    let observerConfig = {
      attributes: true,
      attributeFilter: ['hidden']
    };
    this.popupOpenObserver.observe(this.el, observerConfig);
  },
  destroy: function() {
    this.el.removeEventListener('popuphiding', this.beforePopupHide);

    this.win.clearTimeout(this.mouseOverTimeout);

    delete this.el;
    delete this.win;
  },
  onFirstPopupOpen: function(evt) {
    // The popup is opening for the first time. Set the missing state so that
    // it works correctly. See also the docs on the MutationObserver created
    // in the constructor.
    this.el.mInput = this.win.gURLBar;
    // The observer is only needed the first time the popup opens per window,
    // so get rid of it.
    this.popupOpenObserver.disconnect();
    this.popupOpenObserver = null;
  },
  beforePopupHide: function(evt) {
    this.events.publish('before-popup-hide');

    // Pass the event through to the XBL handler, so that this.mPopupOpen can
    // be reset to false. Otherwise, the popup won't open correctly (#138).
    // Unfortunately, we can't hand off the event to the XBL handler: it's
    // inaccessible from JS (or at least, I don't know how to get a pointer).
    // Instead, create a synthetic popuphiding event, and fire it on the DOM.
    let newEvent = new this.win.MouseEvent({
      type: 'popuphiding'
    });
    // Because we are triggering a synthetic popuphiding event from a
    // popuphiding event listener, momentarily disconnect this listener while
    // firing the event.
    this.el.removeEventListener('popuphiding', this.beforePopupHide);
    this.el.dispatchEvent(newEvent);
    this.el.addEventListener('popuphiding', this.beforePopupHide);
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
