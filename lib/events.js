/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Events'];

function Events() {}

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

    // remove any matching subscribers
    this.topics[topic].forEach((callback, i) => {
      if (callback === cb) {
        this.topics[topic].splice(i, 1);
      }
    });

    // if the topic's empty, remove it
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
