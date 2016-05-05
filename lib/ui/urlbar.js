/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Urlbar'];

function Urlbar(opts) {
  /*
  The Urlbar abstracts the urlbar in the XUL DOM. It handles keystrokes in the
  urlbar, passing them along to the other modules via pubsub events if the
  key events should be handled by the add-on.
  */
  this.win = opts.win;
  this.events = opts.events;
  this.privateBrowsingUtils = opts.privateBrowsingUtils;
  this.popup = opts.popup;

  this.navigate = this.navigate.bind(this);
  this.publishUrlbarUpdate = this.publishUrlbarUpdate.bind(this);
  this.updateTextValue = this.updateTextValue.bind(this);
}

Urlbar.prototype = {
  init: function() {
    this.el = this.win.document.getElementById('urlbar');

    this.win.gURLBar.addEventListener('paste', this.publishUrlbarUpdate);

    this.events.subscribe('recommendation-navigate', this.navigate);
    this.events.subscribe('selection-change', this.updateTextValue);
  },
  destroy: function() {
    this.events.unsubscribe('recommendation-navigate', this.navigate);
    this.events.unsubscribe('selection-change', this.updateTextValue);

    this.win.gURLBar.removeEventListener('paste', this.publishUrlbarUpdate);

    delete this.el;
    delete this.win;
  },
  // Set the URL in the urlbar to data.newUrl, if it's defined;
  // otherwise, reset the URL to the actual value the user typed.
  updateTextValue: function(data) {
    this.win.gURLBar.textValue = data.newUrl || this.win.gBrowser.userTypedValue;
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
    if (this.isPrintableKey(evt) || this.isDeleteKey(evt)) {
      this.publishUrlbarUpdate(evt);
    // If the popup is closed, the up and down arrows open it, and a slightly
    // different set of items is shown. In this case, we want the existing
    // code to handle the event, so return false.
    } else if (!this.win.gURLBar.popup.popupOpen &&
              (evt.key === 'ArrowDown' || evt.key === 'ArrowUp')) {
      return false;
    // If we get a navigational key, adjust the highlight.
    } else if (this.isNavigationalKey(evt)) {
      this.handleNavigationalKey(evt);
      return true;
    // If the Enter key was pressed, fire an event for metrics purposes and
    // hand the event back to Gecko.
    } else if (this.isEnterKey(evt)) {
      this.handleEnterKey(evt);
      return false;
    }
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
  isDeleteKey: function(evt) {
    // Keys that delete code also modify the urlbar contents, so they should
    // also trigger a 'urlbar-change' event.
    return evt.key === 'Delete' || evt.key === 'Backspace';
  },
  publishUrlbarUpdate: function() {
    // This function is called when we know the urlbar contents have been
    // changed (by a printable key or a paste event), but we don't know what
    // the new urlbar contents will be. Wait a turn, so the browser can update
    // the UI, then get the updated urlbar contents and send along.
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
  _navigationalKeys: ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Tab'],
  isNavigationalKey: function(evt) {
    return this._navigationalKeys.indexOf(evt.key) > -1;
  },
  handleNavigationalKey: function(evt) {
    // preventDefault on the event, otherwise it seems up and down move two
    // steps at a time, some key handler way down in the XUL stack
    evt.preventDefault();
    const data = {
      forward: evt.key === 'ArrowDown' || evt.key === 'PageDown' || (evt.key === 'Tab' && !evt.shiftKey)
    };
    this.events.publish('navigational-key', data);
  },
  isEnterKey: function(evt) {
    return evt.key === 'Enter';
  },
  handleEnterKey: function(evt) {
    // Fire an event, alerting the metrics code to check the state of the world
    // and send an update.
    this.events.publish('before-keyboard-navigate');
  },
  navigate: function() {
    this.win.gURLBar.handleCommand(this.win.gURLBar.textValue);
  }
};
