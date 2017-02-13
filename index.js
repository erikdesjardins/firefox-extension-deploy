/**
 * @author Erik Desjardins
 * See LICENSE file in root directory for full license.
 */

'use strict';

var request = require('superagent');
var jwt = require('jsonwebtoken');

var REQUIRED_FIELDS = ['issuer', 'secret', 'id', 'version', 'src'];

function sleep(ms) {
	return new Promise(function(resolve) {
		setTimeout(resolve, ms);
	});
}

module.exports = function deploy(options) {
	var jwtIssuer = options.issuer;
	var jwtSecret = options.secret;
	var extensionId = options.id;
	var extensionVersion = options.version;
	var srcFile = options.src;

	var token, uploadId;

	return Promise.resolve()
		// options validation
		.then(function() {
			REQUIRED_FIELDS.forEach(function(field) {
				if (!options[field]) {
					throw new Error('Missing required field: ' + field);
				}
			});
		})
		// prepare token
		.then(function() {
			var issuedAt = Math.floor(Date.now() / 1000);
			var payload = {
				iss: jwtIssuer,
				jti: Math.random().toString(),
				iat: issuedAt,
				exp: issuedAt + 300
			};
			token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
		})
		// submit the addon
		.then(function() {
			return request
				.put('https://addons.mozilla.org/api/v3/addons/' + extensionId + '/versions/' + extensionVersion + '/')
				.set('Authorization', 'JWT ' + token)
				.field('upload', srcFile)
				.then(function(response) {
					uploadId = response.body.pk;
				}, function(err) {
					switch (err.response.status) {
						case 401:
							throw new Error('Submission failed: 401 Unauthorized: ' + err.response.body.detail);
						default:
							throw new Error('Submission failed: Status ' + err.response.status + ': ' + err.response.body.error);
					}
				});
		})
		// poll for completion
		.then(function poll() {
			return request
				.get('https://addons.mozilla.org/api/v3/addons/' + extensionId + '/versions/' + extensionVersion + '/uploads/' + uploadId + '/')
				.set('Authorization', 'JWT ' + token)
				.then(function(response) {
					if (!response.body.processed) {
						// try again
						return sleep(30000).then(poll);
					} else if (!response.body.valid) {
						throw new Error('Validation failed: ' + response.body.validation_url + ' ' + JSON.stringify(response.body.validation_results));
					}
				}, function(err) {
					throw new Error('Polling failed: Status ' + err.response.status + ': ' + err.response.body.error);
				})
		});
};
