/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Recommendation'];

function Recommendation(opts) {
  this.win = opts.win;
  this.events = opts.events;
  this.urlbar = opts.urlbar;

  this.navigate = this.navigate.bind(this);
  this.show = this.show.bind(this);
  this.hide = this.hide.bind(this);
  this._pollForElement = this._pollForElement.bind(this);
}

Recommendation.prototype = {
  init: function() {
    // Note: there is a race between XBL modifying the XUL DOM to insert our
    // this.el, and the scripts being loaded and initialized. Rather than try
    // to fire a 'ready' event / set app state from the XBL <constructor>,
    // which is sometimes unreliable, we instead poll the XUL DOM for the el.
    this._pollForElement();

    this.events.subscribe('recommendation', this.show);
    this.events.subscribe('enter-key', this.navigate);
    this.events.subscribe('urlbar-change', this.hide);
    this.events.subscribe('before-popup-hide', this.hide);
  },
  destroy: function() {
    this.el.removeEventListener('click', this.navigate);
    this.events.unsubscribe('recommendation', this.show);
    this.events.unsubscribe('enter-key', this.navigate);
    this.events.unsubscribe('urlbar-change', this.hide);
    this.events.unsubscribe('before-popup-hide', this.hide);

    delete this.el;
    delete this.urlbar;
    delete this.win;
  },
  _pollForElement: function() {
    const el = this.win.document.getElementById('universal-search-recommendation');
    if (el) {
      this.el = el;
      this.el.addEventListener('click', this.navigate);
    } else {
      this.win.setTimeout(this._pollForElement, 20);
    }
  },
  show: function(data) {
    // assign the data to this.data
    // render using a simple inline template string
    // unset this.el.collapsed to show the el
    // fire 'recommendation-shown' event
  },
  hide: function() {
    // collapse the node
    // null out this.data
  },
  navigate: function(evt) {
    // if it's a click, we'll have a MouseEvent; if it's a right-click, bail.
    // else, we'll just have the (possibly null) data from the 'enter-key' event.
    // call this.urlbar.navigate to trigger navigation, passing in the URL.
    // TODO: or should we fire an event and keep all the modules maximally disconnected?
  }
};
