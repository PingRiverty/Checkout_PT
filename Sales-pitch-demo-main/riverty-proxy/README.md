# Riverty PT proxy

The live demo (`live/index.html`) runs on GitHub Pages, which can't keep secrets.
This Cloudflare Worker holds the Riverty API key and forwards two calls:

| Demo calls | Worker forwards to Riverty PT |
|---|---|
| `POST /checkout/NL` | `POST https://api.bnpl-pt.riverty.io/api/v3/hosted-checkout/request` |
| `GET /orders/NL/{orderNumber}` | `GET https://api.bnpl-pt.riverty.io/api/v3/orders/{orderNumber}` |

It only accepts requests from `https://pingriverty.github.io`, and only lets
Riverty send shoppers back to that site.

## Set up (once)

1. Create a free Cloudflare account and install Node.js.
2. In this folder, sign in: `npx wrangler login`
3. Add the NL key as a secret (paste it when asked, never into a file):
   `npx wrangler secret put RIVERTY_KEY_NL`
4. Deploy: `npx wrangler deploy`. The URL is printed at the end, for example
   `https://riverty-proxy.<your-name>.workers.dev`.
5. In `live/index.html`, set `RIVERTY_PROXY_URL` to that URL and push to GitHub.

## Before the first real test, confirm with the Riverty developers

- `CREATE_PATH` in `worker.js` is the create-checkout path (they only shared GetOrder).
- `successStatuses` in `live/index.html` lists the GetOrder statuses that mean paid (now `Accepted`).

## Adding Germany later

Add the key with `npx wrangler secret put RIVERTY_KEY_DE`, then add `'DE'` to
`RIVERTY_LIVE.markets` in `live/index.html`.
