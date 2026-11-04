import React, { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useSearchParams, Navigate, useParams } from 'react-router-dom';
import { api, uploadImage } from '../api.js';
import { CONTENT_FIELDS, formatPrice } from '../shared/contentSchema.js';
import InstallBanner, { InstallSteps } from './InstallBanner.jsx';
import { registerSW, enablePush, disablePush, currentSub, pushSupported } from './push.js';

function useNoIndex() { useEffect(() => { document.title = 'MelanaBlac Admin'; let m = document.querySelector('link[rel=manifest]'); if (!m) { m = document.createElement('link'); m.rel = 'manifest'; m.href = '/admin/manifest.webmanifest'; document.head.appendChild(m); } let a = document.querySelector('link[rel=apple-touch-icon]'); if (!a) { a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = '/admin/apple-touch-icon.png'; document.head.appendChild(a); } document.body.classList.add('admin-body'); return () => document.body.classList.remove('admin-body'); }, []); }

function Flash({ msg, kind = 'ok' }) { return msg ? <p className={kind === 'ok' ? 'ok' : 'err'} role={kind === 'ok' ? 'status' : 'alert'}>{msg}</p> : null; }

export default function AdminApp() {
  useNoIndex();
  const [me, setMe] = useState(undefined);
  useEffect(() => { registerSW(); api('admin/me').then((r) => setMe(r.email)).catch(() => setMe(null)); }, []);
  if (me === undefined) return <div className="center pad muted">Loading…</div>;
  return (
    <Routes>
      <Route path="forgot" element={<Forgot />} />
      <Route path="reset" element={<Reset />} />
      <Route path="login" element={me ? <Navigate to="/admin/" replace /> : <Login onLogin={setMe} />} />
      <Route path="*" element={me ? <Shell me={me} onLogout={() => setMe(null)} /> : <Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

function AuthBox({ title, children }) {
  return <div className="auth"><div className="auth-card"><div className="logo big"><span>Melana</span>Blac</div><h1>{title}</h1>{children}</div><InstallBanner /></div>;
}

function Login({ onLogin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { const r = await api('admin/login', { method: 'POST', body: f }); onLogin(r.email); } catch (x) { setErr(x.message); setBusy(false); } };
  return (
    <AuthBox title="Admin sign in">
      <form className="form" onSubmit={submit}>
        <label>Email<input type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <Flash msg={err} kind="err" />
        <button className="btn gold" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="center"><Link to="/admin/forgot">Forgot password?</Link></p>
      </form>
    </AuthBox>
  );
}

function Forgot() {
  const [email, setEmail] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { setRes(await api('admin/forgot', { method: 'POST', body: { email } })); } catch (x) { setErr(x.message); } setBusy(false); };
  return (
    <AuthBox title="Reset your password">
      {res ? <><Flash msg={res.message} />{res.devLink && <p className="small">Dev mode link: <a href={res.devLink}>{res.devLink}</a></p>}<p className="center"><Link to="/admin/login">Back to sign in</Link></p></> : (
        <form className="form" onSubmit={submit}>
          <p className="muted">Enter your admin email and we will email you a link to set a new password.</p>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <Flash msg={err} kind="err" />
          <button className="btn gold" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="center"><Link to="/admin/login">Back to sign in</Link></p>
        </form>
      )}
    </AuthBox>
  );
}

function Reset() {
  const [q] = useSearchParams(); const nav = useNavigate();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const submit = async (e) => { e.preventDefault(); setErr(''); if (pw !== pw2) return setErr('Passwords do not match.'); try { await api('admin/reset', { method: 'POST', body: { token: q.get('token'), password: pw } }); setDone(true); setTimeout(() => nav('/admin/login'), 1800); } catch (x) { setErr(x.message); } };
  return (
    <AuthBox title="Choose a new password">
      {done ? <Flash msg="Password updated. Redirecting to sign in…" /> : (
        <form className="form" onSubmit={submit}>
          <label>New password (10+ characters)<input type="password" minLength="10" required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <label>Confirm password<input type="password" minLength="10" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
          <Flash msg={err} kind="err" />
          <button className="btn gold">Update password</button>
        </form>
      )}
    </AuthBox>
  );
}

function Shell({ me, onLogout }) {
  const [stats, setStats] = useState(null);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  useEffect(() => { api('admin/stats').then(setStats).catch((e) => { if (e.status === 401) onLogout(); }); }, []);
  const logout = async () => { await api('admin/logout', { method: 'POST' }); onLogout(); nav('/admin/login'); };
  const links = [['', 'Dashboard'], ['products', 'Artwork'], ['slides', 'Slides'], ['content', 'Site text'], ['seo', 'SEO'], ['orders', 'Orders'], ['messages', 'Messages'], ['settings', 'Settings']];
  return (
    <div className="shell">
      <aside className={'side' + (menu ? ' open' : '')}>
        <div className="logo"><span>Melana</span>Blac <small>admin</small></div>
        <nav onClick={() => setMenu(false)}>
          {links.map(([to, l]) => <NavLink key={to} to={`/admin/${to}`} end={to === ''}>{l}{l === 'Orders' && stats?.newOrders > 0 && <b className="badge">{stats.newOrders}</b>}{l === 'Messages' && stats?.unread > 0 && <b className="badge">{stats.unread}</b>}</NavLink>)}
          <a href="/" target="_blank" rel="noopener noreferrer">View site ↗</a>
        </nav>
        <div className="side-foot"><small>{me}</small><button className="link" onClick={logout}>Sign out</button></div>
      </aside>
      <div className="main">
        <header className="topbar"><button className="burger" aria-label="Menu" onClick={() => setMenu(!menu)}><i /><i /><i /></button><b>MelanaBlac Admin</b></header>
        <div className="content">
          <Routes>
            <Route index element={<Dashboard stats={stats} />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="slides" element={<Slides />} />
            <Route path="content" element={<ContentEditor groups={(g) => !g.startsWith('SEO')} title="Site text" />} />
            <Route path="seo" element={<ContentEditor groups={(g) => g.startsWith('SEO')} title="SEO settings" note="Per-artwork SEO title and description are set on each artwork's edit page." />} />
            <Route path="orders" element={<Orders />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}

function Dashboard({ stats }) {
  const [notes, setNotes] = useState([]);
  useEffect(() => { api('admin/notifications').then(setNotes).catch(() => {}); }, []);
  if (!stats) return <p className="muted">Loading…</p>;
  const cards = [['Artworks', `${stats.published}/${stats.products}`, 'products'], ['New orders', stats.newOrders, 'orders'], ['Revenue', formatPrice(stats.revenue), 'orders'], ['Unread messages', stats.unread, 'messages'], ['Low stock', stats.lowStock, 'products'], ['Push devices', stats.subscribers, 'settings']];
  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">{cards.map(([l, v, to]) => <Link key={l} to={`/admin/${to}`} className="stat"><span>{l}</span><b>{v}</b></Link>)}</div>
      <p><Link className="btn gold" to="/admin/products/new">+ Add artwork</Link></p>
      {(!stats.emailConfigured || !stats.pushConfigured) && <div className="note"><b>Setup needed:</b> {!stats.emailConfigured && 'RESEND_API_KEY (password reset emails). '}{!stats.pushConfigured && 'VAPID keys (push notifications). '}See README.</div>}
      <h2>Recent activity</h2>
      {notes.length === 0 ? <p className="muted">No activity yet.</p> : <ul className="plain">{notes.slice(0, 8).map((n) => <li key={n.id}><Link to={n.url}><b>{n.title}</b></Link> <span className="muted">{n.body} · {n.created_at}</span></li>)}</ul>}
    </>
  );
}

const emptyP = { title: '', description: '', price_pence: 0, category: 'Gallery', images: [], stock: 1, status: 'published', featured: 0, seo_title: '', seo_description: '', etsy_url: '', sort: 0 };

function Products() {
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const load = () => api('admin/products').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const del = async (p) => { if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return; await api('admin/products/' + p.id, { method: 'DELETE' }); load(); };
  return (
    <>
      <div className="row"><h1>Artwork</h1><Link className="btn gold" to="/admin/products/new">+ Add artwork</Link></div>
      <Flash msg={err} kind="err" />
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? <p className="muted">No artwork yet. Add your first piece.</p> : (
        <div className="table">
          {list.map((p) => (
            <div className="trow" key={p.id}>
              <img src={p.images[0]} alt="" />
              <div className="grow"><b>{p.title}</b><br /><span className="muted">{p.category} · {formatPrice(p.price_pence)} · stock {p.stock} · {p.status}{p.featured ? ' · featured' : ''}</span></div>
              <Link className="btn small" to={`/admin/products/${p.id}`}>Edit</Link>
              <button className="btn small danger" onClick={() => del(p)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ImageUploader({ images, onChange }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = async (e) => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    setBusy(true); setErr('');
    try { const urls = []; for (const f of files) urls.push((await uploadImage(f)).url); onChange([...images, ...urls]); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const move = (i, d) => { const a = [...images]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      <div className="imgs">{images.map((u, i) => (
        <div className="img-tile" key={u + i}><img src={u} alt={`Image ${i + 1}`} />
          <div><button type="button" className="link" onClick={() => move(i, -1)} aria-label="Move earlier">←</button><button type="button" className="link" onClick={() => move(i, 1)} aria-label="Move later">→</button><button type="button" className="link" onClick={() => onChange(images.filter((_, k) => k !== i))}>Remove</button></div>
          {i === 0 && <span className="tag">Main</span>}
        </div>))}</div>
      <label className="btn small file">{busy ? 'Uploading…' : '+ Upload images'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={pick} disabled={busy} hidden /></label>
      <Flash msg={err} kind="err" />
    </div>
  );
}

function ProductEditor() {
  const { id } = useParams(); const nav = useNavigate();
  const [p, setP] = useState(id ? null : emptyP); const [price, setPrice] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api('admin/products').then((l) => { const f = l.find((x) => String(x.id) === id); if (f) { setP(f); setPrice((f.price_pence / 100).toFixed(2)); } else setErr('Artwork not found'); }); }, [id]);
  if (!p) return <><Flash msg={err} kind="err" />{!err && <p className="muted">Loading…</p>}</>;
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value });
  const save = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    const pence = Math.round(parseFloat(price) * 100);
    if (!Number.isFinite(pence) || pence < 0) { setErr('Enter a valid price, e.g. 85.00'); setBusy(false); return; }
    if (!p.images.length && !confirm('This artwork has no images. Save anyway?')) { setBusy(false); return; }
    try {
      const body = { ...p, price_pence: pence };
      if (id) { await api('admin/products/' + id, { method: 'PUT', body }); setOk('Saved.'); } else { await api('admin/products', { method: 'POST', body }); nav('/admin/products'); }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <form className="form wide" onSubmit={save}>
      <div className="row"><h1>{id ? 'Edit artwork' : 'Add artwork'}</h1><Link to="/admin/products">← Back</Link></div>
      <label>Title<input required value={p.title} onChange={set('title')} maxLength="200" /></label>
      <label>Description<textarea rows="5" value={p.description} onChange={set('description')} /></label>
      <div className="two">
        <label>Price (£)<input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="85.00" /></label>
        <label>Stock<input type="number" min="0" value={p.stock} onChange={set('stock')} /></label>
      </div>
      <div className="two">
        <label>Category<input list="cats" value={p.category} onChange={set('category')} /><datalist id="cats"><option>Gallery</option><option>Greeting Cards</option><option>Prints</option></datalist></label>
        <label>Status<select value={p.status} onChange={set('status')}><option value="published">Published</option><option value="draft">Draft (hidden)</option></select></label>
      </div>
      <label className="check"><input type="checkbox" checked={!!p.featured} onChange={set('featured')} /> Feature on home page</label>
      <fieldset><legend>Images (first is the main image)</legend><ImageUploader images={p.images} onChange={(images) => setP({ ...p, images })} /></fieldset>
      <fieldset><legend>SEO</legend>
        <label>SEO title<input value={p.seo_title} onChange={set('seo_title')} maxLength="120" placeholder={`${p.title || 'Title'} | MelanaBlac`} /><small className={p.seo_title.length > 60 ? 'warn' : 'muted'}>{p.seo_title.length}/60 recommended</small></label>
        <label>SEO description<textarea rows="3" value={p.seo_description} onChange={set('seo_description')} maxLength="320" /><small className={p.seo_description.length > 160 ? 'warn' : 'muted'}>{p.seo_description.length}/160 recommended</small></label>
        <label>Etsy link (optional)<input type="url" value={p.etsy_url} onChange={set('etsy_url')} /></label>
        <label>Sort order (lower first)<input type="number" value={p.sort} onChange={set('sort')} /></label>
      </fieldset>
      <Flash msg={err} kind="err" /><Flash msg={ok} />
      <button className="btn gold" disabled={busy}>{busy ? 'Saving…' : 'Save artwork'}</button>
    </form>
  );
}

function Slides() {
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const load = () => api('admin/slides').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { const { url } = await uploadImage(f); await api('admin/slides', { method: 'POST', body: { image: url, title: '', subtitle: '', link: '/shop', sort: (list?.length || 0) } }); load(); } catch (x) { setErr(x.message); }
  };
  const upd = (s, patch) => setList(list.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
  const save = async (s) => { try { await api('admin/slides/' + s.id, { method: 'PUT', body: s }); setErr(''); load(); } catch (x) { setErr(x.message); } };
  const del = async (s) => { if (confirm('Delete this slide?')) { await api('admin/slides/' + s.id, { method: 'DELETE' }); load(); } };
  return (
    <>
      <div className="row"><h1>Home slides</h1><label className="btn gold file">+ Add slide<input type="file" hidden accept="image/*" onChange={add} /></label></div>
      <Flash msg={err} kind="err" />
      {!list ? <p className="muted">Loading…</p> : list.map((s) => (
        <div className="slide-edit" key={s.id}>
          <img src={s.image} alt="" />
          <div className="form">
            <label>Title<input value={s.title} onChange={(e) => upd(s, { title: e.target.value })} /></label>
            <label>Subtitle<input value={s.subtitle} onChange={(e) => upd(s, { subtitle: e.target.value })} /></label>
            <div className="two"><label>Link (e.g. /shop)<input value={s.link} onChange={(e) => upd(s, { link: e.target.value })} /></label><label>Order<input type="number" value={s.sort} onChange={(e) => upd(s, { sort: e.target.value })} /></label></div>
            <div className="row"><button className="btn small gold" onClick={() => save(s)}>Save</button><button className="btn small danger" onClick={() => del(s)}>Delete</button></div>
          </div>
        </div>
      ))}
    </>
  );
}

function ContentEditor({ groups, title, note }) {
  const fields = CONTENT_FIELDS.filter((f) => groups(f.group));
  const [vals, setVals] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api('admin/content').then(setVals).catch((e) => setErr(e.message)); }, []);
  if (!vals) return <><Flash msg={err} kind="err" /><p className="muted">Loading…</p></>;
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); setOk(''); try { const body = {}; fields.forEach((f) => (body[f.key] = vals[f.key])); await api('admin/content', { method: 'PUT', body }); setOk('Saved. Changes are live on the site.'); } catch (x) { setErr(x.message); } setBusy(false); };
  const names = [...new Set(fields.map((f) => f.group))];
  return (
    <form className="form wide" onSubmit={save}>
      <h1>{title}</h1>{note && <p className="muted">{note}</p>}
      {names.map((g) => (
        <fieldset key={g}><legend>{g}</legend>
          {fields.filter((f) => f.group === g).map((f) => {
            const isT = f.key.endsWith('.title'), isD = f.key.endsWith('.description');
            const L = vals[f.key]?.length || 0;
            return (
              <label key={f.key}>{f.label}
                {f.multiline ? <textarea rows="4" value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} /> : <input value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />}
                {(isT && f.group.startsWith('SEO') || isD && f.group.startsWith('SEO')) && <small className={L > (isT ? 60 : 160) ? 'warn' : 'muted'}>{L}/{isT ? 60 : 160} recommended</small>}
              </label>
            );
          })}
        </fieldset>
      ))}
      <Flash msg={err} kind="err" /><Flash msg={ok} />
      <button className="btn gold" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function Orders() {
  const [list, setList] = useState(null); const [err, setErr] = useState('');
  const load = () => api('admin/orders').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const setStatus = async (o, status) => { try { await api('admin/orders/' + o.id, { method: 'PUT', body: { status } }); load(); } catch (x) { setErr(x.message); } };
  return (
    <>
      <h1>Orders</h1><Flash msg={err} kind="err" />
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? <p className="muted">No orders yet.</p> : list.map((o) => (
        <div className="order" key={o.id}>
          <div className="row"><b>{o.number}</b><span className="muted">{o.created_at}</span><span className="grow" />
            <select aria-label={`Status for ${o.number}`} value={o.status} onChange={(e) => setStatus(o, e.target.value)}>{['new', 'awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></div>
          <p>{o.name} · <a href={`mailto:${o.email}`}>{o.email}</a></p>
          <p className="muted">{[o.address.line1, o.address.line2, o.address.city, o.address.postcode].filter(Boolean).join(', ')}</p>
          <ul className="plain">{o.items.map((i) => <li key={i.id}>{i.qty} × {i.title} — {formatPrice(i.price_pence * i.qty)}</li>)}</ul>
          <b>Total {formatPrice(o.total_pence)}</b>
        </div>
      ))}
    </>
  );
}

function Messages() {
  const [list, setList] = useState(null);
  const load = () => api('admin/messages').then(setList);
  useEffect(() => { load(); }, []);
  const read = async (m) => { await api('admin/messages/' + m.id, { method: 'PUT' }); load(); };
  const del = async (m) => { if (confirm('Delete this message?')) { await api('admin/messages/' + m.id, { method: 'DELETE' }); load(); } };
  return (
    <>
      <h1>Messages</h1>
      {!list ? <p className="muted">Loading…</p> : list.length === 0 ? <p className="muted">No messages yet.</p> : list.map((m) => (
        <div className={'order' + (m.is_read ? '' : ' unread')} key={m.id}>
          <div className="row"><b>{m.name}</b> <a href={`mailto:${m.email}`}>{m.email}</a><span className="grow" /><span className="muted">{m.created_at}</span></div>
          <p className="pre">{m.body}</p>
          <div className="row">{!m.is_read && <button className="btn small" onClick={() => read(m)}>Mark read</button>}<button className="btn small danger" onClick={() => del(m)}>Delete</button></div>
        </div>
      ))}
    </>
  );
}

function Settings() {
  const [sub, setSub] = useState(null); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [pw, setPw] = useState({ current: '', next: '' }); const [pmsg, setPmsg] = useState(''); const [perr, setPerr] = useState('');
  useEffect(() => { currentSub().then(setSub); }, []);
  const on = async () => { setErr(''); setMsg(''); try { setSub(await enablePush()); setMsg('Push notifications enabled on this device.'); } catch (x) { setErr(x.message); } };
  const off = async () => { await disablePush(); setSub(null); setMsg('Push notifications turned off for this device.'); };
  const test = async () => { setErr(''); try { const r = await api('admin/push/test', { method: 'POST' }); setMsg(r.pushed ? `Sent to ${r.pushed} device(s).` : 'Saved, but no device was reachable. Is push configured?'); } catch (x) { setErr(x.message); } };
  const chg = async (e) => { e.preventDefault(); setPerr(''); setPmsg(''); try { await api('admin/password', { method: 'POST', body: pw }); setPmsg('Password changed.'); setPw({ current: '', next: '' }); } catch (x) { setPerr(x.message); } };
  const install = async () => { /* handled by banner prompt if available */ };
  return (
    <>
      <h1>Settings</h1>
      <fieldset className="form wide"><legend>Push notifications</legend>
        <p className="muted">Get a notification on this device when an order or message arrives.</p>
        {!pushSupported() && <p className="warn">This browser does not support push. On iPhone/iPad, add the app to your Home Screen first (iOS 16.4+).</p>}
        <div className="row">{sub ? <button className="btn" onClick={off}>Turn off</button> : <button className="btn gold" onClick={on}>Enable notifications</button>}<button className="btn" onClick={test}>Send test</button></div>
        <p className="muted small">Status: {sub ? 'on for this device' : 'off'}</p>
        <Flash msg={msg} /><Flash msg={err} kind="err" />
      </fieldset>
      <fieldset className="form wide"><legend>Install the app</legend><InstallSteps onInstall={install} /></fieldset>
      <form className="form wide" onSubmit={chg}>
        <fieldset><legend>Change password</legend>
          <label>Current password<input type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
          <label>New password (10+ characters)<input type="password" minLength="10" autoComplete="new-password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
          <Flash msg={pmsg} /><Flash msg={perr} kind="err" /><button className="btn gold">Change password</button>
        </fieldset>
      </form>
    </>
  );
}
