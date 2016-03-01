/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Urlbar'];

function Urlbar(opts) {
  this.win = opts.win;
  this.events = opts.events;
  this.privateBrowsingUtils = opts.privateBrowsingUtils;
}

Urlbar.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('urlbar');
  },
  destroy: function() {
    delete this.el;
    delete this.win;
  },
  // Return `true` to prevent the existing Gecko key handler code from running.
  onKeyPress: function(evt) {
    // If the user's in private browsing mode, do nothing & hand the event
    // back to the XBL handler.
    if (this.privateBrowsingUtils.isWindowPrivate(this.win)) {
      return false;
    }

    // We want to send printable keys to the recommendation server, but
    // we also want the existing popup code to search history and fetch
    // suggestions with that keystroke.
    if (this.isPrintableKey(evt)) {
      this.handlePrintableKey(evt);
    }
    // In #43 we might want to intercept navigational keys and prevent the
    // existing code from handling them, depending on whether the
    // recommendation is shown or not.
  },
  isPrintableKey: function(evt) {
    // Criteria applied to decide if a key is printable:
    //
    // 1. Based on mdn.io/KeyboardEvent/key#Key_values, any printable key
    //    will have an event.key value of length 1, that is, just the char
    //    itself. Other keys will have longer string values, like 'Escape'.
    //
    // 2. If modifiers other than Shift are pressed, the user might be typing
    //    a shortcut key combination. So, if those are pressed, do nothing.
    return evt.key.length === 1 && !evt.ctrlKey && !evt.altKey && !evt.metaKey;
  },
  handlePrintableKey: function(evt) {
    // We receive the key event before the corresponding character has been
    // inserted into the urlbar. Rather than deal with checking the position of
    // the caret, checking to see if there is a text selection in the urlbar
    // that would be replaced by the string, and so on, we just set a timeout,
    // give the browser a turn to update the string, and send that along.
    //
    // Note also that the urlbar autocompletes strings to domains in history.
    // We don't want to send the autocompleted string (gURLBar.value), we want
    // to send the string typed by the user (gBrowser.userTypedValue).
    this.win.setTimeout(() => {
      const data = {
        query: this.win.gBrowser.userTypedValue
      };
      this.events.publish('urlbar-change', data);
    });
  },
  navigate: function(url) {
    // set some urlbar state + navigate
  }
};
