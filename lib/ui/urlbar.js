/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Urlbar'];

function Urlbar(opts) {
  this.win = opts.win;
  this.events = opts.events;

  this.onKeyDown = this.onKeyDown.bind(this);
}

Urlbar.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('urlbar');

    this.el.addEventListener('keydown', this.onKeyDown);
  },
  destroy: function() {
    delete this.el;
    delete this.win;
  },
  onKeyDown: function(evt) {
    // check the key event:
    // if it's a printable key, fire 'printable-key'
    // if it's a navigational key, fire 'navigational-key'
    // if we don't know what to do, return true or false
  },
  navigate: function(url) {
    // set some urlbar state + navigate
  }
};
