require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const axios = require('axios');

// ── Shared state (in-memory, all clients stay in sync) ──────────────────────
const state = { phone: '523111106698', message: '' };
const clients = new Set();

// ── HTTP server (serves public/index.html + Email API) ───────────────────────
const server = http.createServer(async (req, res) => {
  // Handle Email API
  if (req.method === 'POST' && req.url === '/api/send-email') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { to, subject, body: content } = JSON.parse(body);
        
        const htmlTemplate = `
   <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Propuesta Comercial</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF2F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <!-- Preheader hidden text -->
  <div style="display:none;max-height:0;overflow:hidden;color:#EEF2F7;">
    Una propuesta diseñada especialmente para ti ✦
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF2F7;padding:32px 16px 48px;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ══ TOP LOGO BAR ══ -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#0D1B2A;border-radius:100px;padding:10px 22px;">
                    <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                      ✦ &nbsp;Alan López &nbsp;·&nbsp; Software a Medida
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ══ HERO CARD ══ -->
          <tr>
            <td style="background:#0D1B2A;border-radius:20px 20px 0 0;padding:0;overflow:hidden;">

              <!-- Hero illustration area -->
              <div style="background:linear-gradient(135deg,#0D1B2A 0%,#1a2d45 50%,#0D1B2A 100%);padding:48px 48px 0;text-align:center;position:relative;">

                <!-- Circuit SVG illustration -->
                <div style="display:inline-block;position:relative;margin-bottom:-8px;">
                  <svg width="320" height="180" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
                    <!-- Background glow -->
                    <ellipse cx="160" cy="140" rx="130" ry="30" fill="#1E88E5" fill-opacity="0.12"/>

                    <!-- Monitor stand -->
                    <rect x="140" y="148" width="40" height="10" rx="3" fill="#1E3A5F"/>
                    <rect x="125" y="156" width="70" height="8" rx="4" fill="#1E3A5F"/>

                    <!-- Monitor body -->
                    <rect x="40" y="30" width="240" height="125" rx="12" fill="#1E3A5F"/>
                    <rect x="40" y="30" width="240" height="125" rx="12" stroke="#1E88E5" stroke-width="2" stroke-opacity="0.6"/>

                    <!-- Screen bezel -->
                    <rect x="52" y="42" width="216" height="100" rx="6" fill="#0A1628"/>

                    <!-- Circuit lines on screen -->
                    <!-- Horizontal lines -->
                    <line x1="70" y1="72" x2="140" y2="72" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.7"/>
                    <line x1="140" y1="72" x2="140" y2="92" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.7"/>
                    <line x1="140" y1="92" x2="200" y2="92" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.7"/>
                    <line x1="200" y1="92" x2="200" y2="72" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.7"/>
                    <line x1="200" y1="72" x2="250" y2="72" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.7"/>

                    <line x1="70" y1="112" x2="110" y2="112" stroke="#00C853" stroke-width="1.5" stroke-opacity="0.6"/>
                    <line x1="110" y1="112" x2="110" y2="130" stroke="#00C853" stroke-width="1.5" stroke-opacity="0.6"/>
                    <line x1="110" y1="130" x2="170" y2="130" stroke="#00C853" stroke-width="1.5" stroke-opacity="0.6"/>
                    <line x1="170" y1="130" x2="170" y2="112" stroke="#00C853" stroke-width="1.5" stroke-opacity="0.6"/>
                    <line x1="170" y1="112" x2="250" y2="112" stroke="#1E88E5" stroke-width="1.5" stroke-opacity="0.5"/>

                    <!-- Nodes (circles) -->
                    <circle cx="70" cy="72" r="5" fill="#1E88E5" fill-opacity="0.9"/>
                    <circle cx="140" cy="72" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="140" cy="92" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="200" cy="92" r="5" fill="#1E88E5" fill-opacity="0.9"/>
                    <circle cx="200" cy="72" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="250" cy="72" r="5" fill="#00C853" fill-opacity="0.9"/>

                    <circle cx="70" cy="112" r="4" fill="#00C853" fill-opacity="0.9"/>
                    <circle cx="110" cy="112" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="110" cy="130" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="170" cy="130" r="5" fill="#1E88E5" fill-opacity="0.9"/>
                    <circle cx="170" cy="112" r="4" fill="#ffffff" fill-opacity="0.9"/>
                    <circle cx="250" cy="112" r="5" fill="#00C853" fill-opacity="0.9"/>

                    <!-- Small gear top-right -->
                    <g transform="translate(234,50)" opacity="0.7">
                      <circle cx="8" cy="8" r="4" fill="none" stroke="#1E88E5" stroke-width="1.5"/>
                      <circle cx="8" cy="8" r="1.5" fill="#1E88E5"/>
                      <line x1="8" y1="2" x2="8" y2="0" stroke="#1E88E5" stroke-width="1.5"/>
                      <line x1="8" y1="14" x2="8" y2="16" stroke="#1E88E5" stroke-width="1.5"/>
                      <line x1="2" y1="8" x2="0" y2="8" stroke="#1E88E5" stroke-width="1.5"/>
                      <line x1="14" y1="8" x2="16" y2="8" stroke="#1E88E5" stroke-width="1.5"/>
                    </g>

                    <!-- Small gear bottom-left -->
                    <g transform="translate(58,118)" opacity="0.5">
                      <circle cx="8" cy="8" r="4" fill="none" stroke="#00C853" stroke-width="1.5"/>
                      <circle cx="8" cy="8" r="1.5" fill="#00C853"/>
                      <line x1="8" y1="2" x2="8" y2="0" stroke="#00C853" stroke-width="1.5"/>
                      <line x1="8" y1="14" x2="8" y2="16" stroke="#00C853" stroke-width="1.5"/>
                      <line x1="2" y1="8" x2="0" y2="8" stroke="#00C853" stroke-width="1.5"/>
                      <line x1="14" y1="8" x2="16" y2="8" stroke="#00C853" stroke-width="1.5"/>
                    </g>

                    <!-- Sparkle star -->
                    <g transform="translate(75,45)" opacity="0.9">
                      <line x1="8" y1="0" x2="8" y2="16" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                      <line x1="0" y1="8" x2="16" y2="8" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                      <line x1="2.3" y1="2.3" x2="13.7" y2="13.7" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
                      <line x1="13.7" y1="2.3" x2="2.3" y2="13.7" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
                    </g>

                    <!-- Dot accents scattered -->
                    <circle cx="90" cy="55" r="2" fill="#1E88E5" fill-opacity="0.4"/>
                    <circle cx="230" cy="130" r="2" fill="#00C853" fill-opacity="0.4"/>
                    <circle cx="260" cy="55" r="1.5" fill="#ffffff" fill-opacity="0.3"/>
                    <circle cx="65" cy="135" r="1.5" fill="#1E88E5" fill-opacity="0.3"/>
                  </svg>
                </div>
              </div>

            </td>
          </tr>

          <!-- ══ MAIN CONTENT CARD ══ -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 20px 20px;padding:44px 48px 40px;border-left:1px solid #E5E9F0;border-right:1px solid #E5E9F0;border-bottom:1px solid #E5E9F0;">

              <!-- Title -->
              <h1 style="margin:0 0 6px;font-size:32px;font-weight:800;color:#0D1B2A;line-height:1.15;letter-spacing:-0.03em;">
                ${subject}
              </h1>
              <div style="width:48px;height:4px;background:linear-gradient(90deg,#1E88E5,#00C853);border-radius:2px;margin-bottom:28px;"></div>

              <!-- Greeting -->
              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.75;">
                ${content}
              </p>

              <!-- Divider -->
              <div style="height:1px;background:linear-gradient(90deg,#E5E9F0,transparent);margin:32px 0;"></div>

              <!-- 3 benefit pills -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                <tr>
                  <td width="33%" style="padding:0 6px 0 0;vertical-align:top;">
                    <div style="background:#F0F7FF;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:22px;margin-bottom:6px;">⚙️</div>
                      <div style="font-size:12px;font-weight:700;color:#0D1B2A;letter-spacing:0.04em;text-transform:uppercase;">A Medida</div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;line-height:1.4;">Soluciones diseñadas para tu negocio</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:0 3px;vertical-align:top;">
                    <div style="background:#F0FFF5;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:22px;margin-bottom:6px;">🚀</div>
                      <div style="font-size:12px;font-weight:700;color:#0D1B2A;letter-spacing:0.04em;text-transform:uppercase;">Entrega Rápida</div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;line-height:1.4;">Sprints ágiles con resultados reales</div>
                    </div>
                  </td>
                  <td width="33%" style="padding:0 0 0 6px;vertical-align:top;">
                    <div style="background:#FFF8F0;border-radius:12px;padding:16px;text-align:center;">
                      <div style="font-size:22px;margin-bottom:6px;">🤝</div>
                      <div style="font-size:12px;font-weight:700;color:#0D1B2A;letter-spacing:0.04em;text-transform:uppercase;">Soporte</div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;line-height:1.4;">Acompañamiento continuo post-entrega</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/${state.phone || ''}"
                       style="display:inline-block;padding:16px 40px;background:#25D366;color:#ffffff;text-decoration:none;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.04em;box-shadow:0 8px 24px rgba(37,211,102,0.35);">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/32px-WhatsApp.svg.png" width="20" height="20" style="vertical-align:middle;margin-right:8px;display:inline-block;" alt="WhatsApp">
                      Hablemos por WhatsApp
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ══ SPACER ══ -->
          <tr><td style="height:20px;"></td></tr>

          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="background:#0D1B2A;border-radius:16px;padding:28px 40px;text-align:center;">

              <!-- Sender name -->
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.01em;">
                Alan López
              </p>
              <p style="margin:0 0 16px;font-size:12px;color:#6B9EC7;letter-spacing:0.05em;text-transform:uppercase;">
                Desarrollo de Software · Consultoría Tech
              </p>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.08);margin:0 0 16px;"></div>

              <!-- Links row -->
              <p style="margin:0 0 12px;font-size:12px;color:#6B9EC7;line-height:2;">
                <a href="mailto:alan@alanjhosel.com" style="color:#1E88E5;text-decoration:none;">alan@alanjhosel.com</a>
                &nbsp;·&nbsp;
                <a href="tel:+523111106698" style="color:#1E88E5;text-decoration:none;">+52 311 110 6698</a>
                &nbsp;·&nbsp;
                <a href="https://amary.pro" style="color:#1E88E5;text-decoration:none;">amary.pro</a>
              </p>

              <!-- Legal -->
           <p style="margin:0;font-size:11px;color:#3D5A73;line-height:1.6;">
            Este mensaje es una propuesta comercial enviada por Alan López.<br/>
            Si no deseas recibir más propuestas, simplemente ignora este correo.
          </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
        `;

        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
          sender: { 
            name: process.env.FROM_NAME || 'Alan López', 
            email: process.env.FROM_EMAIL || 'alan@alanjhosel.com' 
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlTemplate
        }, {
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Email sent' }));
      } catch (err) {
        console.error('Error sending email:', err.response?.data || err.message);
        res.writeHead(err.response?.status || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: err.response?.data?.message || 'Error sending email' 
        }));
      }
    });
    return;
  }

  // Serve Static Files
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
