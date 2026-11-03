// Riverty PT proxy for the live checkout demo (Cloudflare Worker).
// The demo page is static (GitHub Pages), so it cannot hold the API key.
// This Worker adds the key from its secrets and forwards two calls:
//   POST /checkout/{market}                 -> Riverty create hosted checkout
//   GET  /orders/{market}/{orderNumber}     -> Riverty GetOrder
// Keys are Worker secrets (RIVERTY_KEY_NL, later RIVERTY_KEY_DE), never in this file.

const RIVERTY_BASE = 'https://api.bnpl-pt.riverty.io';
// Create-checkout path: confirm with the Riverty developers (they shared GetOrder only).
const CREATE_PATH = '/api/v3/hosted-checkout/request';
const ALLOWED_ORIGINS = ['https://pingriverty.github.io'];
const MARKET_KEYS = { NL: 'RIVERTY_KEY_NL', DE: 'RIVERTY_KEY_DE' };
const MAX_BODY = 64 * 1024;

function allowedOrigin(origin, env) {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Local testing only, switched on with the ALLOW_LOCALHOST variable.
  return env.ALLOW_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(status, data, origin) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!allowedOrigin(origin, env)) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    const parts = new URL(request.url).pathname.split('/').filter(Boolean);
    const market = (parts[1] || '').toUpperCase();
    const key = MARKET_KEYS[market] && env[MARKET_KEYS[market]];
    if (!key) return json(400, { error: 'Market not enabled: ' + market }, origin);
    const base = env.RIVERTY_BASE || RIVERTY_BASE;

    let upstream;
    if (request.method === 'POST' && parts[0] === 'checkout' && parts.length === 2) {
      const text = await request.text();
      if (text.length > MAX_BODY) return json(413, { error: 'Request too large' }, origin);
      let body;
      try { body = JSON.parse(text); } catch (e) { return json(400, { error: 'Invalid JSON' }, origin); }
      // Riverty must only ever send shoppers back to the demo site.
      const back = String(body.merchantUrl || '');
      if (!allowedOrigin(back.split('/').slice(0, 3).join('/'), env)) return json(400, { error: 'merchantUrl not allowed' }, origin);
      upstream = await fetch(base + CREATE_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Key': key },
        body: JSON.stringify(body),
      });
    } else if (request.method === 'GET' && parts[0] === 'orders' && parts.length === 3) {
      const number = decodeURIComponent(parts[2]);
      if (!/^[A-Za-z0-9-]{1,50}$/.test(number)) return json(400, { error: 'Invalid order number' }, origin);
      upstream = await fetch(base + '/api/v3/orders/' + encodeURIComponent(number), {
        headers: { 'X-Auth-Key': key },
      });
    } else {
      return json(404, { error: 'Not found' }, origin);
    }

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json', ...cors(origin) },
    });
  },
};
