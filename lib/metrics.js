/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ['Metrics'];

function Metrics(opts) {
  /*
  The metrics class measures the state of the popup each time it closes.
  Data is sent to the Test Pilot add-on, which forwards it to the Telemetry
  server.
  */
  this.events = opts.events;
  this.interaction = null;
  this.observerService = opts.observerService;
  this.win = opts.win;
  this.recommendation = opts.recommendation;
  this.popup = opts.popup;
  this.checked = false;

  this.interactionStart = this.interactionStart.bind(this);
  this.interactionEnd = this.interactionEnd.bind(this);
  this.onKeyNavigate = this.onKeyNavigate.bind(this);
  this.onClickNavigate = this.onClickNavigate.bind(this);
}

Metrics.prototype = {
  init: function() {
    // Start listening when the popup is about to open.
    this.events.subscribe('before-popup-show', this.interactionStart);

    // Detect when a navigation event occurs.
    this.events.subscribe('before-keyboard-navigate', this.onKeyNavigate);
    this.events.subscribe('before-click-navigate', this.onClickNavigate);

    // Reset the interaction state when the urlbar contents change.
    this.events.subscribe('urlbar-change', this.interactionStart);

    // The interaction ends when the popup closes.
    this.events.subscribe('before-popup-hide', this.interactionEnd);
  },
  destroy: function() {
    this.events.unsubscribe('before-popup-show', this.interactionStart);
    this.events.unsubscribe('before-keyboard-navigate', this.onKeyNavigate);
    this.events.unsubscribe('before-click-navigate', this.onClickNavigate);
    this.events.unsubscribe('urlbar-change', this.interactionStart);
    this.events.unsubscribe('before-popup-hide', this.interactionEnd);
  },
  interactionStart: function() {
    // Initialize default values for the case where the popup closes without a
    // navigation.
    this.checked = false;
    this.interaction = {

      // Did the user navigate?
      didNavigate: false,

      // Was the selected item clicked or keyed or neither?
      interactionType: null,

      // Was the recommendation shown?
      recommendationShown: false,

      // What type of recommendation was it?
      recommendationType: null,

      // Was the recommendation the selected item?
      recommendationSelected: null,

      // What was the index of the selected item?
      // If the recommendation was selected, this will be -1.
      selectedIndex: null
    };
  },
  onKeyNavigate: function() {
    this.checkState('key');
  },
  onClickNavigate: function(data) {
    // It turns out that the popup's click handler can get the selectedIndex
    // before the popup starts to handle it, but checkState is too late, and
    // always thinks selectedIndex = -1 in the case of clicks.
    this.checkState('click', data.selectedIndex);
  },
  checkState: function(interactionType, selectedIndex) {
    this.checked = true;

    const popupIndex = this.popup.el && this.popup.el.selectedIndex;
    const recommendationType = this.recommendation.row && this.recommendation.row.resultType;
    this.interaction = {
      // If interactionType is defined, then we did navigate.
      didNavigate: !!interactionType,
      interactionType: interactionType || null,
      recommendationShown: this.recommendation.el && !this.recommendation.el.collapsed,
      recommendationSelected: this.recommendation.isHighlighted,
      recommendationType: recommendationType,
      // If no selectedIndex was passed in, we get the value from the popup.
      // Note that `isNaN(undefined) => true`.
      selectedIndex: isNaN(selectedIndex) ? popupIndex : selectedIndex
    };
  },
  interactionEnd: function() {
    // Note: the popuphiding event fires before the click event, so we use a
    // setTimeout to give the click a chance to register. Otherwise,
    // selectedIndex will incorrectly be reported as -1.
    this.win.setTimeout(() => {
      // If we haven't checked state, check it now, so we have data to report.
      if (!this.checked) {
        this.checkState();
      }

      // This looks strange, but it's required to send over the test ID.
      const subject = {
        wrappedJSObject: {
          observersModuleSubjectWrapper: true,
          object: 'universal-search@mozilla.com'
        }
      };

      // Send metrics to the main Test Pilot add-on.
      this.observerService.notifyObservers(subject, 'testpilot::send-metric',
        JSON.stringify(this.interaction));

      // Finally, reset state.
      this.interaction = null;
      this.checked = false;
    });
  }
};
