/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');

const EXPORTED_SYMBOLS = ['WindowWatcher'];

/*
The WindowWatcher is a helper object that iterates over open browser windows
and fires a callback, allowing code to be loaded into each window. It also
listens for the creation of new windows, and fires a callback when the new
window is loaded.

Most of the contents are boilerplate copied from the MDN docs for the
WindowManager and WindowWatcher XPCOM services.

The WindowWatcher is used by the main UniversalSearch module to manage the
add-on lifecycle.
*/

const ww = {
  _isActive: false,

  _loadCallback: null,

  _unloadCallback: null,

  _errback: null,


  // It is expected that loadCallback, unloadCallback, and errback are bound
  // to a `this` value.
  start: function(loadCallback, unloadCallback, errback) {
    if (ww._isActive) {
      ww._onError('called start, but WindowWatcher was already running');
      return;
    }

    ww._isActive = true;
    ww._loadCallback = loadCallback;
    ww._unloadCallback = unloadCallback;
    ww._errback = errback;

    const windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
      const win = windows.getNext();
      try {
        ww._loadCallback(win);
      } catch (ex) {
        ww._onError('WindowWatcher code loading callback failed: ', ex);
      }
    }

    Services.ww.registerNotification(ww._onWindowOpened);
  },

  stop: function() {
    if (!ww._isActive) {
      ww._onError('called stop, but WindowWatcher was already stopped');
      return;
    }

    const windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
      const win = windows.getNext();
      try {
        ww._unloadCallback(win);
      } catch (ex) {
        ww._onError('WindowWatcher code unloading callback failed: ', ex);
      }
    }

    Services.ww.unregisterNotification(ww._onWindowOpened);

    ww._loadCallback = null;
    ww._unloadCallback = null;
    ww._errback = null;
    ww._isActive = false;
  },

  _onWindowOpened: function(win, topic) {
    if (topic == 'domwindowopened') {
      win.addEventListener('load', ww._onWindowLoaded, false);
    }
  },

  _onWindowLoaded: function(e) {
    // TODO: This is a way to get a pointer to the window. There may be
    // better approaches.
    const win = e.target.ownerGlobal;
    win.removeEventListener('load', ww._onWindowLoaded, false);

    // This is a way of checking if the just loaded window is a DOMWindow.
    // We don't want to load our code into other types of windows.
    // There may be cleaner / more reliable approaches.
    if (win.location.href == 'chrome://browser/content/browser.xul') {
      ww._loadCallback(win);
    }
  },

  _onError: function(msg) {
    ww._errback(msg);
  }
};

const WindowWatcher = ww;
