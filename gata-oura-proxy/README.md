# gata-oura-proxy

A tiny [Cloudflare Worker](https://workers.cloudflare.com/) that lets the Gata
PWA read Oura ring data from the browser.

## Why it exists

Oura's API (`api.ouraring.com`) does **not** send CORS headers, so a browser
can't call it directly. This Worker adds CORS and forwards the request,
passing through the caller's own `Authorization: Bearer <token>` header.

It holds **no secrets**. Each person's Oura Personal Access Token travels from
their own device on every request and is never stored here. Only read-only
`GET`s to `/v2/usercollection/*` are allowed through.

## Deploy

```bash
npm i -g wrangler      # once
wrangler deploy        # from this folder
```

…or paste `worker.js` into a new Worker at
[dash.cloudflare.com](https://dash.cloudflare.com) → Workers.

Then point Gata at it — in `app.js`:

```js
const OURA_API_BASE = "https://gata-oura-proxy.<you>.workers.dev";
```

Optionally lock `ALLOW_ORIGIN` in `worker.js` to your Gata domain instead of
`"*"`.

## How each person connects

1. In a browser, sign in at **cloud.ouraring.com**.
2. Open **Personal Access Tokens** → **Create New Personal Access Token**.
3. In Gata: **More → Oura Ring → Connect Oura**, paste the token.

Sleep, HRV, resting heart rate, readiness, respiratory rate, SpO₂ and
body-temperature shift then flow into each day automatically.
