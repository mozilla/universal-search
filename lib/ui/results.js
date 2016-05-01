/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['resultClasses'];

const COLORS = ['orange', 'lightorange', 'magenta', 'purple', 'green', 'red',
                'blue', 'teal', 'grey'];
const IMAGE_DIMENSION = 32;


let resultClasses = {
  tld: TLDResult,
  wikipedia: WikipediaResult
};


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

  /* =======================================================================
     The following methods CAN be overwritten by inheriting result classes.
     ======================================================================= */
  getType: function(result) {
    return 'base';
  },

  getRenderMethods: function(result) {
    return [
      result.renderFavicon,
      result.renderImage,
      result.renderContent,
      result.renderLabel
    ];
  },

  getFaviconUrl: function(result) {
    let favicon = result._get('enhancements.favicon.url');
    return favicon || this.defaultFavicon;
  },

  getImageUrl: function(result) {
    return null;
  },

  getImageHeight: function(result) {
    return IMAGE_DIMENSION;
  },

  getImageWidth: function(result) {
    return IMAGE_DIMENSION;
  },

  getTitleText: function(result) {
    return result._get('result.title');
  },

  getUrl: function(result) {
    return result._get('result.url');
  },

  getLabelText: function(result) {
    return 'Recommendation';
  },

  /* =======================================================================
     The following methods SHOULD NOT be overwritten by inheriting result
     classes.
     ======================================================================= */

  render: function() {
    /*
    Creates and returns an <hbox> element containing the fully-rendered
    recommendation.
    */
    let result = this;
    let container = createElement(result.doc, 'hbox', 'container');
    container.setAttribute('data-type', result.getType());
    result.getRenderMethods(result).forEach(method => {
      container.appendChild(method(result));
    });
    return container;
  },

  renderFavicon: function(result) {
    /*
    Returns an <image> element pointing to the return value of getFaviconUrl.
    If that errors, use the default favicon.
    */
    let faviconWrapper = createElement(result.doc, 'vbox', 'icon');
    let favicon = createElement(result.doc, 'image', 'favicon');
    favicon.setAttribute('src', result.getFaviconUrl(result));
    favicon.onerror = function(evt) {
      favicon.setAttribute('src', result.defaultFavicon);
    };
    faviconWrapper.appendChild(favicon);
    return faviconWrapper;
  },

  renderImage: function(result) {
    /*
    Returns a <vbox> element containing an image representation of the result,
    as specified by getImageUrl. If one is not available or the specified one
    errors, render a letterbox instead.
    */
    let imageUrl = result.getImageUrl(result);
    let image = createElement(result.doc, 'vbox', 'image');
    if (imageUrl) {
      let imageElem = createElement(result.doc, 'image', 'img');
      let imageHeight = result.getImageHeight(result);
      let imageWidth = result.getImageWidth(result);
      imageElem.setAttribute('src', imageUrl);
      imageElem.setAttribute('height', imageHeight);
      imageElem.setAttribute('width', imageWidth);
      imageElem.style.height = `${imageHeight}px`;
      imageElem.style.width = `${imageWidth}px`;
      imageElem.onerror = function() {
        image.replaceChild(result.renderLetterbox(result), imageElem);
      };
      image.appendChild(imageElem);
    } else {
      image.appendChild(result.renderLetterbox(result));
      return result.renderLetterbox(result);
    }
    return image;
  },

  renderLetterbox: function(result) {
    /*
    Creates and returns an <hbox> element containing a letterbox: a square
    containing the first letter of the base domain. If a favicon is available,
    the box's background color will be set to the favicon's dominant color with
    the foreground set to either white or black, as appropriate.
    */
    let letterbox = createElement(result.doc, 'hbox', 'letterbox');
    letterbox.textContent = result._firstLetterInBaseDomain(result);
    let colors = result._getLetterboxColors(result);
    if (colors) {
      letterbox.style.backgroundColor = colors.background;
      letterbox.style.color = colors.foreground;
    } else {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      letterbox.classList.add(`color-${color}`);
    }
    return letterbox;
  },

  renderContent: function(result) {
    /*
    Creates and returns a <vbox> element containing the recommendation's title
    and URL.
    */
    let content = createElement(result.doc, 'vbox', 'content');
    content.appendChild(result.renderTitle(result));
    content.appendChild(result.renderUrl(result));
    content.style.maxWidth = `${result._getContentMaxWidth(result)}px`;
    return content;
  },

  renderTitle: function(result) {
    /*
    Creates and returns an <description> element containing the
    recommendation's title.
    */
    let title = createElement(result.doc, 'description', 'title');
    title.textContent = result.getTitleText(result);
    return title;
  },

  renderUrl: function(result) {
    /*
    Creates and returns an <description> element containing the
    recommendation's URL.
    */
    let url = createElement(result.doc, 'description', 'url');
    url.textContent = result.getUrl(result);
    url.setAttribute('data-url', result.getUrl(result));
    return url;
  },

  renderLabel: function(result) {
    /*
    Creates and returns an <hbox> element containing the "Recommended" label.
    */
    let label = createElement(result.doc, 'hbox', 'label');
    label.textContent = result.getLabelText(result);
    return label;
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

  _firstLetterInBaseDomain: function(result) {
    /*
    Returns the first letter of the base domain for the passed result.
    */
    let url = result._get('result.url');
    return result.eTLD.getBaseDomain(result.io.newURI(url, null, null))[0];
  },

  _getLetterboxColors: function(result) {
    /*
    Calculates and returns an object literal containing CSS background and
    foreground colors for the letterbox from the favicon.

    The background is determined by reading the most prominent color from the
    favicon. If the brightness of that value is greater than 75%, the
    foreground is black. Otherwise, it is white.
    */
    let color = result._get('enhancements.favicon.color');
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
    return null;
  },


  _getContentMaxWidth: function(result) {
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
      result.doc.getElementById('PopupAutoCompleteRichResult').width);
    const available = popupWidth - MAGIC;
    return available >= MIN ? available : MIN;
  }
};



