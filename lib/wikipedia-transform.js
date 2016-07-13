/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['wikipediaTransform'];

const IMAGE_DIMENSION = 32;

function WikipediaTransform() {
  /*
  Class that normalizes the wikipedia type API responses into a data object
  containing all required keys. Used by the Recommendation to generate a
  uniform data object to pass into the RecommendationRow for rendering into the
  XUL DOM.

  This class is stateless, so a singleton instance is created and exported.
  */
}
WikipediaTransform.prototype = {
  transform: function(data) {
    if (!this.isValid(data)) {
      return;
    }
    let dimensions = {};
    if (data.enhancements.wikipedia.image.height &&
        data.enhancements.wikipedia.image.width) {
      dimensions = this.calculateDimensions(data);
    }
    // NOTE: using the full keys repeatedly to aid grepping.
    let result = {
      type: 'wikipedia',
      favicon: {
        url: 'chrome://universalsearch-skin/content/wikipedia-dark.svg',
        color: data.enhancements.favicon.color
      },
      title: data.enhancements.wikipedia.title,
      url: data.enhancements.wikipedia.url,
      keyImage: {
        url: data.enhancements.wikipedia.image.url,
        height: dimensions.height,
        width: dimensions.width
      }
    };
    return result;
  },
  calculateDimensions: function(data) {
    /*
    Calculates and returns the display dimensions for the passed key image. The
    smaller side will be IMAGE_DIMENSION pixels long, while the longer side
    will be sized to maintain the original image's aspect ratio.
    */
    let height = data.enhancements.wikipedia.image.height;
    let width = data.enhancements.wikipedia.image.width;

    if (width > height) {
      return {
        width: width / height * IMAGE_DIMENSION,
        height: IMAGE_DIMENSION
      };
    }

    return {
      width: IMAGE_DIMENSION,
      height: height / width * IMAGE_DIMENSION
    };
  },
  isValid: function(data) {
    let valid = false;
    // Just try to access every required key. If one is missing, the thrown Error
    // will tell us it's an invalid data object. For optional keys, just check
    // that the parent key exists (if no other check touches the parent).
    try {
      valid = data.enhancements.favicon.color &&
              data.enhancements.wikipedia.title &&
              data.enhancements.wikipedia.url &&
              data.enhancements.wikipedia.image;
    } catch (ex) {}
    return valid;
  }
};

const wikipediaTransform = new WikipediaTransform();
