# Coding Interview Platform

This folder contains the end‑to‑end coding interview application for the Week 2 homework.

Currently only the backend (API + WebSocket server) is implemented in `server/`. The frontend will be added later.

## Backend

### 1. Install dependencies

```bash
cd cohorts/2025/02-end-to-end/code/server
npm install
```

### 2. Run the backend in dev mode

```bash
npm run dev
```

The server listens on `http://localhost:3001` by default.

Health check endpoint:

```bash
curl http://localhost:3001/health
```

### 3. Run the tests

Integration tests (HTTP + WebSocket) are implemented with Jest.

```bash
npm test
```
