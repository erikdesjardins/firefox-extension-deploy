import test from 'ava';
import jwt from 'jsonwebtoken';
import superagent from 'superagent';
import superagentMock from 'superagent-mock';

import deploy from '../index.js';

test.beforeEach(t => {
	t.context.requests = [];
	t.context.mock = superagentMock(superagent, [{
		pattern: '^https://addons.mozilla.org/api/v3/addons/(.+)/versions/(.+)$',
		fixtures(match, params, headers) {
			t.context.requests.push({ match, params, headers });
			if (t.context.publishFail) {
				throw { message: t.context.publishFail };
			}
			return t.context.publishResponse;
		},
		put(match, data) {
			return { body: data };
		}
	}, {
		pattern: '.*',
		fixtures(match) {
			throw new Error('No mocked endpoint for: ' + match);
		}
	}]);
});

test.afterEach(t => {
	t.context.mock.unset();
});

test.serial('missing fields', t => {
	t.throws(
		deploy({ secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Missing required field: issuer'
	);
	t.throws(
		deploy({ issuer: 'q', id: 'q', version: 'q', src: 'q' }),
		'Missing required field: secret'
	);
	t.throws(
		deploy({ issuer: 'q', secret: 'q', version: 'q', src: 'q' }),
		'Missing required field: id'
	);
	t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', src: 'q' }),
		'Missing required field: version'
	);
	t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q' }),
		'Missing required field: src'
	);
});

test.serial('failing upload, unknown status', async t => {
	t.context.publishFail = 'fail_message';

	await t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Status fail_message: undefined'
	);
});

test.serial('failing upload, 400', async t => {
	t.context.publishFail = 400;

	await t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Status 400: undefined'
	);
});

test.serial('failing upload, 401', async t => {
	t.context.publishFail = 401;

	await t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'401 Unauthorized: undefined'
	);
});

test.serial('failing upload, 403', async t => {
	t.context.publishFail = 403;

	await t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'q', src: 'q' }),
		'Status 403: undefined'
	);
});

test.serial('failing upload, 409', async t => {
	t.context.publishFail = 409;

	await t.throws(
		deploy({ issuer: 'q', secret: 'q', id: 'q', version: 'myVersion', src: 'q' }),
		'Status 409: undefined'
	);
});

test.serial('full deploy', async t => {
	t.context.publishResponse = {};

	await deploy({ issuer: 'someIssuer', secret: 'someSecret', id: 'someId', version: 'someVersion', src: 'someSrc' })

	const { requests: [publishReq] } = t.context;

	t.is(publishReq.match[1], 'someId');
	t.is(publishReq.match[2], 'someVersion');
	t.regex(publishReq.headers['Authorization'], /^JWT /);
	t.is(publishReq.headers['Content-Type'], 'multipart/form-data');
	t.is(publishReq.params, 'someSrc');

	// throws if invalid
	jwt.verify(publishReq.headers['Authorization'].slice(4), 'someSecret', {
		algorithms: ['HS256'],
		issuer: 'someIssuer'
	})
});
