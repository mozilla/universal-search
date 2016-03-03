/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Recommendation'];
const ELEMENTS = {
  'RECOMMENDATION': 'universal-search-recommendation',
  'CONTAINER': 'universal-search-recommendation-container',
  'IMAGE': 'universal-search-recommendation-container',
  'TITLE': 'universal-search-recommendation-title',
  'URL': 'universal-search-recommendation-url',
  'LABEL': 'universal-search-recommendation-label'
};


function RecommendationRow(win, data) {
  this.win = win;
  this.doc = win.document;
  this.data = data;
}


RecommendationRow.prototype = {
  render: function() {
    let row = this;
    let container = this.doc.createElement('box');
    container.setAttribute('id', ELEMENTS.CONTAINER);
    [
      this.renderImage, this.renderTitle,
      this.renderUrl, this.renderLabel
    ].forEach(fn => {
      const content = fn(row);
      if (content) {
        container.appendChild(content);
      }
    });
    return container;
  },

  renderImage: function(row) {
    if (row.data.enhancements.hasOwnProperty('domain')) {
      let image = row.doc.createElement('image');
      image.setAttribute('id', ELEMENTS.IMAGE);
      image.setAttribute('src', row.data.enhancements.domain.logo);
      return image;
    }
    return null;
  },

  renderTitle: function(row) {
    let title = row.doc.createElement('hbox');
    title.setAttribute('id', ELEMENTS.TITLE);
    title.textContent = row.data.result.title;
    return title;
  },

  renderUrl: function(row) {
    let url = row.doc.createElement('hbox');
    url.setAttribute('id', ELEMENTS.URL);
    url.textContent = row.data.result.url;
    return url;
  },

  renderLabel: function(row) {
    let label = row.doc.createElement('hbox');
    label.setAttribute('id', ELEMENTS.LABEL);
    label.textContent = 'Recommendation';
    return label;
  }
}


function Recommendation(opts) {
  this.win = opts.win;
  this.events = opts.events;
  this.urlbar = opts.urlbar;
  this.el = null;

  this.navigate = this.navigate.bind(this);
  this.show = this.show.bind(this);
  this.hide = this.hide.bind(this);
  this._pollForElement = this._pollForElement.bind(this);
}

Recommendation.prototype = {
  init: function() {
    // Note: there is a race between XBL modifying the XUL DOM to insert our
    // this.el, and the scripts being loaded and initialized. Rather than try
    // to fire a 'ready' event / set app state from the XBL <constructor>,
    // which is sometimes unreliable, we instead poll the XUL DOM for the el.
    this._pollForElement();

    this.events.subscribe('recommendation', this.show);
    this.events.subscribe('enter-key', this.navigate);
    this.events.subscribe('urlbar-change', this.hide);
    this.events.subscribe('before-popup-hide', this.hide);
  },

  destroy: function() {
    this.el.removeEventListener('click', this.navigate);
    this.events.unsubscribe('recommendation', this.show);
    this.events.unsubscribe('enter-key', this.navigate);
    this.events.unsubscribe('urlbar-change', this.hide);
    this.events.unsubscribe('before-popup-hide', this.hide);

    delete this.el;
    delete this.urlbar;
    delete this.win;
  },

  _pollForElement: function() {
    const el = this.win.document.getElementById(ELEMENTS.RECOMMENDATION);
    if (el) {
      this.el = el;
      this.el.addEventListener('click', this.navigate);
    } else {
      this.win.setTimeout(this._pollForElement, 20);
    }
  },

  show: function(data) {
    if (this.el) {
      const recommendation = new RecommendationRow(this.win, data);
      this.el.appendChild(recommendation.render());
      this.el.collapsed = false;
      this.data = data;
      this.events.publish('recommendation-shown', this);
    } else {
      this.win.setTimeout(function() {
        this.show(data);
      }.bind(this), 20);
    }
  },

  hide: function() {
    this.el.collapsed = true;
    const container = this.win.document.getElementById(ELEMENTS.CONTAINER);
    if (container) {
      this.el.removeChild(container);
    }
    this.data = null;
  },

  navigate: function(evt) {
    // if it's a click, we'll have a MouseEvent; if it's a right-click, bail.
    // else, we'll just have the (possibly null) data from the 'enter-key' event.
    // call this.urlbar.navigate to trigger navigation, passing in the URL.
    // TODO: or should we fire an event and keep all the modules maximally disconnected?
  }
};
