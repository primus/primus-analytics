'use strict';
/* globals ga */

/**
 * A Google Analytics integration for Primus. Get insight in the client-side
 * behavior of your application.
 *
 * @param {Primus} primus Reference to the initialized primus instance.
 * @param {Object} options Options supplied in the `new Primus(ur, options)`
 * @api public
 */
exports.client = function client(primus, options) {
  var analytics = options.analytics || {}
    , reconnect = false;

  analytics.category = analytics.category || 'primus';
  analytics.app = analytics.app || 'primus';
  analytics.events = analytics.events || {};

  /**
   * Small wrapper which makes it easier to add trackers in event listeners.
   *
   * @param {String} name Name of the event we should log.
   * @returns {Function}
   * @api private
   */
  function tracker(name, fn) {
    return function tracks() {
      var value;

      if (fn && (value = fn()) === false) return; // Ignored by callback.
      track(name, value);
    };
  }

  /**
   * Custom tracker function which makes it a bit easier to safely send events
   * to Google Analytics.
   *
   * @param {String} name Name of the event we should log.
   * @param {Mixed} value Optional event value.
   * @api private
   */
  function track(name, value) {
    var payload = {
      eventAction: analytics.events[name] || name,
      eventCategory: analytics.category,
      hitType: 'event',

      //
      // Important option here, we cannot make a guarantee that these "events"
      // are caused by user interaction so we want to make sure that it does not
      // affect the bounce rate.
      //
      // @see developers.google.com/analytics/devguides/collection/analyticsjs/events
      //
      nonInteraction: 1
    };
    //
    // Make sure that Google Analytics is loaded before we continue here as we
    // don't want to generate errors by calling unknown functions. Continuous
    // checking is done as we don't know when or where the user is pasting the
    // "isogram" code of Google Analytics in the page.
    //
    if (
         'function' !== typeof ga           // No existing.
      || analytics.events[name] === false   // Event blacklisted.
    ) return;

    if (value) payload.eventValue = value;
    ga('send', payload);
  }

  primus
  .on('close', tracker('close'))
  .on('online', tracker('online'))
  .on('reconnected', tracker('reconnected'))
  .on('reconnect failed', tracker('reconnect-failed'));

  //
  // There's no "reconnect start" event in Primus that allows you to figure out
  // when it's the first time that reconnect is happening, so we need to track
  // the first time that the reconnect-scheduled is fired. We can safely assume
  // that once open is called we need to start tracking the event.
  //
  primus.on('open', tracker('open', function open() {
    reconnect = false;
  }))
  .on('reconnect scheduled', tracker('reconnect-start', function scheduled() {
    if (reconnect) return false;
    reconnect = true;
  }));

  //
  // All errors in Primus are fatal exceptions and means that we cannot continue
  // with the communication of the client and that there's no way we can
  // reconnect.
  //
  primus.on('error', function error(err) {
    if ('function' !== typeof ga || analytics.events.error === false) return;

    ga('send', 'exception', {
      'exDescription': err.message,
      'appName': analytics.app,
      'exFatal': true
    });
  });

  //
  // Now, we want to log custom events here this should support the 2 most
  // common `event` libraries in Primus today, primus-emit and primus-emitter.
  //
  primus.transform('outgoing', function transform(packet) {
    var data = packet.data
      , name = 'write';

    //
    // Detect the `primus-emit` format:
    //
    if (data.emit && 'string' === typeof data.emit[0]) {
      name = data.emit[0];

    //
    // Detect the `primus-emitter` format:
    //
    } else if (data.type === 0 && data.data && 'string' === typeof data.data[0]) {
      name = data.data[0];
    }

    track(name);
  });
};
