/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['RecommendationRow'];

const COLORS = ['orange', 'lightorange', 'magenta', 'purple', 'green', 'red',
                'blue', 'teal', 'grey'];

const DEFAULT_IMAGE_SIZE = 64;

function RecommendationRow(data, opts) {
  /*
  The RecommendationRow is a helper class that contains verbose DOM creation
  methods used to create the element managed by the Recommendation module.
  */
  this.win = opts.win;
  this.doc = opts.win.document;
  this.eTLD = opts.eTLD;
  this.io = opts.io;
  this._data = data;
  this.resultType = this._data.type;
  this.url = this._unescape(this._data.url);
  this.el = null;
}


RecommendationRow.prototype = {
  render: function() {
    /*
    Creates and returns an <hbox> element containing the fully-rendered
    recommendation.
    */
    let row = this;

    if (!this.resultType) {
      return;
    }

    let renderMethods = [
      row.renderFavicon,
      row.renderImage,
      row.renderContent
    ];
    this.el = createElement(this.doc, 'hbox', 'container');
    this.el.setAttribute('data-result-type', row.resultType);
    this.el.classList.add(row.resultType);
    renderMethods.forEach(method => {
      this.el.appendChild(method(row));
    });

    return this.el;
  },

  renderFavicon: function(row) {
    /*
    Creates and returns an <image> element representing the favicon. If none is
    available, or if the URL returned from the server errors, will use
    Firefox's default favicon.
    */
    let favicon = row._data.favicon.url;
    let wrapper = createElement(row.doc, 'vbox', 'icon');
    let elem = createElement(row.doc, 'image', 'favicon');
    wrapper.appendChild(elem);
    elem.setAttribute('src', favicon);

    row.win.fetch(favicon, {
      mode: 'no-cors'
    }).then((response) => {
      response.blob().then(imgBlob => {
        let imgUrl = row.win.URL.createObjectURL(imgBlob);
        elem.setAttribute('src', imgUrl);
      });
    }, (err) => {
      elem.setAttribute('src', defaultFavicon);
    });

    // Note that we return the element before its 'src' is set.
    return wrapper;
  },

  renderImage: function(row) {
    /*
    Creates and returns a <vbox> element containing an image-type
    representation of the recommendation. Render a key image, if available;
    otherwise, use a letterbox.
    */
    let elem = createElement(row.doc, 'vbox', 'image');
    if (row._data.keyImage.url) {
      // Note: the *container* element's height/width are set by renderKeyImage.
      elem.appendChild(row.renderKeyImage(row, elem, row._data.keyImage));
      return elem;
    }
    return row.renderLetterbox(row);
  },

  renderKeyImage: function(row, parentElem, keyImage) {
    /*
    Creates and returns an <image> element containing a key image for the
    recommendation. If loading the image errors, render a letterbox in its
    place.
    */
    let elem = createElement(row.doc, 'image', 'keyimage');

    elem.setAttribute('height', keyImage.height);
    elem.style.height = `${keyImage.height}px`;
    elem.setAttribute('width', keyImage.width);
    elem.style.width = `${keyImage.width}px`;

    // Note: in both the resolve() and reject() callbacks, elem.parentNode
    // is assumed to exist. This is correct, because `elem` is returned and
    // appended to the XUL DOM before the promise resolves.
    row.win.fetch(keyImage.url, {
      mode: 'no-cors'
    }).then((response) => {
      response.blob().then(imgBlob => {
        let keyImageBlobUrl = row.win.URL.createObjectURL(imgBlob);
        elem.setAttribute('src', keyImageBlobUrl);
        elem.parentNode.style.height = `${keyImage.height}px`;
        elem.parentNode.style.width = `${keyImage.width}px`;
      });
    }, (err) => {
      elem.parentNode.replaceChild(row.renderLetterbox(row), elem);
      elem.parentNode.style.height = `${DEFAULT_IMAGE_SIZE}px`;
      elem.parentNode.style.width = `${DEFAULT_IMAGE_SIZE}px`;
    });

    // Note that we return the element before its 'src' is set.
    return elem;
  },

  renderLetterbox: function(row) {
    /*
    Creates and returns an <hbox> element containing a letterbox: a square
    containing the first letter of the base domain. If a favicon is available,
    the box's background color will be set to the favicon's dominant color with
    the foreground set to either white or black, as appropriate.
    */
    let elem = createElement(row.doc, 'hbox', 'letterbox');
    elem.textContent = row._firstLetterInBaseDomain(row);
    let colors = row._getLetterboxColors(row);
    if (colors) {
      elem.style.backgroundColor = colors.background;
      elem.style.color = colors.foreground;
    } else {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      elem.classList.add(`color-${color}`);
    }
    return elem;
  },

  renderContent: function(row) {
    /*
    Creates and returns three <hbox> elements containing:
    - the title and the 'Recommended' label (so that description text flows
      uninterruptedly beneath both)
    - the details/description (if any)
    - the url
    */
    let elem = createElement(row.doc, 'vbox', 'content');

    let topRow = createElement(row.doc, 'hbox', 'top-content');
    topRow.appendChild(row.renderTitle(row));
    topRow.style.width = '100%';

    let spacer = createElement(row.doc, 'spacer', 'spacer');
    spacer.setAttribute('flex', 1);
    topRow.appendChild(spacer);

    topRow.appendChild(row.renderRecommendedLabel(row));
    elem.appendChild(topRow);

    if (row._data.details) {
      elem.appendChild(row.renderDetails(row));
    }
    if (row._data.description) {
      elem.appendChild(row.renderDescription(row));
    }

    elem.appendChild(row.renderUrl(row));

    elem.style.maxWidth = `${row._getContentMaxWidth(row)}px`;
    return elem;
  },

  renderTitle: function(row) {
    /*
    Creates and returns a <label> element containing the
    recommendation's title.
    */
    let elem = createElement(row.doc, 'label', 'title');
    // Use value attribute, not textContent, to avoid wrapping.
    elem.setAttribute('value', row._unescape(row._data.title));
    return elem;
  },

  renderDetails: function(row) {
    /*
    Creates and returns a <description> element containing details about
    the recommended URL.
    */
    let elem = createElement(row.doc, 'description', 'details');
    elem.textContent = row._unescape(row._data.details);
    return elem;
  },

  renderDescription: function(row) {
    /*
    Creates and returns a <description> element containing a paragraph-length
    description of the recommendation.
    */
    let elem = createElement(row.doc, 'description', 'description');
    elem.textContent = row._unescape(row._data.description);
    return elem;
  },

  renderUrl: function(row) {
    /*
    Creates and returns a <label> element containing the
    recommendation's URL.
    */
    let elem = createElement(row.doc, 'label', 'url');
    let url = row._unescape(row._data.url);
    elem.setAttribute('value', url);
    elem.setAttribute('data-url', url);
    return elem;
  },

  renderRecommendedLabel: function(row) {
    /*
    Creates and returns an <hbox> element containing the "Recommended" label.
    */
    let elem = createElement(row.doc, 'label', 'label');
    // Set the text as value attribute, not textContent, to avoid wrapping.
    elem.setAttribute('value', 'Recommended');
    return elem;
  },

  _firstLetterInBaseDomain: function(row) {
    /*
    Returns the first letter of the base domain for the passed row.
    */
    let url = row._data.url;
    let firstLetter;
    try {
      firstLetter = row.eTLD.getBaseDomain(row.io.newURI(url, null, null))[0];
    } catch (ex) {}
    return firstLetter;
  },

  _getLetterboxColors: function(row) {
    /*
    Calculates and returns an object literal containing CSS background and
    foreground colors for the letterbox from the favicon.

    The background is determined by reading the most prominent color from the
    favicon. If the brightness of that value is greater than 75%, the
    foreground is black. Otherwise, it is white.
    */
    let color = row._data.favicon.color;
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
  },

  _getContentMaxWidth: function(row) {
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
    const MAGIC = 107;
    const popupWidth = Math.floor(
      row.doc.getElementById('PopupAutoCompleteRichResult').width);
    const available = popupWidth - MAGIC;
    return available >= MIN ? available : MIN;
  },

  _unescape: function(txt) {
    /*
    Uses the DOMParser to safely unescape HTML entities.
    */
    let doc = new this.win.DOMParser().parseFromString(txt, 'text/html');
    return doc.documentElement.textContent;
  }
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
