/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['BaseResult'];

function BaseResult(data, opts) {
  /*

  */
  this.win = opts.win;
  this.doc = opts.win.document;
  this.eTLD = opts.eTLD;
  this.io = opts.io;
  this._data = data;
  this._get = this._get.bind(this);
  this.defaultFavicon = 'chrome://mozapps/skin/places/defaultFavicon@2x.png';
}


BaseResult.prototype = {
  render: function() {
    /*
    Creates and returns an <hbox> element containing the fully-rendered
    recommendation.
    */
    this.win.universalSearch.console.error('Not implemented.');
    let result = this;
    let container = createElement('hbox', 'container');
    container.addClass(result.getType());
    result.getRenderMethods(result).forEach(method => {
      container.appendChild(method(result));
    });
    return container;
  },

  _createElement: function(elementName, id) {
    /*
    Create and return a XUL-namespaced XML element `elementName` with an optional
    id attribute, prefixed with `universal-search-recommendation-`.
    */
    const ns = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
    let elem = this.doc.createElementNS(ns, elementName);
    elem.setAttribute('id', `universal-search-recommendation-${id}`);
    return elem;
  },

  _get: function(key) {
    /*
    Attempt to return a value from the recommendation data at the passed key
    string. If not set, falsy, or an empty object, return null;
    */
    const val = key.split('.').reduce(function(o, x) {
      return (typeof o == 'undefined' || o === null) ? o : o[x];
    }, this._data);
    let isEmptyObject = function(val) {
      return typeof val == 'object' && !Object.keys(val).length;
    };
    return (typeof val == 'undefined' || !val || isEmptyObject(val)) ? null : val;
  },
};
