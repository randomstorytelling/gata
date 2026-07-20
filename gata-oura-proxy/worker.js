/* ============================================================
   gata-oura-proxy — a tiny Cloudflare Worker so the Gata PWA can
   read Oura data from the browser.

   Oura's API (api.ouraring.com) doesn't send CORS headers, so a
   browser can't call it directly. This Worker adds CORS and forwards
   the request, passing through the caller's own
     Authorization: Bearer <Oura Personal Access Token>
   header. It holds NO secrets — each person's token travels from
   their own device on every request and is never stored here. Only
   read-only GETs to /v2/usercollection/* are allowed through.

   Deploy:
     1) npm i -g wrangler   (once)
     2) wrangler deploy     (from this folder)
        — or paste this file into a new Worker at dash.cloudflare.com.
     3) Set OURA_API_BASE in app.js to this Worker's URL, e.g.
        const OURA_API_BASE = "https://gata-oura-proxy.<you>.workers.dev";
     4) (Optional) lock ALLOW_ORIGIN below to your Gata domain.
   ============================================================ */
const OURA = "https://api.ouraring.com";
const ALLOW_ORIGIN = "*"; // e.g. "https://gata-e2e81.firebaseapp.com" to restrict

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN === "*" ? (origin || "*") : ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "*";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405, headers: cors(origin) });

    const inUrl = new URL(request.url);
    // only proxy the read-only Oura user-collection endpoints
    if (!inUrl.pathname.startsWith("/v2/usercollection/")) {
      return new Response("Not found", { status: 404, headers: cors(origin) });
    }
    const auth = request.headers.get("Authorization") || "";
    if (!/^Bearer\s+\S+/.test(auth)) {
      return json({ error: "Missing Oura token" }, 401, origin);
    }

    const target = OURA + inUrl.pathname + inUrl.search;
    let res;
    try {
      res = await fetch(target, { method: "GET", headers: { Authorization: auth } });
    } catch (e) {
      return json({ error: "Upstream fetch failed" }, 502, origin);
    }
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json", ...cors(origin) },
    });
  },
};

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...cors(origin) } });
}
