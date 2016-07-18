# firefox-extension-deploy [![Build Status](https://travis-ci.org/erikdesjardins/firefox-extension-deploy.svg?branch=master)](https://travis-ci.org/erikdesjardins/firefox-extension-deploy) [![Coverage Status](https://coveralls.io/repos/github/erikdesjardins/firefox-extension-deploy/badge.svg?branch=master)](https://coveralls.io/github/erikdesjardins/firefox-extension-deploy?branch=master)

Deploy Firefox extensions to AMO.

## Installation

`npm install --save-dev firefox-extension-deploy`

## Usage

Note: `firefox-extension-deploy` requires `Promise` support.
If your environment does not natively support promises, you'll need to provide [your own polyfill](https://github.com/floatdrop/pinkie).

```js
var fs = require('fs');
var deploy = require('firefox-extension-deploy');

deploy({
  // obtained by following the instructions here:
  // https://olympia.readthedocs.io/en/latest/topics/api/auth.html
  // or from this page:
  // https://addons.mozilla.org/en-US/developers/addon/api/key/
  issuer: 'myIssuer',
  secret: 'mySecret',

  // the ID of your extension
  id: 'exampleId@jetpack',
  // the version to publish
  version: '1.0.0',

  // a Buffer or string containing a .zip (WebExtensions) or .xpi (Add-on SDK)
  src: fs.readFileSync('path/to/zipped/extension.zip'),
}).then(function() {
  // success!
}, function(err) {
  // failure :(
});
```
