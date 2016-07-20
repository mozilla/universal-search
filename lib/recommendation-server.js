/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['RecommendationServer']; // eslint-disable-line no-unused-vars

const Ci = Components.interfaces;

function RecommendationServer(opts) {
  /*
  Class providing a connection to a recommendation server and a method for
  querying it. This class should be initialized once and exported as a
  singleton to modules that will use it.

  Usage:

  let recommendation = new RecommendationServer({
    // events is an instance of lib/events
    events: events,
    xhr: Cc['@mozilla.org/xmlextras/xmlhttprequest;1'],
    prefs: prefs,
    timeout: 1000
  });
  recommendation.init();
  */
  this.events = opts.events;
  this.timeout = opts.timeout;
  // Note: this is the xhr service, not an xhr instance
  this.xhr = opts.xhr;
  this.logger = new opts.Logger('server', opts.win);
  this.prefs = opts.prefs;
  this.urlbarPrefs = opts.urlbarPrefs;
  this.server = this.prefs.getPrefType('server') ?
                this.prefs.getCharPref('server') :
                'https://universalsearch.testpilot.firefox.com';
  this.search = this.search.bind(this);
}

RecommendationServer.prototype = {
  init: function() {
    this.request = this.xhr.createInstance();
    this.request.timeout = this.timeout;
    this.request.isInFlight = false;
    this.maxChars = this._getMaxCharsPref();
    this.warm();

    this.events.subscribe('urlbar-change', this.search);
  },
  _getMaxCharsPref: function() {
    const name = 'maxCharsForSearchSuggestions';
    return this.urlbarPrefs.getPrefType(name) ?
           this.urlbarPrefs.getIntPref(name) :
           20;
  },
  destroy: function() {
    this.request.abort();
    delete this.request;

    this.events.unsubscribe('urlbar-change', this.search);
  },
  _url: function(query) {
    const useDummyEndpoint = this.prefs.getPrefType('dummy') ?
                             this.prefs.getBoolPref('dummy') :
                             false;
    const endpoint = useDummyEndpoint ? 'dummy' : '';
    return `${this.server}/${endpoint}?q=${encodeURIComponent(query)}`;
  },
  warm: function() {
    /*
    Fire off a dummy request to the recommendation server to warm an HTTP/2
    connection to take advantage of multiplexing.
    */
    const req = this.request;
    if (!req.isInFlight) {
      req.addEventListener('loadend', evt => {
        req.isInFlight = false;
      });
      req.open('GET', `${this.server}/__lbheartbeat__`);
      // Do not send cookies with requests, to prevent user tracking. (#148)
      req.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS;
      req.isInFlight = true;
      req.send();
    }
  },
  search: function(payload) {
    if (!payload.query || payload.query.length > this.maxChars) {
      return;
    }
    this._search(payload.query).then(data => {
      this.logger.info(`Received "${payload.query}"`, data);
      this.events.publish('recommendation', data);
    }, reason => {
      // TODO: send this information to metrics instead of logging
      this.logger.info(reason);
    });
  },
  _search: function(query) {
    /*
    Method to query a recommendation server. Returns a promise that resolves to
    a recommendation or rejects to a reason that a recommendation is not
    available.

    Usage:

    recommendation.search('hello wor').then(data => {
      // Recommendation returned as `data` object literal.
    }, reason => {
      // No recommendation returned for `reason` string.
    });
    */
    const endpoint = this._url(query);
    const req = this.request;
    return new Promise((resolve, reject) => {
      try {
        if (req.isInFlight) {
          req.abort();
        }
        req.addEventListener('abort', evt => {
          req.isInFlight = false;
          reject(`Aborted "${query}".`);
        });
        req.addEventListener('error', evt => {
          req.isInFlight = false;
          reject(`Error "${query}"`);
        });
        req.addEventListener('load', evt => {
          req.isInFlight = false;
          let recommendation;
          try {
            recommendation = JSON.parse(req.responseText);
          } catch (err) {
            reject(`Unable to parse JSON "${query}"`);
          }
          if (req.status === 200 && recommendation !== {}) {
            resolve(recommendation);
          }
          reject(`Unavailable "${query}".`);
        });
        req.open('GET', endpoint);
        // Do not send cookies with requests, to prevent user tracking. (#148)
        req.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS;
        req.isInFlight = true;
        req.send();
      } catch (err) {
        reject(`Exception "${query}"`);
      }
    });
  }
};
