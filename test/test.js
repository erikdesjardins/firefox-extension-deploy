import test from 'ava';
import jwt from 'jsonwebtoken';
import superagent from 'superagent';
import superagentMock from 'superagent-mock';

import deploy from '../index.js';

test.beforeEach(t => {
	t.context.requests = [];
	t.context.mock = superagentMock(superagent, [{
		pattern: '^https://addons.mozilla.org/api/v3/addons/([^/]+)/versions/([^/]+)/$',
		fixtures(match, params, headers) {
			t.context.requests.push({ match, params, headers });
			if (t.context.publishFail) {
				throw { response: { status: t.context.publishFail, body: {} } };
			}
			return t.context.publishResponse;
		},
		put(match, data) {
			return { body: data };
		}
	}, {
		pattern: '^https://addons.mozilla.org/api/v3/addons/([^/]+)/versions/([^/]+)/uploads/([^/]+)/$',
		fixtures(match, params, headers) {
			t.context.requests.push({ match, params, headers });
			if (t.context.validationFail) {
				throw { response: { status: t.context.validationFail, body: {} } };
			}
			return t.context.validationResponse || t.context.validationResponses.shift();
		},
		get(match, data) {
			return { body: data };
		}
	}, {
		pattern: '.*',
		fixtures(match) {
			throw new Error('No mocked endpoint for: ' + match);
		}
	}]);

	const oldSetTimeout = global.setTimeout;
	t.context.oldSetTimeout = oldSetTimeout;
	global.setTimeout = function shortSetTimeout(fn, delay, ...args) {
		return oldSetTimeout(fn, delay / 1000, ...args);
	};
});

test.afterEach(t => {
	t.context.mock.unset();

	global.setTimeout = t.context.oldSetTimeout;
});

test.serial('missing fields', async t => {
	await t.throwsAsync(
		deploy({ secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Missing required field: issuer'
	);
	await t.throwsAsync(
		deploy({ issuer: 'q', id: 'q', version: 'q', src: 'q' }),
		'Missing required field: secret'
	);
	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', version: 'q', src: 'q' }),
		'Missing required field: id'
	);
	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', src: 'q' }),
		'Missing required field: version'
	);
	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q' }),
		'Missing required field: src'
	);
});

test.serial('failing upload, unknown status', async t => {
	t.context.publishFail = 'fail_message';

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Submission failed: Status fail_message: undefined'
	);
});

test.serial('failing upload, 400', async t => {
	t.context.publishFail = 400;

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Submission failed: Status 400: undefined'
	);
});

test.serial('failing upload, 401', async t => {
	t.context.publishFail = 401;

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Submission failed: 401 Unauthorized: undefined'
	);
});

test.serial('failing upload, 403', async t => {
	t.context.publishFail = 403;

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Submission failed: Status 403: undefined'
	);
});

test.serial('failing upload, 409', async t => {
	t.context.publishFail = 409;

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' }),
		'Submission failed: Status 409: undefined'
	);
});

test.serial('failing polling, 409', async t => {
	t.context.publishResponse = {};
	t.context.validationFail = 409;

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' }),
		'Polling failed: Status 409: undefined'
	);
});

test.serial('failing validation', async t => {
	t.context.publishResponse = { pk: 'somePk' };
	t.context.validationResponse = { processed: true, valid: false, validation_url: 'myUrl', validation_results: 'myResults' };

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' }),
		'Validation failed: myUrl "myResults"'
	);

	t.is(t.context.requests.length, 2);
});

test.serial('full deploy', async t => {
	t.context.publishResponse = { pk: 'somePk' };
	t.context.validationResponse = { processed: true, valid: true };

	await deploy({ issuer: 'someIssuer', secret: 'someSecret', id: 'someId', version: 'someVersion', src: 'someSrc' })

	t.is(t.context.requests.length, 2, 'only two requests made');

	const { requests: [publishReq, validationReq] } = t.context;

	t.is(publishReq.match[1], 'someId');
	t.is(publishReq.match[2], 'someVersion');
	t.regex(publishReq.headers['Authorization'], /^JWT /);
	jwt.verify(publishReq.headers['Authorization'].slice(4), 'someSecret', {
		algorithms: ['HS256'],
		issuer: 'someIssuer'
	});

	t.is(validationReq.match[1], 'someId');
	t.is(validationReq.match[2], 'someVersion');
	t.is(validationReq.match[3], 'somePk');
	t.regex(validationReq.headers['Authorization'], /^JWT /);
	jwt.verify(validationReq.headers['Authorization'].slice(4), 'someSecret', {
		algorithms: ['HS256'],
		issuer: 'someIssuer'
	});
});

test.serial('failing validation after polling', async t => {
	t.context.publishResponse = { pk: 'somePk' };
	t.context.validationResponses = [
		{ processed: false },
		{ processed: true, valid: false, validation_url: 'myUrl', validation_results: 'myResults' },
	];

	await t.throwsAsync(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' }),
		'Validation failed: myUrl "myResults"'
	);

	t.is(t.context.requests.length, 3);
});

test.serial('passing validation after polling', async t => {
	t.context.publishResponse = { pk: 'somePk' };
	t.context.validationResponses = [
		{ processed: false },
		{ processed: true, valid: true },
	];

	await deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' });

	t.is(t.context.requests.length, 3);
});
