import test from 'node:test';
import assert from 'node:assert/strict';
import { submitPortfolioFeedback } from '../src/lib/portfolio-feedback-core.ts';
import { createFeedbackHandler } from '../src/lib/feedback-endpoint.ts';
import { HttpError } from '../src/lib/http.ts';

const input = { name: 'Ayu', message: 'Masukan ini bermanfaat.', rating: 5, project: 'PusakaEvents' };

async function withMcpEnv(callback) {
  const previousUrl = process.env.PORTFOLIO_MCP_URL;
  const previousKey = process.env.PORTFOLIO_MCP_API_KEY;
  process.env.PORTFOLIO_MCP_URL = 'https://portfolio.test/api/mcp';
  process.env.PORTFOLIO_MCP_API_KEY = 'test-key-do-not-log';
  try {
    return await callback();
  } finally {
    if (previousUrl === undefined) delete process.env.PORTFOLIO_MCP_URL;
    else process.env.PORTFOLIO_MCP_URL = previousUrl;
    if (previousKey === undefined) delete process.env.PORTFOLIO_MCP_API_KEY;
    else process.env.PORTFOLIO_MCP_API_KEY = previousKey;
  }
}

function response(payload, status = 200) {
  return new Response(typeof payload === 'string' ? payload : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': typeof payload === 'string' ? 'text/plain' : 'application/json' },
  });
}

test('MCP helper sends the expected request and accepts pending only', async () => {
  await withMcpEnv(async () => {
    let request;
    const result = await submitPortfolioFeedback(input, {
      fetchImpl: async (url, init) => {
        request = { url, init, body: JSON.parse(init.body) };
        return response({ result: { structuredContent: { id: 'feedback-1', status: 'pending' } } });
      },
    });
    assert.deepEqual(result, { status: 'ok' });
    assert.equal(request.url, process.env.PORTFOLIO_MCP_URL);
    assert.equal(request.init.headers.Authorization, 'Bearer test-key-do-not-log');
    assert.equal(request.body.method, 'tools/call');
    assert.equal(request.body.params.name, 'submit_feedback');
    assert.deepEqual(request.body.params.arguments, input);
    assert.equal(request.init.cache, 'no-store');
    assert.equal(request.init.signal.aborted, false);
  });
});

test('MCP helper maps 401 and 429 without reading their response bodies', async () => {
  await withMcpEnv(async () => {
    for (const [status, expected] of [[401, 'unauthorized'], [429, 'rate-limited']]) {
      const result = await submitPortfolioFeedback(input, { fetchImpl: async () => response('private upstream body', status) });
      assert.deepEqual(result, { status: expected });
    }
  });
});

test('MCP helper maps tool errors to invalid and malformed replies to unavailable', async () => {
  await withMcpEnv(async () => {
    const invalid = await submitPortfolioFeedback(input, { fetchImpl: async () => response({ result: { isError: true } }) });
    assert.deepEqual(invalid, { status: 'invalid' });

    for (const fetchImpl of [
      async () => response('not json'),
      async () => response({ result: {} }),
      async () => response({ error: { message: 'ignored' } }),
      async () => response({ result: { structuredContent: { id: 42, status: 'pending' } } }),
      async () => response({ result: { structuredContent: { id: 'feedback-2', status: 'approved' } } }),
      async () => response({ result: { structuredContent: { id: 'feedback-3', status: 'pending' } }, error: {} }, 500),
    ]) {
      assert.deepEqual(await submitPortfolioFeedback(input, { fetchImpl }), { status: 'unavailable' });
    }
  });
});

test('MCP helper maps abort timeout to unavailable', async () => {
  await withMcpEnv(async () => {
    let signal;
    const result = await submitPortfolioFeedback(input, {
      timeoutMs: 5,
      fetchImpl: async (_url, init) => {
        signal = init.signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      },
    });
    assert.deepEqual(result, { status: 'unavailable' });
    assert.equal(signal.aborted, true);
  });
});

test('unconfigured helper does not fetch and no helper logs include the key', async () => {
  const previousUrl = process.env.PORTFOLIO_MCP_URL;
  const previousKey = process.env.PORTFOLIO_MCP_API_KEY;
  const original = Object.fromEntries(['log', 'info', 'warn', 'error'].map((method) => [method, console[method]]));
  const output = [];
  process.env.PORTFOLIO_MCP_URL = '';
  process.env.PORTFOLIO_MCP_API_KEY = 'test-key-do-not-log';
  for (const method of Object.keys(original)) console[method] = (...args) => output.push(args.join(' '));
  try {
    const result = await submitPortfolioFeedback(input, { fetchImpl: async () => { throw new Error('fetch should not run'); } });
    assert.deepEqual(result, { status: 'not-configured' });
    assert.equal(output.some((line) => line.includes('test-key-do-not-log')), false);
  } finally {
    for (const [method, fn] of Object.entries(original)) console[method] = fn;
    if (previousUrl === undefined) delete process.env.PORTFOLIO_MCP_URL;
    else process.env.PORTFOLIO_MCP_URL = previousUrl;
    if (previousKey === undefined) delete process.env.PORTFOLIO_MCP_API_KEY;
    else process.env.PORTFOLIO_MCP_API_KEY = previousKey;
  }
});

