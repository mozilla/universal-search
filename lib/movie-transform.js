/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['movieTransform'];

function MovieTransform() {
  /*
  Class that normalizes movie API responses into a data object containing all
  required keys. Used by the Recommendation to generate a uniform data object
  to pass into the RecommendationRow for rendering into the XUL DOM.

  This class is stateless, so a singleton instance is created and exported.
  */
}

MovieTransform.prototype = {
  transform: function(data) {
    if (!this.isValid(data)) {
      return;
    }
    // NOTE: using the full keys repeatedly to aid grepping.
    const result = {
      type: 'movie',
      title: data.enhancements.movie.title + ' (' + data.enhancements.movie.year + ')',
      url: data.enhancements.movie.imdb_url,
      favicon: {
        url: data.enhancements.favicon.url,
        color: data.enhancements.favicon.color
      },
      // The movie poster's dimensions are missing (recommendation-server
      // issue #144). For now, the IMDB ratio seems to be 3:2, so just roll with that.
      keyImage: {
        url: data.enhancements.movie.poster,
        height: 96,
        width: 64
      },
      details: this.generateDetails(data),
      description: data.enhancements.movie.plot
    };
    return result;
  },
  generateDetails: function(data) {
    let items = [
      'IMDB Rating ' + data.enhancements.movie.rating.imdb.raw,
      data.enhancements.movie.runtime,
      data.enhancements.movie.genre];
    return items.join(' - ');
  },
  isValid: function(data) {
    let valid = false;
    // Just try to access every required key. If one is missing, the thrown Error
    // will tell us it's an invalid data object. For optional keys, just check
    // that the parent key exists (if no other check touches the parent).
    try {
      valid = data.enhancements.movie.title &&
              data.enhancements.movie.imdb_url &&
              data.enhancements.favicon.url &&
              data.enhancements.favicon.color &&
              data.enhancements.movie.poster &&
              data.enhancements.movie.rating.imdb &&
              data.enhancements.movie.runtime &&
              data.enhancements.movie.genre;
    } catch (ex) {}
    return valid;
  }
};

const movieTransform = new MovieTransform();
