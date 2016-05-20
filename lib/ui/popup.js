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
  this.mouseMoveTimeout = null;
  this.popupOpenObserver = null;

  this.afterPopupHide = this.afterPopupHide.bind(this);
  this.beforePopupShow = this.beforePopupShow.bind(this);
  this.onResultsMouseMove = this.onResultsMouseMove.bind(this);
  this.onFirstPopupOpen = this.onFirstPopupOpen.bind(this);
  this.onClick = this.onClick.bind(this);
}

Popup.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('PopupAutoCompleteRichResult');
    this.el.addEventListener('popuphidden', this.afterPopupHide);
    this.el.addEventListener('popupshowing', this.beforePopupShow);
    this.el.addEventListener('click', this.onClick);

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
    this.el.removeEventListener('popuphidden', this.afterPopupHide);
    this.el.removeEventListener('popupshowing', this.beforePopupShow);
    this.el.removeEventListener('click', this.onClick);

    this.win.clearTimeout(this.mouseMoveTimeout);

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
  afterPopupHide: function(evt) {
    this.events.publish('after-popup-hide');
  },
  beforePopupShow: function(evt) {
    this.events.publish('before-popup-show');
  },
  onResultsMouseMove: function(evt) {
    // Throttle mousemove events, which fire rapidly as the user moves
    // the mouse.
    if (this.mouseMoveTimeout) {
      return;
    }
    this.mouseMoveTimeout = this.win.setTimeout(() => {
      this.win.clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = null;
    }, 15);

    this.events.publish('results-list-mouse-highlighted');
  },
  onClick: function(evt) {
    // If it's not a left click, bail.
    if (evt.button !== 0) {
      return;
    }
    const selectedIndex = this.el.selectedIndex;
    this.events.publish('before-click-navigate', {selectedIndex: selectedIndex});
  }
};
