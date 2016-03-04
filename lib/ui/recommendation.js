/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, utils: Cu} = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'Services',
 'resource://gre/modules/Services.jsm');

const EXPORTED_SYMBOLS = ['Recommendation'];
const ELEMENTS = {
  'RECOMMENDATION': 'universal-search-recommendation',
  'CONTAINER': 'universal-search-recommendation-container',
  'FAVICON': 'universal-search-recommendation-favicon',
  'IMAGE': 'universal-search-recommendation-image',
  'LETTERBOX': 'universal-search-recommendation-letterbox',
  'CONTENT': 'universal-search-recommendation-content',
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
    let container = this.doc.createElement('hbox');
    container.setAttribute('id', ELEMENTS.CONTAINER);
    [row.renderFavicon, row.renderImage,
     row.renderContent, row.renderLabel].forEach(fn => {
      container.appendChild(fn(row));
    });
    return container;
  },

  renderContent: function(row) {
    let content = row.doc.createElement('vbox');
    content.setAttribute('id', ELEMENTS.CONTENT);
    content.appendChild(row.renderTitle(row));
    content.appendChild(row.renderUrl(row));
    return content;
  },

  renderFavicon: function(row) {
    let favicon = row.doc.createElement('image');
    favicon.setAttribute('id', ELEMENTS.FAVICON);
    favicon.setAttribute('src', 'moz-anno:favicon:http://www.mozilla.org/2005/made-up-favicon');
    return favicon;
  },

  renderImage: function(row) {
    if (row.data.enhancements.hasOwnProperty('domain')) {
      let image = row.doc.createElement('image');
      image.setAttribute('id', ELEMENTS.IMAGE);
      image.setAttribute('src', row.data.enhancements.domain.logo);
      return image;
    }
    return row.renderLetterbox(row);
  },

  _firstLetterInDomain: function(url) {
    return Services.eTLD.getBaseDomain(Services.io.newURI(url, null, null))[0];
  },

  renderLetterbox: function(row) {
    let letterbox = row.doc.createElement('hbox');
    letterbox.setAttribute('id', ELEMENTS.LETTERBOX);
    letterbox.textContent = row._firstLetterInDomain(row.data.result.url);
    return letterbox;
  },

  renderTitle: function(row) {
    let title = row.doc.createElement('hbox');
    title.setAttribute('id', ELEMENTS.TITLE);
    title.classList.add('ac-normal-text', 'ac-comment');
    title.textContent = row.data.result.title;
    return title;
  },

  renderUrl: function(row) {
    let url = row.doc.createElement('hbox');
    url.setAttribute('id', ELEMENTS.URL);
    url.classList.add('ac-normal-text', 'ac-action-text');
    url.textContent = row.data.result.url;
    return url;
  },

  renderLabel: function(row) {
    let label = row.doc.createElement('hbox');
    label.setAttribute('id', ELEMENTS.LABEL);
    label.textContent = 'Recommended';
    return label;
  }
}


function Recommendation(opts) {
  this.win = opts.win;
  this.events = opts.events;
  this.el = null;
  this.timeout = null;
  Object.defineProperty(this, 'isHighlighted', {
    get: () => {
      return this.el && this.el.classList.contains('highlight');
    },
    set: (shouldHighlight) => {
      if (!this.el) {
        return;
      }
      if (shouldHighlight) {
        this.el.classList.add('highlight');
      } else {
        this.el.classList.remove('highlight');
      }
    }
  });

  this.navigate = this.navigate.bind(this);
  this.show = this.show.bind(this);
  this.hide = this.hide.bind(this);
  this._pollForElement = this._pollForElement.bind(this);
}

Recommendation.prototype = {
  init: function() {
    // Note: the XUL DOM isn't updated to insert the
    // 'universal-search-recommendation' element until the popup is opened
    // once. So, poll for the element until it's ready, then attach listeners
    // to it.
    this._pollForElement();

    this.events.subscribe('recommendation', this.show);
    this.events.subscribe('enter-key', this.navigate);
    this.events.subscribe('urlbar-change', this.hide);
    this.events.subscribe('after-popup-hide', this.hide);
  },

  destroy: function() {
    this.el.removeEventListener('click', this.navigate);
    this.events.unsubscribe('recommendation', this.show);
    this.events.unsubscribe('enter-key', this.navigate);
    this.events.unsubscribe('urlbar-change', this.hide);
    this.events.unsubscribe('after-popup-hide', this.hide);

    delete this.el;
    delete this.win;
  },

  _pollForElement: function() {
    const el = this.win.document.getElementById(ELEMENTS.RECOMMENDATION);
    if (el) {
      this.el = el;
      this.el.addEventListener('click', this.navigate);
      this.events.publish('recommendation-created');
    } else {
      this.win.setTimeout(this._pollForElement, 75);
    }
  },

  show: function(data) {
    if (!this.el) {
      return;
    }
    if (this.timeout) {
      this.win.clearTimeout(this.timeout);
      this.timeout = null;
    }
    const recommendation = new RecommendationRow(this.win, data).render();
    if (this.el.firstChild) {
      this.el.replaceChild(recommendation, this.el.firstChild);
    } else {
      this.el.appendChild(recommendation);
    }
    this.el.collapsed = false;
    this.data = data;
    // We actually need to wait a turn for highlight adjustment to succeed,
    // assuming a flow of events like this:
    // 1. ask the DOM to render the element
    // 2. wait a turn for the UI thread to render it into the DOM
    // 3. adjust highlight once everything's in the DOM
    //
    // Because the XBL code calls setTimeout 30 times for each set of results,
    // the timeouts sometimes seem to take a long time to fire. Let's avoid
    // waiting on the overloaded event loop by using rAF, and firing the event
    // just before the next browser paint.
    //
    // TODO: should we just fire this event immediately, and let the highlight
    // manager handle all of the async UI twiddling?
    this.win.requestAnimationFrame(() => {
      this.events.publish('recommendation-shown', this);
    });
  },

  hide: function() {
    if (!this.el) {
      return;
    }
    const container = this.win.document.getElementById(ELEMENTS.CONTAINER);
    this.timeout = this.win.setTimeout(function() {
      this.el.collapsed = true;
    }.bind(this), 50);
    this.data = null;
  },

  navigate: function(evt) {
    // if it's a click, we'll have a MouseEvent; if it's a right-click, bail.
    // else, we'll just have the (possibly null) data from the 'enter-key' event.
    // fire a 'recommendation-navigate' event to trigger navigation.
    // the URL should already be set in the urlbar by the time the event is received.
  }
};
