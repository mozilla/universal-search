/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Recommendation'];
const RECOMMENDATION_ID = 'universal-search-recommendation';

function Recommendation(opts) {
  /*
  The Recommendation module manages the XUL UI for the server recommendation.
  */
  this.win = opts.win;
  this.events = opts.events;
  this.eTLD = opts.eTLD;
  this.io = opts.io;
  this.objectUtils = opts.objectUtils;
  this.RecommendationRow = opts.RecommendationRow;

  this.el = null;
  this.timeout = null;
  this.mouseMoveTimeout = null;
  this.prev = null;
  this.row = null;

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
  this.onMouseEnter = this.onMouseEnter.bind(this);
  this.onMouseMove = this.onMouseMove.bind(this);
  this.onMouseLeave = this.onMouseLeave.bind(this);
}

Recommendation.prototype = {
  init: function() {
    // Note: the XUL DOM isn't updated to insert the
    // 'universal-search-recommendation' element until the popup is opened
    // once. So, poll for the element until it's ready, then attach listeners
    // to it, and notify the HighlightManager that the recommendation has
    // been created.
    this._pollForElement(() => {
      this.attachListeners();
      this.events.publish('recommendation-created');
    });

    this.events.subscribe('recommendation', this.show);
    this.events.subscribe('enter-key', this.navigate);
    this.events.subscribe('urlbar-change', this.hide);
    this.events.subscribe('before-popup-hide', this.hide);
  },
  attachListeners: function() {
    this.el.addEventListener('click', this.navigate);
    this.el.addEventListener('mouseenter', this.onMouseEnter);
    this.el.addEventListener('mousemove', this.onMouseMove);
    this.el.addEventListener('mouseleave', this.onMouseLeave);
  },
  detachListeners: function() {
    // The add-on may be uninstalled or disabled before the popup is ever
    // opened, so check that `this.el` exists before trying to detach
    // event listeners.
    if (this.el) {
      this.el.removeEventListener('click', this.navigate);
      this.el.removeEventListener('mouseenter', this.onMouseEnter);
      this.el.removeEventListener('mousemove', this.onMouseMove);
      this.el.removeEventListener('mouseleave', this.onMouseLeave);
    }
  },
  destroy: function() {
    this.detachListeners();
    this.events.unsubscribe('recommendation', this.show);
    this.events.unsubscribe('enter-key', this.navigate);
    this.events.unsubscribe('urlbar-change', this.hide);
    this.events.unsubscribe('before-popup-hide', this.hide);

    this.win.clearTimeout(this.mouseMoveTimeout);

    delete this.el;
    delete this.win;
  },
  _pollForElement: function(cb) {
    const el = this.win.document.getElementById(RECOMMENDATION_ID);
    if (el) {
      this.el = el;
      cb();
    } else {
      this.win.setTimeout(() => { this._pollForElement(cb) }, 75);
    }
  },
  onMouseEnter: function(evt) {
    this.events.publish('recommendation-mouseenter', evt);
  },
  onMouseLeave: function(evt) {
    this.events.publish('recommendation-mouseleave', evt);
  },
  onMouseMove: function(evt) {

    // Throttle mousemove events so they fire immediately, then no more often
    // than every 30 ms (may be longer than 30 ms due to event loop delays).
    if (this.mouseMoveTimeout) {
      return;
    }
    this.mouseMoveTimeout = this.win.setTimeout(() => {
      this.win.clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = null;
    }, 30);

    this.events.publish('recommendation-mousemove', evt);
  },
  show: function(data) {
    if (this.timeout) {
      this.win.clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Don't re-render the recommendation if the content hasn't changed since
    // the previous recommendation.
    if (this.prev && this.el.firstChild && data.result.url === this.prev.result.url) {
      this.el.collapsed = false;
      this.events.publish('recommendation-shown', this);
      return;
    }

    this.prev = data;
    const recommendation = this.row = new this.RecommendationRow(data, {
      eTLD: this.eTLD,
      io: this.io,
      win: this.win
    }).render();
    if (this.el) {
      if (recommendation) {
        if (this.el.firstChild) {
          this.el.replaceChild(recommendation, this.el.firstChild);
        } else {
          this.el.appendChild(recommendation);
        }
        this.el.collapsed = false;
        this.data = data;
        this.events.publish('recommendation-shown', this);
      } else {
        if (this.el.firstChild) {
          this.el.removeChild(this.el.firstChild);
        }
        this.data = null;
        this.el.collapsed = true;
      }
    }
  },
  hide: function() {
    if (this.el) {
      const container = this.win.document.getElementById(RECOMMENDATION_ID);
      this.timeout = this.win.setTimeout(function() {
        this.el.collapsed = true;
      }.bind(this), 100);
      this.data = null;
    }
  },
  navigate: function(evt) {
    // Only navigate if it's a left click.
    if (evt.button !== 0) {
      return;
    }

    // Unfortunately, because the urlbar state isn't set by mousing over an
    // item, we have to set the urlbar state, then ask it to navigate.
    // Set state by faking a selection event...
    const urlEl = this.el.querySelector('#universal-search-recommendation-url');
    const url = urlEl.getAttribute('data-url');
    this.events.publish('selection-change', {newUrl: url});
    // ...then, after a turn, fire a 'recommendation-navigate' event to trigger
    // navigation.
    this.win.setTimeout(() => {
      this.events.publish('recommendation-navigate');
    });
  }
};
