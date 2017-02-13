# firefox-extension-deploy [![Build Status](https://travis-ci.org/erikdesjardins/firefox-extension-deploy.svg?branch=master)](https://travis-ci.org/erikdesjardins/firefox-extension-deploy) [![Coverage Status](https://coveralls.io/repos/github/erikdesjardins/firefox-extension-deploy/badge.svg?branch=master)](https://coveralls.io/github/erikdesjardins/firefox-extension-deploy?branch=master)

Deploy Firefox extensions to AMO.

You should probably use [jpm sign](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm#jpm_sign) or [web-ext sign](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/web-ext_command_reference#web-ext_sign) instead.

## Installation

`npm install --save-dev firefox-extension-deploy`

## Usage

```js
var fs = require('fs');
var deploy = require('firefox-extension-deploy');

deploy({
  // obtained by following the instructions here:
  // https://addons-server.readthedocs.io/en/latest/topics/api/auth.html
  // or from this page:
  // https://addons.mozilla.org/en-US/developers/addon/api/key/
  issuer: 'myIssuer',
  secret: 'mySecret',

  // the ID of your extension
  id: 'exampleId@jetpack',
  // the version to publish
  version: '1.0.0',

  // a ReadStream containing a .zip (WebExtensions) or .xpi (Add-on SDK)
  src: fs.createReadStream('path/to/zipped/extension.zip'),
}).then(function() {
  // success!
}, function(err) {
  // failure :(
});
```
