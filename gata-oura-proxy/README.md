# gata-oura-proxy

A tiny [Cloudflare Worker](https://workers.cloudflare.com/) that lets the Gata
PWA read Oura ring data from the browser.

## Read this first

- **You don't need an Oura account or ring to set this up.** This relay holds
  **no** Oura token and no secrets. Every person who uses Gata creates *their
  own* Personal Access Token on *their own* Oura account, and it stays on
  *their own* device — it's sent through the relay on each request and never
  stored.
- The relay exists for one boring reason: Oura's API (`api.ouraring.com`) does
  **not** send CORS headers, so a browser can't call it directly. The relay
  adds CORS and forwards the request. That's all it does. Only read-only
  `GET`s to `/v2/usercollection/*` pass through.
- It's a one-time, ~2-minute, **free** step (Cloudflare's free tier is plenty).

## Option A — deploy this Worker (recommended)

```bash
npm i -g wrangler      # once
wrangler deploy        # from this folder
```

…or paste `worker.js` into a new Worker at
[dash.cloudflare.com](https://dash.cloudflare.com) → Workers → Create.

Then point Gata at it — in `app.js`:

```js
const OURA_API_BASE = "https://gata-oura-proxy.<you>.workers.dev";
```

## Option B — reuse the Worker you already have

If you already run the `gata-ai-proxy` Worker (the one that powers Ask Gata /
Yapping), you can serve Oura from that **same** Worker instead of deploying a
second one — add this at the top of its `fetch` handler and redeploy:

```js
// --- Oura relay (read-only passthrough; forwards the caller's own token) ---
const u = new URL(request.url);
if (u.pathname.startsWith("/v2/usercollection/")) {
  const cors = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const auth = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return new Response('{"error":"Missing Oura token"}', { status: 401, headers: { "content-type": "application/json", ...cors } });
  const r = await fetch("https://api.ouraring.com" + u.pathname + u.search, { headers: { Authorization: auth } });
  const body = await r.text();
  return new Response(body, { status: r.status, headers: { "content-type": r.headers.get("content-type") || "application/json", ...cors } });
}
// --- end Oura relay ---
```

Then set `OURA_API_BASE` in `app.js` to that Worker's URL.

## Optional hardening

Lock `ALLOW_ORIGIN` in `worker.js` (or the snippet's `Access-Control-Allow-Origin`)
to your Gata domain instead of `"*"`.

## How each person connects (no help from you needed)

1. In a browser, sign in at **cloud.ouraring.com**.
2. Open **Personal Access Tokens** → **Create New Personal Access Token**.
3. In Gata: **More → Oura Ring → Connect Oura**, paste the token. (Or just ask
   Gata "how do I connect my Oura ring?" — she'll walk you through it.)

Sleep, HRV, resting heart rate, readiness, respiratory rate, SpO₂ and
body-temperature shift then flow into each day automatically.