function TLDResult(data, opts) {
  BaseResult.call(this, data, opts);
}
TLDResult.prototype = Object.create(BaseResult.prototype);
TLDResult.prototype.constructor = TLDResult;
TLDResult.prototype.getType = function(result) {
  return 'tld';
}
TLDResult.prototype.getImageUrl = function(result) {
  return result._get('enhancements.tld');
};


function WikipediaResult(data, opts) {
  BaseResult.call(this, data, opts);
}
WikipediaResult.prototype = Object.create(BaseResult.prototype);
WikipediaResult.prototype.constructor = WikipediaResult;
WikipediaResult.prototype.getType = function(result) {
  return 'wikipedia';
}
WikipediaResult.prototype.getFaviconUrl = function(result) {
  return 'chrome://universalsearch-skin/content/wikipedia-dark.svg';
};
WikipediaResult.prototype.getImageUrl = function(result) {
  return result._get('enhancements.wikipedia.image.url');
};
WikipediaResult.prototype.getImageHeight = function(result) {
  const height = result._get('enhancements.wikipedia.image.height');
  const width = result._get('enhancements.wikipedia.image.width');
  if (width <= height) {
    return height * IMAGE_DIMENSION / width;
  }
  return IMAGE_DIMENSION;
};
WikipediaResult.prototype.getImageWidth = function(result) {
  const height = result._get('enhancements.wikipedia.image.height');
  const width = result._get('enhancements.wikipedia.image.width');
  if (height < width) {
    return width * IMAGE_DIMENSION / height;
  }
  return IMAGE_DIMENSION;
};
WikipediaResult.prototype.getUrl = function(result) {
  return result._get('enhancements.wikipedia.url');
};
WikipediaResult.prototype.getTitleText = function(result) {
  let suffix = / \- Wikipedia, the free encyclopedia$/;
  return result._get('enhancements.wikipedia.title').replace(suffix, '');
};



function createElement(doc, elementName, id) {
  /*
  Create and return a XUL-namespaced XML element `elementName` with an optional
  id attribute, prefixed with `universal-search-recommendation-`.
  */
  const ns = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
  let elem = doc.createElementNS(ns, elementName);
  elem.setAttribute('id', `universal-search-recommendation-${id}`);
  return elem;
}
