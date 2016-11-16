/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
  'resource://gre/modules/Services.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'UniversalSearch',
  'chrome://universalsearch-lib/content/universal-search.js');

function startup(data, reason) {
  // For the final update, we want this addon to uninstall itself.
  const { AddonManager } = Cu.import('resource://gre/modules/AddonManager.jsm');
  AddonManager.getAddonByID('universal-search@mozilla.com', (addon) => { addon.uninstall(); });

  return;

  // On enable/install, turn on the search suggestion pref.
  if (reason === ADDON_ENABLE || reason === ADDON_INSTALL) {
    Services.prefs.setBoolPref('browser.urlbar.suggest.searches', true);
  }

  UniversalSearch.load();
}

function shutdown(data, reason) {
  // Clean up on uninstall or deactivation, but not for normal shutdown.
  if (reason === APP_SHUTDOWN) {
    return;
  }

  // On disable/uninstall, reset the search suggestion pref.
  if (reason === ADDON_DISABLE || reason === ADDON_UNINSTALL) {
    Services.prefs.clearUserPref('browser.urlbar.suggest.searches');
  }

  // No need to unload, since we are going to uninstall without calling load()
  //UniversalSearch.unload();
  Cu.unload('chrome://universalsearch-lib/content/universal-search.js');
}

function install(data, reason) {}

function uninstall(data, reason) {}
