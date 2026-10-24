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


const REQUEST_COOKIE = '__Host-zraw_purchase';
function requestState(row, now) {
  const day = new Date(now + 28800000).toISOString().slice(0, 10);
  const count = row?.day === day ? row.count : 0;
  const midnight = Date.parse(day + 'T00:00:00+08:00') + 86400000;
  return {count, retryAfter: Math.max(0, Math.ceil(((count >= 10 ? Math.max(midnight, row?.next || 0) : row?.next || 0) - now) / 1000))};
}
async function purchase(request, env) {
  const url = new URL(request.url);
  if (!['GET', 'POST'].includes(request.method)) return json({error:'Method not allowed'},405);
  if (request.method === 'POST' && (request.headers.get('Origin') !== url.origin || request.headers.get('X-ZRAW-Request') !== '1')) return json({error:'Same-origin requests only'},403);
  if (!env.VISITORS_DB) return json({error:'Request service unavailable'},503);
  const cookie = (request.headers.get('Cookie') || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(REQUEST_COOKIE+'='));
  const existing = cookie?.slice(REQUEST_COOKIE.length+1);
  const id = existing && UUID.test(existing) ? existing : crypto.randomUUID();
  const headers = {'Set-Cookie':REQUEST_COOKIE+'='+id+'; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict'};
  try {
    await env.VISITORS_DB.prepare('CREATE TABLE IF NOT EXISTS purchase_limits (id TEXT PRIMARY KEY, day TEXT NOT NULL, count INTEGER NOT NULL, next INTEGER NOT NULL)').run();
    const get = () => env.VISITORS_DB.prepare('SELECT day,count,next FROM purchase_limits WHERE id=?').bind(id).first();
    if (request.method === 'GET') return json(requestState(await get(),Date.now()),200,headers);
    if (!existing || !UUID.test(existing)) return json({error:'Please reload this page and allow cookies before sending.'},409,headers);
    if (url.hostname !== 'zraw.pages.dev') return json({error:'Use the production website to send requests.'},403);
    if (Number(request.headers.get('Content-Length')) > 4096) return json({error:'Request too large'},413);
    const input = await request.json();
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    if (!name || name.length>120 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Please enter your name and a valid email.'},400);
    const now = Date.now();
    const day = new Date(now+28800000).toISOString().slice(0,10);
    // One atomic reservation prevents concurrent tabs from forwarding duplicate mail.
    const reserved = await env.VISITORS_DB.prepare('INSERT INTO purchase_limits (id,day,count,next) VALUES (?,?,1,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,count=CASE WHEN purchase_limits.day=excluded.day THEN purchase_limits.count+1 ELSE 1 END,next=excluded.next WHERE purchase_limits.next<=? AND (purchase_limits.day<>excluded.day OR purchase_limits.count<10) RETURNING day,count,next').bind(id,day,now+60000,now).first();
    if (!reserved) {
      const state=requestState(await get(),now);
      return json({...state,error:state.count>=10?'Daily limit reached. Try again after midnight GMT+8.':'Please wait before sending another request.'},429,{'Retry-After':String(state.retryAfter)});
    }
    let delivered=false;
    try {
      const response=await fetch('https://formspree.io/f/xaqkydoe',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({name,email,_subject:'Z-COMMS Bundle Purchase Request',message:'Purchase request: Windows + Android bundle. PHP 1,500. Up to 5 registered devices and 2 in use simultaneously. Please send the terms and payment instructions. No payment collected.'}),signal:AbortSignal.timeout(20000)});
      delivered=response.ok;
    } catch { /* Keep reservation when delivery is uncertain to avoid duplicates. */ }
    const state=requestState(await get(),Date.now());
    return json({...state,...(delivered?{ok:true}:{error:'Delivery could not be confirmed. Please wait before retrying or contact zraw.services@gmail.com.'})},delivered?200:502);
  } catch { return json({error:'Request service temporarily unavailable. Please try again later.'},503); }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname === "/api/purchase-request") return purchase(request, env);
    if (new URL(request.url).pathname === "/api/visitors") return visitors(request, env);
    return env.ASSETS.fetch(request);
  },
};

