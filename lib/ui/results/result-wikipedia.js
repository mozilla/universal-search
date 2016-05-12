/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;
const EXPORTED_SYMBOLS = ['WikipediaResult'];
const IMAGE_DIMENSION = 32;

Cu.import('chrome://universalsearch-results/content/result-simple.js');


function WikipediaResult(data, opts) {
  SimpleResult.call(this, data, opts);
}
WikipediaResult.prototype = Object.create(SimpleResult.prototype);
WikipediaResult.prototype.constructor = WikipediaResult;

WikipediaResult.prototype.getData = function() {
  return {
    type: 'wikipedia',
    title: this.getTitle(),
    url: this._get('enhancements.wikipedia.url'),
    favicon: 'chrome://universalsearch-skin/content/wikipedia-dark.svg',
    image: {
      url: this._get('enhancements.wikipedia.image.url'),
      height: this.getImageHeight(),
      width: this.getImageWidth()
    }
  };
};

WikipediaResult.prototype.getImageHeight = function() {
  const height = this._get('enhancements.wikipedia.image.height');
  const width = this._get('enhancements.wikipedia.image.width');
  if (width <= height) {
    return height * IMAGE_DIMENSION / width;
  }
  return IMAGE_DIMENSION;
};

WikipediaResult.prototype.getImageWidth = function() {
  const height = this._get('enhancements.wikipedia.image.height');
  const width = this._get('enhancements.wikipedia.image.width');
  if (height < width) {
    return width * IMAGE_DIMENSION / height;
  }
  return IMAGE_DIMENSION;
};

WikipediaResult.prototype.getTitle = function() {
  let suffix = / \- Wikipedia, the free encyclopedia$/;
  return this._get('enhancements.wikipedia.title').replace(suffix, '');
};
