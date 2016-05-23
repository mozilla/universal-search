/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {utils: Cu} = Components;
Cu.import('chrome://universalsearch-results/content/result-base.js');


const COLORS = ['orange', 'lightorange', 'magenta', 'purple', 'green', 'red',
                'blue', 'teal', 'grey'];
const DEFAULT_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon@2x.png';
const EXPORTED_SYMBOLS = ['SimpleResult'];
const IMAGE_DIMENSION = 32;


function SimpleResult(data, opts) {
  /*

  */
  BaseResult.call(this, data, opts);
}
SimpleResult.prototype = Object.create(BaseResult.prototype);
SimpleResult.prototype.constructor = SimpleResult;


SimpleResult.prototype.render = function() {
  /*
  Creates and returns an <hbox> element containing the fully-rendered
  recommendation.
  */
  let container = this._createElement('hbox', 'container');
  let data = this.getData();
  container.classList.add(this.type);
  container.appendChild(this.renderFavicon(data));
  container.appendChild(this.renderImage(data));
  container.appendChild(this.renderContent(data));
  container.appendChild(this.renderLabel(data));
  return container;
};

SimpleResult.prototype.getData = function() {
  return {};
};


SimpleResult.prototype.renderFavicon = function(data) {
  /*
  Returns an <image> element pointing to the return value of getFaviconUrl.
  If that errors, use the default favicon.
  */
  let faviconWrapper = this._createElement('vbox', 'icon');
  let favicon = this._createElement('image', 'favicon');
  favicon.setAttribute('src', data.favicon || DEFAULT_FAVICON);
  favicon.onerror = function(evt) {
    favicon.setAttribute('src', DEFAULT_FAVICON);
  };
  faviconWrapper.appendChild(favicon);
  return faviconWrapper;
};

SimpleResult.prototype.renderImage = function(data) {
  /*
  Returns a <vbox> element containing an image representation of the result,
  as specified by getImageUrl. If one is not available or the specified one
  errors, render a letterbox instead.
  */
  let image = this._createElement('vbox', 'image');
  if (data.image) {
    let imageElem = this._createElement('image', 'img');
    imageElem.setAttribute('src', data.image.url);
    imageElem.setAttribute('height', data.image.height);
    imageElem.setAttribute('width', data.image.width);
    imageElem.style.height = `${data.image.height}px`;
    imageElem.style.width = `${data.image.width}px`;
    imageElem.onerror = function() {
      image.replaceChild(this.renderLetterbox(data), imageElem);
    };
    image.appendChild(imageElem);
  } else {
    image.appendChild(result.renderLetterbox(result));
    return this.renderLetterbox(data);
  }
  return image;
};

SimpleResult.prototype.renderLetterbox = function(data) {
  /*
  Creates and returns an <hbox> element containing a letterbox: a square
  containing the first letter of the base domain. If a favicon is available,
  the box's background color will be set to the favicon's dominant color with
  the foreground set to either white or black, as appropriate.
  */
  let letterbox = this._createElement('hbox', 'letterbox');
  letterbox.textContent = this._firstLetterInBaseDomain(data);
  let colors = result._getLetterboxColors(result);
  if (colors) {
    letterbox.style.backgroundColor = colors.background;
    letterbox.style.color = colors.foreground;
  } else {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    letterbox.classList.add(`color-${color}`);
  }
  return letterbox;
};

SimpleResult.prototype.renderContent = function(data) {
  /*
  Creates and returns a <vbox> element containing the recommendation's title
  and URL.
  */
  let content = this._createElement('vbox', 'content');
  content.appendChild(this.renderTitle(data));
  content.appendChild(this.renderUrl(data));
  content.style.maxWidth = `${this._getContentMaxWidth()}px`;
  return content;
};

SimpleResult.prototype.renderTitle = function(data) {
  /*
  Creates and returns an <description> element containing the
  recommendation's title.
  */
  let title = this._createElement('description', 'title');
  title.textContent = data.title || this._get('result.title');
  return title;
};

SimpleResult.prototype.renderUrl = function(data) {
  /*
  Creates and returns an <description> element containing the
  recommendation's URL.
  */
  let value = data.url || this._get('result.url');
  let url = this._createElement('description', 'url');
  url.textContent = value;
  url.setAttribute('data-url', value);
  return url;
};

SimpleResult.prototype.renderLabel = function(data) {
  /*
  Creates and returns an <hbox> element containing the "Recommended" label.
  */
  let label = this._createElement('hbox', 'label');
  label.textContent = data.label || 'Recommendation';
  return label;
};


SimpleResult.prototype._getContentMaxWidth = function() {
  /*
  This method is bad.

  It attempts to calculate the available space for the recommendation content
  (Title, URL) by subtracting a magic number from the width of the popup.

  That magic number estimates the amount of horizontal space that non-content
  elements are taking up. The calculation for that number:

    9px recommendation left padding
   16px favicon
    8px favicon right margin
   32px image/letterbox
    8px image/letterbox right margin
    8px label left margin
  100px label width (appx)
   15px recommendation right padding
  -----
  197px

  If the available space is less than 200px, we will grow the popup to ensure
  that there are at least 200px available for it.
  */
  const MIN = 200;
  const MAGIC = 197;
  const popupWidth = Math.floor(
    this.doc.getElementById('PopupAutoCompleteRichResult').width);
  const available = popupWidth - MAGIC;
  return available >= MIN ? available : MIN;
};


SimpleResult.prototype._firstLetterInBaseDomain = function(url) {
  /*
  Returns the first letter of the base domain for the passed result.
  */
  return this.eTLD.getBaseDomain(result.io.newURI(url, null, null))[0];
};

SimpleResult.prototype._getLetterboxColors = function() {
  /*
  Calculates and returns an object literal containing CSS background and
  foreground colors for the letterbox from the favicon.

  The background is determined by reading the most prominent color from the
  favicon. If the brightness of that value is greater than 75%, the
  foreground is black. Otherwise, it is white.
  */
  let color = this._get('enhancements.favicon.color');
  if (color) {
    const r = color[0];
    const g = color[1];
    const b = color[2];
    const brightness = ((r * 0.2126 + g * 0.7152 + b * 0.0722) / 255);
    return {
      'background': `rgb(${r}, ${g}, ${b})`,
      'foreground': brightness > 0.75 ? 'black' : 'white'
    };
  }
};
