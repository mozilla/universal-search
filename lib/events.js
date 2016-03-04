/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Events'];

function Events() {
  /*
  The Events module provides a very simple JS pubsub implementation. Callers
  need to bind callbacks before subscribing.

  Interestingly, it doesn't seem like Gecko has a shared JS messaging service
  other than the nsIObserverService, which is Firefox-global. We load a
  separate instance of this object into each ChromeWindow, to provide
  messaging between per-window components.
  */
}

Events.prototype = {
  init: function() {
    this.topics = {};
  },
  destroy: function() {
    delete this.topics;
  },
  subscribe: function(topic, cb) {
    if (!(topic in this.topics)) {
      this.topics[topic] = [];
    }
    this.topics[topic].push(cb);
  },
  unsubscribe: function(topic, cb) {
    if (!(topic in this.topics)) {
      return;
    }

    // Remove any matching subscribers.
    this.topics[topic].forEach((callback, i) => {
      if (callback === cb) {
        this.topics[topic].splice(i, 1);
      }
    });

    // If the topic has no subscribers left, remove it.
    if (!this.topics[topic].length) {
      delete this.topics[topic];
    }
  },
  publish: function(topic, data) {
    if (!(topic in this.topics)) {
      return;
    }
    this.topics[topic].forEach(cb => {
      cb(data);
    });
  }
};
