/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['tldTransform'];

const IMAGE_DIMENSION = 32;

function TLDTransform() {
  /*
  Class that normalizes the top-level domain type API responses into a data
  object containing all required keys. Used by the Recommendation to generate a
  uniform data object to pass into the RecommendationRow for rendering into the
  XUL DOM.

  This class is stateless, so a singleton instance is created and exported.
  */
}
TLDTransform.prototype = {
  transform: function(data) {
    if (!this.isValid(data)) {
      return;
    }
    // NOTE: using the full keys repeatedly to aid grepping.
    let result = {
      type: 'tld',
      title: data.result.title,
      url: data.result.url,
      favicon: {
        url: data.enhancements.favicon.url || 'chrome://mozapps/skin/places/defaultFavicon@2x.png',
        color: data.enhancements.favicon.color
      },
      keyImage: {
        url: `${data.enhancements.tld}?size=${IMAGE_DIMENSION * 2}`,
        height: IMAGE_DIMENSION,
        width: IMAGE_DIMENSION
      }
    };
    return result;
  },
  isValid: function(data) {
    let valid = false;
    // Just try to access every required key. If one is missing, the thrown Error
    // will tell us it's an invalid data object. For optional keys, just check
    // that the parent key exists (if no other check touches the parent).
    try {
      valid = data.result.title &&
                data.result.url &&
                data.enhancements.favicon.color &&
                data.enhancements.tld;
    } catch (ex) {}
    return valid;
  }
};

const tldTransform = new TLDTransform();
