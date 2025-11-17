const express = require('express');

const router = express.Router();

const listeners = new Set();
let lastCall = null;
let sequence = 0;
let secretWarningLogged = false;

function sanitizePhone(rawValue) {
  if (rawValue == null) {
    return { display: '', digits: '' };
  }
  const str = String(rawValue).trim();
  if (!str) {
    return { display: '', digits: '' };
  }

  let digits = str.replace(/\D/g, '');
  const startsWithPlus = str.startsWith('+');

  if (!digits) {
    return { display: '', digits: '' };
  }

  if (digits.length > 20) {
    digits = digits.slice(0, 20);
  }

  const display = startsWithPlus ? `+${digits}` : digits;
  return { display, digits };
}

function broadcast(event) {
  const payload = `id: ${event.id}\nevent: call\ndata: ${JSON.stringify(event)}\n\n`;
  for (const listener of Array.from(listeners)) {
    try {
      listener.res.write(payload);
    } catch (err) {
      cleanupListener(listener);
    }
  }
}

function cleanupListener(listener) {
  if (!listener) return;
  if (listener.heartbeat) {
    clearInterval(listener.heartbeat);
  }
  listeners.delete(listener);
}

router.post('/', (req, res) => {
  const expectedSecret = process.env.PBX_WEBHOOK_SECRET;
  const providedSecret = req.get('x-pbx-secret') || req.body?.secret || req.query?.secret;

  if (expectedSecret) {
    if (!providedSecret || providedSecret !== expectedSecret) {
      return res.status(401).json({ error: 'invalid secret' });
    }
  } else if (!secretWarningLogged) {
    console.warn('[incoming-calls] Atenție: PBX_WEBHOOK_SECRET nu este setat. Webhook-urile sunt acceptate fără autentificare.');
    secretWarningLogged = true;
  }

  const { display, digits } = sanitizePhone(req.body?.phone ?? req.body?.caller ?? req.body?.number ?? '');

  if (!display && !digits) {
    return res.status(400).json({ error: 'phone missing' });
  }

  const extension = req.body?.extension != null ? String(req.body.extension).trim() : null;
  const source = req.body?.source != null ? String(req.body.source).trim() : null;

  const event = {
    id: String(++sequence),
    phone: display || digits,
    digits,
    extension: extension || null,
    source: source || null,
    received_at: new Date().toISOString(),
  };

  lastCall = event;
  broadcast(event);

  return res.json({ success: true });
});

router.get('/stream', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'auth required' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write('retry: 4000\n\n');

  const listener = { res };
  listener.heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (err) {
      cleanupListener(listener);
    }
  }, 25000);

  req.on('close', () => cleanupListener(listener));
  req.on('end', () => cleanupListener(listener));
  res.on('close', () => cleanupListener(listener));
  res.on('finish', () => cleanupListener(listener));

  listeners.add(listener);

  if (lastCall) {
    res.write(`id: ${lastCall.id}\nevent: call\ndata: ${JSON.stringify(lastCall)}\n\n`);
  }
});

router.get('/last', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'auth required' });
  }
  res.json({ call: lastCall });
});

module.exports = router;
