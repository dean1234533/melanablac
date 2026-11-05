import { DEFAULTS } from '../../src/shared/contentSchema.js';

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
export const err = (message, status = 400) => json({ error: message }, status);

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async (str) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(str)));
export const randomToken = (n = 32) => toHex(crypto.getRandomValues(new Uint8Array(n)));

export async function hashPassword(password, saltHex = randomToken(16)) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(saltHex), iterations: 100000 }, key, 256);
  return { hash: toHex(bits), salt: saltHex };
}
export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const parseCookies = (req) =>
  Object.fromEntries((req.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, v.join('=')]));

export async function getAdmin(req, env) {
  const tok = parseCookies(req).mb_session;
  if (!tok || !/^[a-f0-9]{64}$/.test(tok)) return null;
  const row = await env.DB.prepare('SELECT a.id, a.email FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ? AND s.expires > ?')
    .bind(await sha256(tok), Date.now()).first();
  return row || null;
}
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;
export const sessionCookie = (token, req, maxAge = ADMIN_SESSION_SECONDS) => {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `mb_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
};

export async function getContent(env) {
  const out = { ...DEFAULTS };
  try {
    const { results } = await env.DB.prepare('SELECT key, value FROM content').all();
    // Blank means "use the default", except video fields where blank means "hide this video".
    for (const r of results) if (r.value !== '' || /^video\.(hero|welcome|why|pause|motionList)$/.test(r.key)) out[r.key] = r.value;
  } catch {}
  return out;
}

export const slugify = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const siteUrl = (env, req) => (env.SITE_URL && !env.DEV_MODE ? env.SITE_URL : new URL(req.url).origin);

// ---------- Email (Resend) ----------
export async function sendEmail(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'RESEND_API_KEY not set' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM || 'MelanaBlac <onboarding@resend.dev>', to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  return { sent: r.ok, status: r.status, detail: r.ok ? undefined : await r.text() };
}

// ---------- Web Push (VAPID, payload-less; the service worker fetches the latest notification) ----------
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function vapidHeader(env, endpoint) {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: `mailto:${(env.ADMIN_EMAIL || 'admin@example.com').split(',')[0]}` })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}
export async function notifyAdmins(env, { title, body, url = '/admin/' }) {
  await env.DB.prepare('INSERT INTO notifications (title, body, url) VALUES (?,?,?)').bind(title, body, url).run();
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return { pushed: 0 };
  const { results } = await env.DB.prepare('SELECT endpoint FROM push_subs').all();
  let pushed = 0;
  await Promise.all(results.map(async ({ endpoint }) => {
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { authorization: await vapidHeader(env, endpoint), TTL: '86400', urgency: 'normal', 'content-length': '0' } });
      if (r.status === 404 || r.status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(endpoint).run();
      else if (r.ok) pushed++;
    } catch {}
  }));
  return { pushed };
}

// ---------- Stripe (optional) ----------
export async function stripeCheckout(env, { order, items, origin }) {
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('customer_email', order.email);
  p.set('client_reference_id', order.number);
  p.set('success_url', `${origin}/order/${order.number}?paid=1`);
  p.set('cancel_url', `${origin}/cart?cancelled=${order.number}`);
  // Stripe needs at least 30 minutes; unpaid sessions expire and the stock is released by the webhook.
  p.set('expires_at', String(Math.floor(Date.now() / 1000) + 31 * 60));
  p.set('metadata[order_number]', order.number);
  p.set('payment_intent_data[description]', `MelanaBlac order ${order.number}`);
  p.set('payment_intent_data[metadata][order_number]', order.number);
  items.forEach((it, i) => {
    p.set(`line_items[${i}][quantity]`, String(it.qty));
    p.set(`line_items[${i}][price_data][currency]`, 'gbp');
    p.set(`line_items[${i}][price_data][unit_amount]`, String(it.price_pence));
    p.set(`line_items[${i}][price_data][product_data][name]`, it.title);
    const img = it.image && it.image.startsWith('/') ? origin + it.image : it.image;
    if (img && /^https:\/\//.test(img)) p.set(`line_items[${i}][price_data][product_data][images][0]`, img);
  });
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': `mb-checkout-${order.number}` }, body: p });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Stripe error');
  return j;
}
export async function stripeExpire(env, sessionId) {
  const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, { method: 'POST', headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Stripe error');
  return j;
}
export async function verifyStripeSig(env, raw, header, now = Date.now()) {
  if (!env.STRIPE_WEBHOOK_SECRET || !header) return false;
  const pairs = header.split(',').map((x) => x.trim().split('='));
  const t = pairs.find(([k]) => k === 't')?.[1];
  const sigs = pairs.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now / 1000 - Number(t)) > 300) return false; // reject replays older than 5 minutes
  const key = await crypto.subtle.importKey('raw', enc.encode(env.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${raw}`)));
  return sigs.some((v) => safeEqual(sig, v));
}
