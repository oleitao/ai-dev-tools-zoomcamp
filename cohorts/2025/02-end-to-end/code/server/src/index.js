const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server: SocketIOServer } = require('socket.io');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In-memory store for session code state
const sessions = new Map();

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  const { sessionId } = socket.handshake.query;

  if (!sessionId) {
    socket.emit('error', { message: 'Missing sessionId' });
    socket.disconnect();
    return;
  }

  socket.join(sessionId);

  // Send initial state if we have it
  if (sessions.has(sessionId)) {
    socket.emit('initial_state', sessions.get(sessionId));
  }

  socket.on('code_change', (payload) => {
    const { code, language } = payload || {};
    const state = {
      code: typeof code === 'string' ? code : '',
      language: typeof language === 'string' ? language : 'javascript',
      updatedAt: new Date().toISOString()
    };

    sessions.set(sessionId, state);
    socket.to(sessionId).emit('code_change', state);
  });

  socket.on('disconnect', () => {
    // No session cleanup for now – sessions are ephemeral
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${PORT}`);
  });
}

module.exports = { app, server, io, sessions };
