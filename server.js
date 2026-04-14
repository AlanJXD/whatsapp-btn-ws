const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// ── Shared state (in-memory, all clients stay in sync) ──────────────────────
const state = { phone: '', message: '' };
const clients = new Set();

// ── HTTP server (serves public/index.html) ───────────────────────────────────
const server = http.createServer((req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

// ── WebSocket server (shares same HTTP port via upgrade) ─────────────────────
const wss = new WebSocketServer({ server });

// Broadcast helper — send to all clients, optionally skip one
function broadcast(data, exclude = null) {
  const payload = JSON.stringify(data);
  for (const ws of clients) {
    if (ws === exclude) continue;
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

// Send to every connected client including sender
function broadcastAll(data) {
  broadcast(data, null);
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  clients.add(ws);
  console.log(`[+] Cliente conectado desde ${ip} | Total: ${clients.size}`);

  // 1. Send current state + count to the new client
  ws.send(JSON.stringify({
    type: 'init',
    state: { ...state },
    clientCount: clients.size,
  }));

  // 2. Notify everyone about the new count
  broadcastAll({ type: 'client_count', count: clients.size });

  // ── Incoming messages ────────────────────────────────────────────────────
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore malformed
    }

    switch (msg.type) {
      case 'input_change':
        if (msg.field === 'phone' || msg.field === 'message') {
          // Sanitize: value must be a string, cap at 64 KB
          const value = String(msg.value ?? '').slice(0, 65536);
          state[msg.field] = value;
          // Relay to all OTHER clients so they stay in sync
          broadcast({ type: 'input_change', field: msg.field, value }, ws);
        }
        break;

      case 'typing_start':
      case 'typing_stop':
        if (msg.field === 'phone' || msg.field === 'message') {
          broadcast({ type: msg.type, field: msg.field }, ws);
        }
        break;
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Cliente desconectado | Total: ${clients.size}`);
    broadcastAll({ type: 'client_count', count: clients.size });
  });

  ws.on('error', (err) => {
    console.error('WS error:', err.message);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n✅  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔌  WebSocket listo en ws://localhost:${PORT}\n`);
});
