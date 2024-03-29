# primus-analytics

[![Version npm][npm-primus-analytics-badge]][npm-primus-analytics][![CI][ci-primus-analytics-badge]][ci-primus-analytics]

Integrates Google Analytics deeply in the Primus client by using its event
tracking functionality. This allows you to get an insight on how things are
running on the client.

## Installation

The module is released in the public npm registry and can be installed by
running:

```
npm install --save primus-analytics
```

## Integration

We assume that you've already setup your Primus server. If not we assume the
following base initialization in our example code:

```js
'use strict';

var Primus = require('primus')
  , http = require('http')
  , server = http.createServer();

var primus = new Primus(server);
```

To add this plugin to your created Primus server instance you need to use the
`.plugin` method which accepts a name and the required plugin as argument. The name
can be anything you want. It's there for lookup and debugging purposes.

```js
primus.plugin('google analytics', require('primus-analaytics'));
```

Please note that after adding this plugin, you should re-generate the client
library if you are not using the primus library that is served from
`/primus/primus.js`.

```js
primus.save(__dirname +'/your-completed-library.js');
```

## API

Now that the server is completely set up with the correct plugins and all files
have been re-compiled we can start configuring the client side. In most if not
all cases you don't really need to do anything here. When you create a new
Primus client it will automatically start tracking:

- The custom events and their names when using `primus-emit` or `primus-emitter`
- Close, reconnected, reconnect-failed, open events.
- Reconnect-start event.
- Exception tracking for `error` events.

But everything here is configurable by supplying an `analytics` object in the
options object of the `Primus` constructor. The following options are
supported:

- *category*  The event category we should log the events under. It defaults to
  `primus`.
- *events* Should be an object where the key is the name of the event we tracked
  and the value is the event action that should be logged. If value is set to
  `false` we assume that you want to prevent this event from being tracked so it
  will not be sent to Google Analytics. This is also useful to block highly
  frequent events so you don't reach your event limit in Google Analytics.
- *app* With the exception reporting that we trigger on the `error` event, we
  also send the name of the application, the app property allows you to
  configure this name. If defaults to `primus`.

```js
var primus = new Primus('http://your-website.here', {
  analytics: {
    category: 'chat server',
    events: {
      'load more': 'load-more-messages',
      'mousemove': false
    }
  }
});
```

[npm-primus-analytics-badge]: https://img.shields.io/npm/v/primus-analytics.svg?style=flat-square
[npm-primus-analytics]: https://www.npmjs.com/package/primus-analytics
[ci-primus-analytics-badge]: https://img.shields.io/github/actions/workflow/status/primus/primus-analytics/ci.yml?branch=master&label=CI&style=flat-square
[ci-primus-analytics]: https://github.com/primus/primus-analytics/actions?query=workflow%3ACI+branch%3Amaster

## License

[MIT](LICENSE)
