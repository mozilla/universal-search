/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');

const EXPORTED_SYMBOLS = ['WindowWatcher'];

const ww = {
  _isActive: false,

  _loadCallback: null,

  _unloadCallback: null,

  _errback: null,

  start: function(loadCallback, unloadCallback, errback, thisArg) {
    if (ww._isActive) {
      ww._onError('called start, but WindowWatcher was already running');
      return;
    }

    ww._isActive = true;
    ww._loadCallback = loadCallback;
    ww._unloadCallback = unloadCallback;
    ww._errback = errback;
    ww._thisArg = thisArg;

    const windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
      const win = windows.getNext();
      try {
        ww._loadCallback.call(ww._thisArg, win);
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
    // TODO: cleaner way to get window pointer?
    const win = e.target.ownerGlobal;
    win.removeEventListener('load', ww._onWindowLoaded, false);

    // TODO: explain why we're checking this
    if (win.location.href == 'chrome://browser/content/browser.xul') {
      ww._loadCallback.call(ww._thisArg, win);
    }
  },

  _onError: function(msg) {
    ww._errback.call(ww._thisArg, msg);
  }
};

const WindowWatcher = ww;
