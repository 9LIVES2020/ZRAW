const COOKIE = "__Host-zraw_visitor";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body, status = 200, extra = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
  });
}

async function visitors(request, env) {
  if (!["GET", "POST"].includes(request.method)) {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
  }
  const url = new URL(request.url);
  if (request.method === "POST" && (
    request.headers.get("Origin") !== url.origin ||
    request.headers.get("X-ZRAW-Visit") !== "1"
  )) return json({ error: "Same-origin visits only" }, 403);

  if (!env.VISITORS_DB) return json({ error: "Counter unavailable" }, 503);

  try {
    // Preview deployments and read-only requests must not inflate production counts.
    if (request.method === "GET" || url.hostname !== "zraw.pages.dev") {
      const row = await env.VISITORS_DB.prepare("SELECT total FROM visitor_total WHERE id = 1").first();
      return json({ count: row.total });
    }

    const cookie = (request.headers.get("Cookie") || "").split(";")
      .map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
    const existing = cookie?.slice(COOKIE.length + 1);
    const visitorId = existing && UUID.test(existing) ? existing : crypto.randomUUID();
    // The primary key and INSERT trigger count each anonymous browser ID once.
    // D1 batches are transactional, so concurrent visitors do not lose increments.
    const results = await env.VISITORS_DB.batch([
      env.VISITORS_DB.prepare("INSERT OR IGNORE INTO visitors (id) VALUES (?)").bind(visitorId),
      env.VISITORS_DB.prepare("SELECT total FROM visitor_total WHERE id = 1"),
    ]);
    return json({ count: results[1].results[0].total }, 200, {
      "Set-Cookie": `${COOKIE}=${visitorId}; Path=/; Max-Age=34560000; HttpOnly; Secure; SameSite=Lax`,
    });
  } catch {
    return json({ error: "Counter temporarily unavailable" }, 503);
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/api/visitors") return visitors(request, env);
    return env.ASSETS.fetch(request);
  },
};
