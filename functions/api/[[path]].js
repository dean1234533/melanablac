import { optimizedImage, MAX_UPLOAD_BYTES } from '../../src/shared/mediaPolicy.js';
import { mediaResponse, storeMedia, readLimitedBody, validMediaBytes } from '../lib/media.js';
import { consumeAuthLimit, validAdminRequest } from '../lib/adminAuth.js';
import { json, err, sha256, randomToken, hashPassword, safeEqual, getAdmin, sessionCookie, ADMIN_SESSION_SECONDS, getContent, slugify, sendEmail, notifyAdmins, stripeCheckout, stripeExpire, verifyStripeSig, siteUrl, esc } from '../lib/util.js';
import { CONTENT_FIELDS, formatPrice } from '../../src/shared/contentSchema.js';
import { deliveryFeePence, DELIVERY_ITEM_ID } from '../../src/shared/delivery.js';

const isEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');
const adminEmails = (env) => (env.ADMIN_EMAIL || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const clip = (v, n) => String(v ?? '').slice(0, n);
const parseProduct = (r) => ({ ...r, images: JSON.parse(r.images || '[]').map(optimizedImage) });
const validPassword = (p) => typeof p === 'string' && p.length >= 10 && p.length <= 200;

async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const seg = (params.path || []);
  const method = request.method;
  const route = seg[0];
  try {
    // ---------- public ----------
    if (route === 'site' && method === 'GET') {
      const content = await getContent(env);
      const { results: slides } = await env.DB.prepare('SELECT * FROM slides ORDER BY sort, id').all();
      const { results: cats } = await env.DB.prepare("SELECT DISTINCT category FROM products WHERE status='published' ORDER BY category").all();
      const { results: featured } = await env.DB.prepare("SELECT * FROM products WHERE status='published' AND featured=1 ORDER BY sort LIMIT 8").all();
      return json({ content, slides: slides.map((s) => ({ ...s, image: optimizedImage(s.image) })), categories: cats.map((c) => c.category), featured: featured.map(parseProduct) }, 200, { 'cache-control': 'public, max-age=30' });
    }
    if (route === 'products' && method === 'GET') {
      if (seg[1]) {
        const r = await env.DB.prepare("SELECT * FROM products WHERE slug = ? AND status='published'").bind(seg[1]).first();
        return r ? json(parseProduct(r)) : err('Not found', 404);
      }
      const cat = url.searchParams.get('category');
      const q = cat ? env.DB.prepare("SELECT * FROM products WHERE status='published' AND category=? ORDER BY sort, id DESC").bind(cat) : env.DB.prepare("SELECT * FROM products WHERE status='published' ORDER BY sort, id DESC");
      return json((await q.all()).results.map(parseProduct));
    }
    if (route === 'media' && ['GET', 'HEAD'].includes(method)) {
      const key = seg.slice(1).join('/');
      if (env.MEDIA) {
        const obj = await env.MEDIA.get(key);
        if (obj) return mediaResponse(request, await new Response(obj.body).arrayBuffer(), obj.httpMetadata?.contentType || 'application/octet-stream');
      }
      const row = await env.DB.prepare('SELECT type, data FROM media WHERE key = ?').bind(key).first();
      if (!row) return new Response('Not found', { status: 404 });
      const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0));
      return mediaResponse(request, bin, row.type);
    }
    if (route === 'contact' && method === 'POST') {
      const b = await body(request);
      if (!b.name || !isEmail(b.email) || !b.body) return err('Please fill in name, a valid email and a message.');
      if (b.website) return json({ ok: true }); // honeypot
      await env.DB.prepare('INSERT INTO messages (name,email,body) VALUES (?,?,?)').bind(clip(b.name, 120), clip(b.email, 200), clip(b.body, 5000)).run();
      await notifyAdmins(env, { title: 'New message', body: `${clip(b.name, 60)}: ${clip(b.body, 100)}`, url: '/admin/messages' });
      // Email the enquiry to the owner; replying to the email replies to the visitor.
      const owner = (env.NOTIFY_EMAIL || '').split(',')[0].trim() || adminEmails(env)[0];
      if (owner) {
        try {
          const mail = await sendEmail(env, { to: owner, replyTo: clip(b.email, 200), subject: `New MelanaBlac enquiry from ${clip(b.name, 80)}`, html: `<p><b>${esc(clip(b.name, 120))}</b> (<a href="mailto:${esc(clip(b.email, 200))}">${esc(clip(b.email, 200))}</a>) sent a message through the website:</p><p style="white-space:pre-wrap">${esc(clip(b.body, 5000))}</p><p><a href="${siteUrl(env, request)}/admin/messages">Open in Studio</a></p>` });
          if (!mail.sent) console.error('Enquiry email not sent', mail.reason || mail.detail);
        } catch (e) { console.error('Enquiry email failed', e); }
      }
      return json({ ok: true });
    }
    if (route === 'checkout' && method === 'POST') {
      const b = await body(request);
      if (!b.name || !isEmail(b.email)) return err('Name and a valid email are required.');
      if (!Array.isArray(b.items) || !b.items.length) return err('Your basket is empty.');
      const a = b.address || {};
      if (!a.line1 || !a.city || !a.postcode) return err('Please enter your full delivery address.');
      const items = [];
      for (const it of b.items.slice(0, 30)) {
        const p = await env.DB.prepare("SELECT * FROM products WHERE id=? AND status='published'").bind(Number(it.id)).first();
        const qty = Math.max(1, Math.min(10, parseInt(it.qty) || 1));
        if (!p) return err('An item in your basket is no longer available.');
        if (p.stock < qty) return err(`Sorry, only ${p.stock} of "${p.title}" left.`);
        items.push({ id: p.id, title: p.title, price_pence: p.price_pence, qty, image: JSON.parse(p.images || '[]')[0] || '' });
      }
      const content = await getContent(env);
      const delivery = deliveryFeePence(content, items.reduce((s, i) => s + i.price_pence * i.qty, 0));
      const stockItems = items.slice();
      if (delivery > 0) items.push({ id: DELIVERY_ITEM_ID, title: 'UK delivery', price_pence: delivery, qty: 1, image: '' });
      const total = items.reduce((s, i) => s + i.price_pence * i.qty, 0);
      const number = 'MB' + Date.now().toString(36).toUpperCase().slice(-6) + randomToken(1).toUpperCase();
      const order = { number, email: clip(b.email, 200), name: clip(b.name, 120) };
      const useStripe = !!env.STRIPE_SECRET_KEY;
      await env.DB.batch([
        env.DB.prepare('INSERT INTO orders (number,email,name,address,items,total_pence,status) VALUES (?,?,?,?,?,?,?)')
          .bind(number, order.email, order.name, JSON.stringify({ line1: clip(a.line1, 200), line2: clip(a.line2, 200), city: clip(a.city, 100), postcode: clip(a.postcode, 20) }), JSON.stringify(items), total, useStripe ? 'awaiting_payment' : 'new'),
        ...stockItems.map((i) => env.DB.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').bind(i.qty, i.id)),
      ]);
      const sym = content['site.currency'];
      if (useStripe) {
        try {
          const s = await stripeCheckout(env, { order, items, origin: siteUrl(env, request) });
          await env.DB.prepare('UPDATE orders SET stripe_session=? WHERE number=?').bind(s.id, number).run();
          return json({ number, redirect: s.url });
        } catch (e) { return err('Payment could not be started: ' + e.message, 502); }
      }
      await notifyAdmins(env, { title: `New order ${number}`, body: `${order.name} - ${formatPrice(total, sym)}`, url: '/admin/orders' });
      await sendEmail(env, { to: order.email, subject: `Order ${number} received`, html: `<p>Thank you ${esc(order.name)}! We received your order <b>${number}</b> totalling ${formatPrice(total, sym)}. We will be in touch shortly with payment and delivery details.</p>` });
      return json({ number });
    }
    if (route === 'order' && method === 'GET' && seg[1]) {
      const o = await env.DB.prepare('SELECT number,name,items,total_pence,status,created_at FROM orders WHERE number=?').bind(seg[1]).first();
      return o ? json({ ...o, items: JSON.parse(o.items) }) : err('Not found', 404);
    }
    // Release the stock held by an unpaid order (safe to call twice: only the first caller changes the status).
    const releaseOrder = async (o) => {
      const done = await env.DB.prepare("UPDATE orders SET status='cancelled' WHERE number=? AND status='awaiting_payment'").bind(o.number).run();
      if (!done.meta?.changes) return false;
      const items = JSON.parse(o.items || '[]').filter((i) => i.id !== DELIVERY_ITEM_ID);
      await env.DB.batch(items.map((i) => env.DB.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').bind(i.qty, i.id)));
      return true;
    };
    if (route === 'order' && seg[2] === 'cancel' && method === 'POST' && seg[1]) {
      const o = await env.DB.prepare('SELECT * FROM orders WHERE number=?').bind(seg[1]).first();
      if (!o) return err('Not found', 404);
      if (o.status !== 'awaiting_payment') return json({ ok: true, status: o.status });
      if (env.STRIPE_SECRET_KEY && o.stripe_session) {
        try { await stripeExpire(env, o.stripe_session); } catch (e) {
          // Already paid or already expired: let the webhook decide, do not release stock here.
          return json({ ok: true, status: o.status });
        }
      }
      await releaseOrder(o);
      return json({ ok: true, status: 'cancelled' });
    }
    if (route === 'stripe-webhook' && method === 'POST') {
      const raw = await request.text();
      if (!(await verifyStripeSig(env, raw, request.headers.get('stripe-signature')))) return err('bad signature', 400);
      let ev; try { ev = JSON.parse(raw); } catch { return err('bad payload', 400); }
      const session = ev.data?.object || {};
      const num = session.client_reference_id || session.metadata?.order_number;
      const o = num ? await env.DB.prepare('SELECT * FROM orders WHERE number=?').bind(num).first() : null;
      if (o && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(ev.type) && o.status === 'awaiting_payment') {
        const matches = session.payment_status === 'paid' && session.amount_total === o.total_pence && String(session.currency).toLowerCase() === 'gbp';
        if (session.payment_status === 'unpaid') return json({ received: true }); // wait for the async success event
        if (!matches) {
          await notifyAdmins(env, { title: `Check order ${num}`, body: 'Stripe payment did not match the order total. Review it in Stripe.', url: '/admin/orders' });
        } else {
          const done = await env.DB.prepare("UPDATE orders SET status='paid' WHERE number=? AND status='awaiting_payment'").bind(num).run();
          if (done.meta?.changes) {
            const content = await getContent(env);
            const total = formatPrice(o.total_pence, content['site.currency']);
            await notifyAdmins(env, { title: `Paid order ${num}`, body: `${o.name} - ${total}`, url: '/admin/orders' });
            const lines = JSON.parse(o.items || '[]').map((i) => `<li>${i.qty} × ${esc(i.title)}</li>`).join('');
            const to = (env.NOTIFY_EMAIL || '').split(',')[0].trim() || adminEmails(env)[0];
            try {
              await sendEmail(env, { to: o.email, subject: `Payment received for order ${num}`, html: `<p>Thank you ${esc(o.name)}! We received your payment of ${total} for order <b>${num}</b>.</p><ul>${lines}</ul><p>We will let you know when it has been sent.</p>` });
              if (to) await sendEmail(env, { to, replyTo: o.email, subject: `Paid order ${num} (${total})`, html: `<p><b>${esc(o.name)}</b> (${esc(o.email)}) paid ${total}.</p><ul>${lines}</ul><p>Delivery address: ${esc(Object.values(JSON.parse(o.address || '{}')).filter(Boolean).join(', '))}</p><p><a href="${siteUrl(env, request)}/admin/orders">Open orders</a></p>` });
            } catch (e) { console.error('Order email failed', e); }
          }
        }
      } else if (o && ['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(ev.type)) {
        await releaseOrder(o);
      }
      return json({ received: true });
    }

    if (route === 'admin' && method !== 'GET' && method !== 'HEAD' && !validAdminRequest(request)) {
      return err('Invalid request origin.', 403);
    }
    if (route === 'admin' && ['login', 'forgot', 'reset'].includes(seg[1]) && method === 'POST') {
      const ip = request.headers.get('cf-connecting-ip') || 'local';
      const limited = await consumeAuthLimit(env, `${seg[1]}:ip:${ip}`, 20);
      if (limited) return limited;
      await env.DB.prepare('DELETE FROM auth_rate_limits WHERE expires < ?').bind(Date.now() - 864e5).run();
    }

    // ---------- admin auth (no session needed) ----------
    if (route === 'admin' && seg[1] === 'login' && method === 'POST') {
      const b = await body(request);
      const username = clip(b.username ?? b.email, 200).toLowerCase().trim();
      const email = username === (env.ADMIN_USERNAME || 'admin').toLowerCase() ? adminEmails(env)[0] || '' : username;
      const limited = await consumeAuthLimit(env, `login:email:${email}`, 10);
      if (limited) return limited;
      const a = await env.DB.prepare('SELECT * FROM admins WHERE email=?').bind(email).first();
      const password = String(b.password || '');
      const { hash } = await hashPassword(password.slice(0, 200), a?.salt || '0'.repeat(32));
      if (!a?.password_hash || password.length > 200 || !safeEqual(hash, a.password_hash)) return err('Invalid username or password.', 401);
      const token = randomToken();
      await env.DB.prepare('INSERT INTO sessions (token_hash, admin_id, expires) VALUES (?,?,?)').bind(await sha256(token), a.id, Date.now() + ADMIN_SESSION_SECONDS * 1000).run();
      return json({ ok: true, email: a.email }, 200, { 'set-cookie': sessionCookie(token, request) });
    }
    if (route === 'admin' && seg[1] === 'forgot' && method === 'POST') {
      const b = await body(request);
      const email = clip(b.email, 200).toLowerCase().trim();
      const generic = { ok: true, message: 'If that email belongs to an admin, a reset link has been sent.' };
      const limited = await consumeAuthLimit(env, `forgot:email:${email}`, 4);
      if (limited) return limited;
      if (!adminEmails(env).includes(email)) return json(generic);
      let a = await env.DB.prepare('SELECT * FROM admins WHERE email=?').bind(email).first();
      if (!a) { await env.DB.prepare('INSERT INTO admins (email) VALUES (?)').bind(email).run(); a = await env.DB.prepare('SELECT * FROM admins WHERE email=?').bind(email).first(); }
      const token = randomToken();
      await env.DB.prepare('INSERT INTO reset_tokens (token_hash, admin_id, expires) VALUES (?,?,?)').bind(await sha256(token), a.id, Date.now() + 3600e3).run();
      const link = `${siteUrl(env, request)}/admin/reset?token=${token}`;
      const mail = await sendEmail(env, { to: email, subject: 'Reset your MelanaBlac admin password', html: `<p>Use this link to set a new password. It expires in 1 hour.</p><p><a href="${link}">${link}</a></p><p>If you did not ask for this, ignore this email.</p>` });
      return json(env.DEV_MODE ? { ...generic, devLink: link, mail } : generic);
    }
    if (route === 'admin' && seg[1] === 'reset' && method === 'POST') {
      const b = await body(request);
      if (!validPassword(b.password)) return err('Password must be at least 10 characters.');
      const t = await env.DB.prepare('SELECT * FROM reset_tokens WHERE token_hash=? AND used=0 AND expires>?').bind(await sha256(String(b.token || '')), Date.now()).first();
      if (!t) return err('This reset link is invalid or has expired.', 400);
      const { hash, salt } = await hashPassword(b.password);
      const resetResults = await env.DB.batch([
        env.DB.prepare('UPDATE admins SET password_hash=?, salt=? WHERE id=? AND EXISTS (SELECT 1 FROM reset_tokens WHERE token_hash=? AND used=0 AND expires>?)').bind(hash, salt, t.admin_id, t.token_hash, Date.now()),
        env.DB.prepare('UPDATE reset_tokens SET used=1 WHERE admin_id=?').bind(t.admin_id),
        env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(t.admin_id),
      ]);
      if (!resetResults[0].meta.changes) return err('This reset link is invalid or has expired.', 400);
      return json({ ok: true });
    }

    // ---------- admin (session required) ----------
    if (route === 'admin') {
      const admin = await getAdmin(request, env);
      if (seg[1] === 'me') return admin ? json({ email: admin.email }) : err('Not signed in', 401);
      if (!admin) return err('Not signed in', 401);
      if (method !== 'GET' && !request.headers.get('x-requested-with')) return err('Bad request', 400);
      const sub = seg[1], id = seg[2];

      if (sub === 'logout' && method === 'POST') {
        const tok = (request.headers.get('cookie') || '').match(/mb_session=([a-f0-9]+)/)?.[1];
        if (tok) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(tok)).run();
        return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
      }
      if (sub === 'password' && method === 'POST') {
        const b = await body(request);
        const a = await env.DB.prepare('SELECT * FROM admins WHERE id=?').bind(admin.id).first();
        const cur = await hashPassword(String(b.current || ''), a.salt);
        if (!safeEqual(cur.hash, a.password_hash)) return err('Current password is incorrect.', 400);
        if (!validPassword(b.next)) return err('New password must be at least 10 characters.');
        const n = await hashPassword(b.next);
        await env.DB.batch([
          env.DB.prepare('UPDATE admins SET password_hash=?, salt=? WHERE id=?').bind(n.hash, n.salt, admin.id),
          env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(admin.id),
          env.DB.prepare('UPDATE reset_tokens SET used=1 WHERE admin_id=?').bind(admin.id),
        ]);
        return json({ ok: true }, 200, { 'set-cookie': sessionCookie('', request, 0) });
      }
      if (sub === 'stats') {
        const q = async (s) => (await env.DB.prepare(s).first()).n;
        return json({
          products: await q("SELECT COUNT(*) n FROM products"), published: await q("SELECT COUNT(*) n FROM products WHERE status='published'"),
          orders: await q('SELECT COUNT(*) n FROM orders'), newOrders: await q("SELECT COUNT(*) n FROM orders WHERE status IN ('new','paid')"),
          revenue: await q("SELECT COALESCE(SUM(total_pence),0) n FROM orders WHERE status IN ('paid','shipped','completed')"),
          unread: await q('SELECT COUNT(*) n FROM messages WHERE is_read=0'), lowStock: await q("SELECT COUNT(*) n FROM products WHERE stock<=1 AND status='published'"),
          subscribers: await q('SELECT COUNT(*) n FROM push_subs'),
          pushConfigured: !!(env.VAPID_PRIVATE_JWK && env.VAPID_PUBLIC_KEY), emailConfigured: !!env.RESEND_API_KEY, stripeConfigured: !!env.STRIPE_SECRET_KEY,
        });
      }
      if (sub === 'upload' && method === 'POST') {
        const type = (request.headers.get('content-type') || '').split(';')[0];
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[type];
        if (!ext) return err('Only JPG, PNG, WebP or AVIF images are allowed.');
        const buf = await readLimitedBody(request, MAX_UPLOAD_BYTES);
        if (buf.byteLength > MAX_UPLOAD_BYTES) return err('Image is too large. Upload it through the image picker to compress it first.', 413);
        if (!buf.byteLength) return err('Empty file.');
        if (!validMediaBytes(buf, type)) return err('This file is not a valid supported image.');
        const key = `${Date.now()}-${randomToken(4)}.${ext}`;
        await storeMedia(env, key, buf, type);
        return json({ url: `/api/media/${key}` });
      }
      if (sub === 'upload-video' && method === 'POST') {
        const declared = Number(request.headers.get('content-length') || 0);
        if (declared > MAX_UPLOAD_BYTES * 2 + 65536) return err('Video upload is too large.', 413);
        const encoded = await readLimitedBody(request, MAX_UPLOAD_BYTES * 2 + 65536);
        const form = await new Response(encoded, { headers: { 'content-type': request.headers.get('content-type') || '' } }).formData();
        const video = form.get('video'), poster = form.get('poster');
        if (!video || !poster || typeof video.arrayBuffer !== 'function' || typeof poster.arrayBuffer !== 'function') return err('A compressed video and its poster are required.');
        if (!['video/mp4','video/webm'].includes(video.type) || !['image/webp', 'image/png'].includes(poster.type)) return err('Choose a supported compressed video.');
        if (!video.size || !poster.size) return err('Empty video or poster.');
        if (video.size > MAX_UPLOAD_BYTES || poster.size > MAX_UPLOAD_BYTES) return err('Compressed media is too large. Try a shorter video.', 413);
        const base = `${Date.now()}-${randomToken(4)}`, ext = video.type === 'video/mp4' ? 'mp4' : 'webm';
        const posterBytes = await poster.arrayBuffer(), videoBytes = await video.arrayBuffer();
        if (!validMediaBytes(posterBytes, poster.type) || !validMediaBytes(videoBytes, video.type)) return err('The compressed media is not valid. Please upload the clip again.');
        await storeMedia(env, `${base}.webp`, posterBytes, poster.type);
        await storeMedia(env, `${base}.${ext}`, videoBytes, video.type);
        return json({ url: `/api/media/${base}.${ext}`, poster: `/api/media/${base}.webp` });
      }
      if (sub === 'products') {
        if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM products ORDER BY sort, id DESC').all()).results.map(parseProduct));
        const b = await body(request);
        if (method === 'DELETE' && id) { await env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run(); return json({ ok: true }); }
        if (method === 'POST' || method === 'PUT') {
          if (!b.title || !clip(b.title, 200).trim()) return err('Title is required.');
          const price = Math.round(Number(b.price_pence));
          if (!Number.isFinite(price) || price < 0) return err('Enter a valid price.');
          const images = Array.isArray(b.images) ? b.images.filter((x) => typeof x === 'string').slice(0, 12) : [];
          const vals = [clip(b.title, 200), clip(b.description, 8000), price, clip(b.category || 'Gallery', 60), JSON.stringify(images), Math.max(0, parseInt(b.stock) || 0), b.status === 'draft' ? 'draft' : 'published', b.featured ? 1 : 0, clip(b.seo_title, 120), clip(b.seo_description, 320), clip(b.etsy_url, 500), parseInt(b.sort) || 0];
          if (method === 'POST') {
            let slug = slugify(b.slug || b.title) || 'product';
            if (await env.DB.prepare('SELECT 1 FROM products WHERE slug=?').bind(slug).first()) slug += '-' + randomToken(2);
            const r = await env.DB.prepare('INSERT INTO products (title,description,price_pence,category,images,stock,status,featured,seo_title,seo_description,etsy_url,sort,slug) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...vals, slug).run();
            return json({ ok: true, id: r.meta.last_row_id, slug });
          }
          await env.DB.prepare('UPDATE products SET title=?,description=?,price_pence=?,category=?,images=?,stock=?,status=?,featured=?,seo_title=?,seo_description=?,etsy_url=?,sort=? WHERE id=?').bind(...vals, id).run();
          return json({ ok: true });
        }
      }
      if (sub === 'slides') {
        if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM slides ORDER BY sort,id').all()).results.map((slide) => ({ ...slide, image: optimizedImage(slide.image) })));
        const b = await body(request);
        if (method === 'DELETE' && id) { await env.DB.prepare('DELETE FROM slides WHERE id=?').bind(id).run(); return json({ ok: true }); }
        if (method === 'POST') {
          if (!b.image) return err('Choose an image.');
          await env.DB.prepare('INSERT INTO slides (image,title,subtitle,link,sort) VALUES (?,?,?,?,?)').bind(clip(b.image, 500), clip(b.title, 120), clip(b.subtitle, 200), clip(b.link, 300), parseInt(b.sort) || 99).run();
          return json({ ok: true });
        }
        if (method === 'PUT' && id) {
          await env.DB.prepare('UPDATE slides SET image=?,title=?,subtitle=?,link=?,sort=? WHERE id=?').bind(clip(b.image, 500), clip(b.title, 120), clip(b.subtitle, 200), clip(b.link, 300), parseInt(b.sort) || 0, id).run();
          return json({ ok: true });
        }
      }
      if (sub === 'content') {
        if (method === 'GET') return json(await getContent(env));
        if (method === 'PUT') {
          const b = await body(request);
          const valid = new Set(CONTENT_FIELDS.map((f) => f.key));
          const stmts = Object.entries(b).filter(([k]) => valid.has(k)).map(([k, v]) => env.DB.prepare('INSERT INTO content (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k, clip(v, 8000)));
          if (stmts.length) await env.DB.batch(stmts);
          return json({ ok: true, saved: stmts.length });
        }
      }
      if (sub === 'orders') {
        if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all()).results.map((o) => ({ ...o, items: JSON.parse(o.items), address: JSON.parse(o.address) })));
        if (method === 'PUT' && id) {
          const b = await body(request);
          if (!['new', 'awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled'].includes(b.status)) return err('Bad status');
          await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(b.status, id).run();
          return json({ ok: true });
        }
      }
      if (sub === 'messages') {
        if (method === 'GET') return json((await env.DB.prepare('SELECT * FROM messages ORDER BY id DESC LIMIT 200').all()).results);
        if (method === 'PUT' && id) { await env.DB.prepare('UPDATE messages SET is_read=1 WHERE id=?').bind(id).run(); return json({ ok: true }); }
        if (method === 'DELETE' && id) { await env.DB.prepare('DELETE FROM messages WHERE id=?').bind(id).run(); return json({ ok: true }); }
      }
      if (sub === 'push') {
        if (seg[2] === 'key') return json({ key: env.VAPID_PUBLIC_KEY || null });
        if (seg[2] === 'subscribe' && method === 'POST') {
          const b = await body(request);
          if (!b.endpoint || !/^https:\/\//.test(b.endpoint)) return err('Bad subscription');
          await env.DB.prepare('INSERT INTO push_subs (endpoint,p256dh,auth,admin_id) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET admin_id=excluded.admin_id').bind(b.endpoint, b.keys?.p256dh || '', b.keys?.auth || '', admin.id).run();
          return json({ ok: true });
        }
        if (seg[2] === 'unsubscribe' && method === 'POST') {
          const b = await body(request);
          await env.DB.prepare('DELETE FROM push_subs WHERE endpoint=?').bind(b.endpoint || '').run();
          return json({ ok: true });
        }
        if (seg[2] === 'test' && method === 'POST') {
          const r = await notifyAdmins(env, { title: 'Test notification', body: 'Push notifications are working on this device.', url: '/admin/' });
          return json({ ok: true, ...r });
        }
      }
      if (sub === 'notifications') {
        if (seg[2] === 'latest') return json((await env.DB.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 1').first()) || null);
        return json((await env.DB.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all()).results);
      }
    }
    return err('Not found', 404);
  } catch (e) {
    if (e.status === 413) return err(e.message, 413);
    console.error(e);
    return err('Server error: ' + (e.message || e), 500);
  }
}
