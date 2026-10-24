const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function createClient(response) {
  const storage = new Map();
  const events = new EventTarget();
  const requests = [];
  const context = {
    exports: {},
    process: { env: {} },
    Event,
    window: events,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return response;
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, context);
  return { api: context.exports, events, requests };
}

test('a rejected session clears the token and notifies the current tab', async () => {
  const { api, events, requests } = createClient({ status: 401 });
  api.setAuthToken('expired-token');
  const tokens = [];
  events.addEventListener(api.AUTH_TOKEN_CHANGED_EVENT, () => tokens.push(api.getAuthToken()));

  await assert.rejects(api.hostAPI.getAll(), { name: 'UnauthorizedError' });

  assert.equal(requests[0].options.headers.Authorization, 'Bearer expired-token');
  assert.equal(api.getAuthToken(), null);
  assert.deepEqual(tokens, [null]);
});

test('successful host loading preserves the session and returns the hosts', async () => {
  const hosts = [{ id: 1, name: 'Test host' }];
  const { api } = createClient({ status: 200, ok: true, json: async () => hosts });
  api.setAuthToken('valid-token');

  assert.deepEqual(await api.hostAPI.getAll(), hosts);
  assert.equal(api.getAuthToken(), 'valid-token');
});

test('server errors do not clear a valid session', async () => {
  const { api } = createClient({
    status: 500,
    ok: false,
    json: async () => ({ error: 'Failed to fetch hosts' }),
  });
  api.setAuthToken('valid-token');

  await assert.rejects(api.hostAPI.getAll(), { message: 'Failed to fetch hosts' });
  assert.equal(api.getAuthToken(), 'valid-token');
});