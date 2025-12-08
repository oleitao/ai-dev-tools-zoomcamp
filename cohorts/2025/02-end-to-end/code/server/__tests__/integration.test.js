const request = require('supertest');
const { io: ClientIO } = require('socket.io-client');
const { app, server } = require('../src/index.js');

const TEST_PORT = 4001;
let httpServer;

beforeAll((done) => {
  httpServer = server.listen(TEST_PORT, () => done());
});

afterAll((done) => {
  httpServer.close(() => done());
});

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});

test('WebSocket broadcasts code changes between clients', (done) => {
  const url = `http://localhost:${TEST_PORT}`;
  const sessionId = 'test-session';

  const clientOptions = {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    query: { sessionId }
  };

  const sender = ClientIO(url, clientOptions);
  const receiver = ClientIO(url, clientOptions);

  const sampleCode = 'print(\"hello from test\")';
  const sampleLanguage = 'python';

  receiver.on('code_change', (state) => {
    try {
      expect(state.code).toBe(sampleCode);
      expect(state.language).toBe(sampleLanguage);
      sender.disconnect();
      receiver.disconnect();
      done();
    } catch (err) {
      done(err);
    }
  });

  receiver.on('connect', () => {
    sender.emit('code_change', {
      code: sampleCode,
      language: sampleLanguage
    });
  });
}
);
