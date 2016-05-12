/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;
const EXPORTED_SYMBOLS = ['TLDResult'];

Cu.import('chrome://universalsearch-results/content/result-simple.js');


function TLDResult(data, opts) {
  SimpleResult.call(this, data, opts);
}
TLDResult.prototype = Object.create(SimpleResult.prototype);
TLDResult.prototype.constructor = TLDResult;
TLDResult.prototype.getData = function() {
  return {
    type: 'tld',
    image: {
      url: this._get('enhancements.tld'),
      height: 32,
      width: 32
    }
  };
};
