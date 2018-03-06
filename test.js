describe('analytics', function () {
  'use strict';

  var assume = require('assume')
    , Primus = require('primus')
    , analytics = require('./')
    , http = require('http');

  var port = 1024
    , primus
    , server
    , Socket;

  beforeEach(function each(next) {
    server = http.createServer();
    primus = new Primus(server);

    Socket = primus.Socket;
    Socket.prototype.ark.analytics = analytics.client;

    server.port = port++;
    server.url = 'http://localhost:'+ server.port;

    server.listen(server.port, next);
  });

  afterEach(function (next) {
    primus.destroy(next);
  });

  it('tracks the `open` and `close` events', function (next) {
    var calls = 0
      , socket;

    global.ga = function ga(command, payload) {
      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventAction: ++calls === 1 ? 'open' : 'close',
        eventCategory: 'primus',
        nonInteraction: 1,
        hitType: 'event'
      });

      if (calls === 2) next();
    };

    socket = new Socket(server.url, { strategy: false });
    socket.on('open', socket.end);
  });

  it('tracks the `error` event', function (next) {
    global.ga = function ga(command, exception, payload) {
      assume(command).to.equal('send');
      assume(exception).to.equal('exception');
      assume(payload).to.be.an('object');
      assume(payload.exDescription).to.include('ECONNREFUSED');
      assume(payload.appName).to.equal('primus');
      assume(payload.exFatal).to.equal(true);

      next();
    };

    primus.destroy(function () {
      new Socket(server.url, {
        analytics: {
          events: { close: false }
        },
        strategy: false
      });
    });
  });

  it('tracks the calls to `primus.write`', function (next) {
    var socket;

    global.ga = function ga(command, payload) {
      if ('open' === payload.eventAction || 'close' === payload.eventAction) {
        return;
      }

      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventCategory: 'primus',
        eventAction: 'write',
        nonInteraction: 1,
        hitType: 'event'
      });

      next();
    };

    socket = new Socket(server.url, { strategy: false });
    socket.on('open', function () {
      socket.write('foo');
    });
  });

  it('tracks the events sent wint primus-emit', function (next) {
    var socket;

    primus.plugin('emitter', 'primus-emit');

    Socket = primus.Socket;
    Socket.prototype.ark.analytics = analytics.client;

    global.ga = function ga(command, payload) {
      if ('open' === payload.eventAction || 'close' === payload.eventAction) {
        return;
      }

      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventCategory: 'primus',
        eventAction: 'foo',
        nonInteraction: 1,
        hitType: 'event'
      });

      next();
    };

    socket = new Socket(server.url, { strategy: false });
    socket.on('open', function () {
      socket.emit('foo', 'bar');
    });
  });

  it('tracks the events sent with primus-emitter', function (next) {
    var socket;

    primus.plugin('emitter', 'primus-emitter');

    Socket = primus.Socket;
    Socket.prototype.ark.analytics = analytics.client;

    global.ga = function ga(command, payload) {
      if ('open' === payload.eventAction || 'close' === payload.eventAction) {
        return;
      }

      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventCategory: 'primus',
        eventAction: 'foo',
        nonInteraction: 1,
        hitType: 'event'
      });

      next();
    };

    socket = new Socket(server.url, { strategy: false });
    socket.on('open', function () {
      socket.send('foo', 'bar');
    });
  });

  it('tracks the reconnection events', function (next) {
    var reconnect = false
      , calls = 0;

    global.ga = function ga(command, payload) {
      if ('open' === payload.eventAction || 'close' === payload.eventAction) {
        return;
      }

      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventAction: ++calls === 1 ? 'reconnect-start' : 'reconnected',
        eventCategory: 'primus',
        nonInteraction: 1,
        hitType: 'event'
      });

      if (calls === 2) next();
    };

    primus.on('connection', function (spark) {
      if (!reconnect) {
        reconnect = true;
        spark.end(undefined, { reconnect: true });
      }
    });

    new Socket(server.url, {
      reconnect: { min: 50 }
    });
  });

  it('tracks a failed reconnection', function (next) {
    var calls = 0
      , socket;

    global.ga = function ga(command, payload) {
      if ('open' === payload.eventAction || 'close' === payload.eventAction) {
        return;
      }

      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventCategory: 'primus',
        eventAction: ++calls === 1 ? 'reconnect-start' : 'reconnect-failed',
        nonInteraction: 1,
        hitType: 'event'
      });

      if (calls === 2) next();
    };

    socket = new Socket(server.url, {
      reconnect: { min: 50, retries: 4 }
    });
    socket.on('open', function () {
      primus.destroy({ reconnect: true });
    });
  });

  it('allows to selectively disable the tracking of the events', function (next) {
    var socket;

    global.ga =  function ga() {
      next(new Error('This event should not be tracked'));
    };

    socket = new Socket(server.url, {
      strategy: false,
      analytics: {
        events: {
          close: false,
          open: false
        }
      }
    });

    socket.on('open', socket.end);
    socket.on('end', next);
  });

  it('allows to customize the category and the action', function (next) {
    var calls = 0
      , socket;

    global.ga = function ga(command, payload) {
      assume(command).to.equal('send');
      assume(payload).to.eql({
        eventCategory: 'foo',
        eventAction: 'bar',
        nonInteraction: 1,
        hitType: 'event'
      });

      if (++calls === 2) next();
    };

    socket = new Socket(server.url, {
      strategy: false,
      analytics: {
        category: 'foo',
        events: {
          close: 'bar',
          open: 'bar'
        }
      }
    });
    socket.on('open', socket.end);
  });

  it('allows to customize the app name', function (next) {
    global.ga = function ga(command, exception, payload) {
      assume(command).to.equal('send');
      assume(exception).to.equal('exception');
      assume(payload).to.be.an('object');
      assume(payload.appName).to.equal('foo');

      next();
    };

    primus.destroy(function () {
      new Socket(server.url, {
        analytics: {
          events: { close: false },
          app: 'foo'
        },
        strategy: false
      });
    });
  });
});
