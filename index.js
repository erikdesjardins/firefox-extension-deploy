/**
 * @author Erik Desjardins
 * See LICENSE file in root directory for full license.
 */

'use strict';

var request = require('superagent');
var jwt = require('jsonwebtoken');

var REQUIRED_FIELDS = ['issuer', 'secret', 'id', 'version', 'src'];

module.exports = function deploy(options) {
	var fieldError = REQUIRED_FIELDS.reduce(function(err, field) {
		if (err) return err;
		if (!options[field]) {
			return 'Missing required field: ' + field;
		}
	}, null);

	if (fieldError) {
		return Promise.reject(new Error(fieldError));
	}

	var jwtIssuer = options.issuer;
	var jwtSecret = options.secret;
	var extensionId = options.id;
	var extensionVersion = options.version;
	var srcFile = options.src;

	var issuedAt = Math.floor(Date.now() / 1000);
	var payload = {
		iss: jwtIssuer,
		jti: Math.random().toString(),
		iat: issuedAt,
		exp: issuedAt + 60
	};
	var token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

	// SuperAgent's "promise" support doesn't provide a way to get the status of a failed request
	return new Promise(function(resolve, reject) {
		request
			.put('https://addons.mozilla.org/api/v3/addons/' + extensionId + '/versions/' + extensionVersion + '/')
			.set('Authorization', 'JWT ' + token)
			.type('multipart/form-data')
			.send(srcFile)
			.end(function(err, response) {
				if (err) {
					var msg;
					switch (response.status) {
						case 401:
							msg = '401 Unauthorized: ' + response.body.detail;
							break;
						default:
							msg = 'Status ' + response.status + ': ' + response.body.error;
							break;
					}
					reject(new Error(msg));
				} else {
					resolve();
				}
			});
	});
};
