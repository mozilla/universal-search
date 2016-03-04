/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Popup'];

function Popup(opts) {
  this.win = opts.win;
  this.events = opts.events;

  this.beforePopupHide = this.beforePopupHide.bind(this);
  this.afterPopupHide = this.afterPopupHide.bind(this);
}

Popup.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('PopupAutoCompleteRichResult');
    this.el.addEventListener('popuphiding', this.beforePopupHide);
    this.el.addEventListener('popuphidden', this.afterPopupHide);
  },
  beforePopupHide: function(evt) {
    this.events.publish('before-popup-hide');
  },
  afterPopupHide: function(evt) {
    this.events.publish('after-popup-hide');
  }
};