test('feedback endpoint logs only result category, never submission values or API key', async () => {
  const previousKey = process.env.PORTFOLIO_MCP_API_KEY;
  process.env.PORTFOLIO_MCP_API_KEY = 'test-key-do-not-log';
  const originalInfo = console.info;
  const output = [];
  console.info = (...args) => output.push(args.join(' '));
  try {
    const handler = createFeedbackHandler({ submit: async () => ({ status: 'ok' }) });
    await handler(makeRequest({ ...validBody, name: 'Private Name', message: 'Private message body.' }));
    assert.deepEqual(output, ['[feedback] result ok']);
    assert.equal(output.join(' ').includes('test-key-do-not-log'), false);
    assert.equal(output.join(' ').includes('Private Name'), false);
    assert.equal(output.join(' ').includes('Private message body'), false);
  } finally {
    console.info = originalInfo;
    if (previousKey === undefined) delete process.env.PORTFOLIO_MCP_API_KEY;
    else process.env.PORTFOLIO_MCP_API_KEY = previousKey;
  }
});

function makeRequest(body, headers = {}) {
  return new Request('https://pusaka.test/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: '  Nur   Azizah  ',
  role: 'Bendahara',
  company: '',
  rating: 5,
  message: 'Aplikasi ini sangat membantu.',
  consent: true,
  website: '',
};

test('feedback endpoint validates fields and requires exact consent', async () => {
  let calls = 0;
  const handler = createFeedbackHandler({ submit: async () => { calls++; return { status: 'ok' }; } });
  const invalid = await handler(makeRequest({ ...validBody, name: '   ' }));
  assert.equal(invalid.status, 400);
  const noConsent = await handler(makeRequest({ ...validBody, consent: false }));
  assert.equal(noConsent.status, 400);
  assert.equal(calls, 0);
});

test('feedback endpoint normalizes fields and adds only server project data', async () => {
  let sent;
  const handler = createFeedbackHandler({ submit: async (value) => { sent = value; return { status: 'ok' }; }, logCategory: () => {} });
  const result = await handler(makeRequest(validBody));
  assert.equal(result.status, 200);
  assert.deepEqual(sent, {
    name: 'Nur Azizah',
    role: 'Bendahara',
    rating: 5,
    message: 'Aplikasi ini sangat membantu.',
    project: 'PusakaEvents',
  });
  assert.equal('consent' in sent, false);
  assert.equal('website' in sent, false);
});

test('feedback endpoint silently accepts the honeypot without an MCP call', async () => {
  let calls = 0;
  const handler = createFeedbackHandler({ submit: async () => { calls++; return { status: 'ok' }; }, logCategory: () => {} });
  const result = await handler(makeRequest({ website: 'filled by bot' }));
  assert.equal(result.status, 200);
  assert.equal(calls, 0);
});

test('feedback endpoint limits by hashed IP and returns Retry-After', async () => {
  let keySeen;
  let calls = 0;
  const handler = createFeedbackHandler({
    submit: async () => { calls++; return { status: 'ok' }; },
    ipForRequest: () => '203.0.113.77',
    limit: (key) => {
      keySeen = key;
      throw new HttpError(429, 'limited', 'RATE_LIMITED', 91);
    },
    logCategory: () => {},
  });
  const result = await handler(makeRequest(validBody));
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('retry-after'), '91');
  assert.match(keySeen, /^feedback:[a-f\d]{64}$/);
  assert.equal(keySeen.includes('203.0.113.77'), false);
  assert.equal(calls, 0);
});

test('feedback endpoint maps upstream results to safe public responses', async () => {
  for (const [upstream, expectedStatus, retryAfter] of [
    [{ status: 'ok' }, 200, null],
    [{ status: 'invalid' }, 400, null],
    [{ status: 'rate-limited' }, 429, '60'],
    [{ status: 'unauthorized' }, 503, null],
    [{ status: 'unavailable' }, 503, null],
    [{ status: 'not-configured' }, 503, null],
  ]) {
    const handler = createFeedbackHandler({ submit: async () => upstream, limit: () => {}, logCategory: () => {} });
    const result = await handler(makeRequest(validBody));
    assert.equal(result.status, expectedStatus);
    assert.equal(result.headers.get('retry-after'), retryAfter);
    if (expectedStatus === 503) {
      assert.deepEqual(await result.json(), { error: 'Masukan belum dapat dikirim saat ini. Coba lagi beberapa saat lagi.' });
    }
  }
});

test('feedback endpoint rejects non-JSON and overlarge request bodies', async () => {
  const handler = createFeedbackHandler({ submit: async () => ({ status: 'ok' }) });
  const nonJson = await handler(new Request('https://pusaka.test/api/feedback', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hello' }));
  assert.equal(nonJson.status, 415);
  const large = await handler(new Request('https://pusaka.test/api/feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ payload: 'x'.repeat(8192) }),
  }));
  assert.equal(large.status, 413);
});
