/**
 * @author Erik Desjardins
 * See LICENSE file in root directory for full license.
 */

'use strict';

var request = require('superagent');
var jwt = require('jsonwebtoken');

var REQUIRED_FIELDS = ['issuer', 'secret', 'id', 'version', 'src'];

module.exports = function deploy(options) {
	var jwtIssuer = options.issuer;
	var jwtSecret = options.secret;
	var extensionId = options.id;
	var extensionVersion = options.version;
	var srcFile = options.src;

	return Promise.resolve()
		// options validation
		.then(function() {
			REQUIRED_FIELDS.forEach(function(field) {
				if (!options[field]) {
					throw new Error('Missing required field: ' + field);
				}
			});
		})
		// submit the addon
		.then(function() {
			var issuedAt = Math.floor(Date.now() / 1000);
			var payload = {
				iss: jwtIssuer,
				jti: Math.random().toString(),
				iat: issuedAt,
				exp: issuedAt + 60
			};
			var token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

			return request
				.put('https://addons.mozilla.org/api/v3/addons/' + extensionId + '/versions/' + extensionVersion + '/')
				.set('Authorization', 'JWT ' + token)
				.field('upload', srcFile)
				.then(function() {
					// success
				}, function(err) {
					switch (err.response.status) {
						case 401:
							throw new Error('401 Unauthorized: ' + err.response.body.detail);
						default:
							throw new Error('Status ' + err.response.status + ': ' + err.response.body.error);
					}
				});
		});
};
