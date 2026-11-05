import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSite, useSEO } from './SiteContext.jsx';
import Slider from './Slider.jsx';
import Gallery, { Lightbox } from './Gallery.jsx';
import Video from './Video.jsx';

// "MelanaBlac" is shown as Melana (gold) + Blac (light), like the original brand styling.
const brandName = (n) => { const m = /^(melana)\s*(blac)$/i.exec(n || ''); return m ? <><span className="gold">{m[1]}</span><span className="light">{m[2]}</span></> : n; };
const Loading = () => <div className="center muted pad">Loading…</div>;

export function Home() {
  const { t, slides, featured, loaded, error } = useSite();
  useSEO(t('seo.home.title'), t('seo.home.description'));
  const [feels, setFeels] = useState('');
  const motion = t('video.motionList').split('\n').map((x) => x.trim()).filter(Boolean);
  return (
    <>
      <section className={'hero-banner' + (t('video.hero') ? ' has-video' : '')}>
        {t('video.hero') && <Video src={t('video.hero')} lazy={false} className="bg" />}
        <div className="hero-overlay">
          <h1 className="brand-name script" aria-label={t('site.name')}>{brandName(t('site.name'))}</h1>
        </div>
      </section>
      <section className="hero-text">
        <p className="kicker">{t('home.kicker')}</p>
        <h2 className="hero-title script">{t('home.title')}</h2>
        <p className="tagline">{t('home.tagline')}</p>
        <Link to="/shop" className="btn gold">{t('home.cta')}</Link>
      </section>
      <Slider slides={slides} />
      {error && <p className="center err">{error}</p>}
      <section className="section">
        <h2 className="section-title">Featured Pieces</h2>
        {loaded ? <Gallery products={featured} /> : <Loading />}
        <p className="center"><Link to="/shop" className="btn">See the whole collection</Link></p>
      </section>
      <section className="section narrow center">
        {t('video.welcome') && <Video src={t('video.welcome')} className="wide round" />}
        <h2 className="section-title">{t('home.welcomeTitle')}</h2>
        <p className="lead">{t('home.welcomeBody')}</p>
        <Link to="/about" className="btn">Meet the Artist →</Link>
      </section>
      <section className="section band">
        <div className={'split' + (t('video.why') ? '' : ' single')}>
          {t('video.why') && <Video src={t('video.why')} className="square round" />}
          <div className="center-sm">
            <h2 className="section-title left">{t('home.whyTitle')}</h2>
            <p className="lead">{t('home.whyBody')}</p>
          </div>
        </div>
      </section>
      {motion.length > 0 && (
        <section className="section motion">
          <h2 className="section-title">{t('video.motionTitle')}</h2>
          <div className="strip" tabIndex={0} aria-label="Gallery videos, scroll sideways">
            {motion.map((m) => <Video key={m} src={m} className="strip-item round" />)}
          </div>
        </section>
      )}
      <section className="section">
        <div className={'split reverse' + (t('video.pause') ? '' : ' single')}>
          {t('video.pause') && <Video src={t('video.pause')} className="square round" />}
          <div className="center-sm">
            <h2 className="section-title left">{t('home.pauseTitle')}</h2>
            <p className="lead">{t('home.pauseBody')}</p>
            <div className="feels" role="group" aria-label="How does it make you feel">
              {['Empowered', 'Seen', 'Calm', 'Curious', 'Moved'].map((f) => <button key={f} className={'chip' + (feels === f ? ' on' : '')} aria-pressed={feels === f} onClick={() => setFeels(f)}>{f}</button>)}
            </div>
            {feels && <p className="muted" role="status">Thank you. Art that makes you feel {feels.toLowerCase()} is art that is working. <Link to="/shop">Find your piece →</Link></p>}
          </div>
        </div>
      </section>
    </>
  );
}

export function Shop() {
  const { t, categories } = useSite();
  useSEO(t('seo.shop.title'), t('seo.shop.description'));
  const [params, setParams] = useSearchParams();
  const cat = params.get('category') || '';
  const [products, setProducts] = useState(null);
  const [view, setView] = useState('grid');
  const [error, setError] = useState('');
  useEffect(() => { setProducts(null); api('products' + (cat ? `?category=${encodeURIComponent(cat)}` : '')).then(setProducts).catch((e) => setError(e.message)); }, [cat]);
  return (
    <section className="section">
      <h1 className="section-title">{t('shop.title')}</h1>
      <p className="center lead">{t('shop.intro')}</p>
      <div className="filters">
        <button className={'chip' + (!cat ? ' on' : '')} onClick={() => setParams({})}>All</button>
        {categories.map((c) => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setParams({ category: c })}>{c}</button>)}
        <span className="spacer" />
        <button className={'chip' + (view === 'grid' ? ' on' : '')} onClick={() => setView('grid')}>Shop view</button>
        <button className={'chip' + (view === 'gallery' ? ' on' : '')} onClick={() => setView('gallery')}>Gallery view</button>
      </div>
      {error && <p className="err center">{error}</p>}
      {!products ? <Loading /> : view === 'gallery' ? <Gallery products={products} /> : products.length === 0 ? <p className="center muted">Nothing in this category yet.</p> : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      )}
    </section>
  );
}

function ProductCard({ p }) {
  const { money, add } = useSite();
  const [added, setAdded] = useState(false);
  return (
    <article className="card">
      <Link to={`/product/${p.slug}`} className="card-img"><img src={p.images[0]} alt={p.title} loading="lazy" />{p.stock <= 0 && <span className="sold">Sold out</span>}</Link>
      <div className="card-body">
        <h3><Link to={`/product/${p.slug}`}>{p.title}</Link></h3>
        <p className="price">{money(p.price_pence)}</p>
        <button className="btn small" disabled={p.stock <= 0} onClick={() => { add(p); setAdded(true); setTimeout(() => setAdded(false), 1500); }}>{p.stock <= 0 ? 'Sold out' : added ? 'Added ✓' : 'Add to basket'}</button>
      </div>
    </article>
  );
}

export function Product() {
  const { slug } = useParams();
  const { money, add, t } = useSite();
  const [p, setP] = useState(undefined);
  const [img, setImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [added, setAdded] = useState(false);
  const nav = useNavigate();
  useEffect(() => { setP(undefined); setImg(0); api('products/' + slug).then(setP).catch(() => setP(null)); }, [slug]);
  useSEO(p ? (p.seo_title || `${p.title} | ${t('site.name')}`) : 'Artwork', p ? (p.seo_description || p.description.slice(0, 155)) : '');
  if (p === undefined) return <Loading />;
  if (!p) return <section className="section center"><h1 className="section-title">Artwork not found</h1><Link className="btn" to="/shop">Back to shop</Link></section>;
  const imgs = p.images.length ? p.images : [];
  return (
    <section className="section product">
      <div className="p-gallery">
        <button className="p-main" onClick={() => imgs.length && setZoom(true)} aria-label="Enlarge image">{imgs[img] ? <img src={imgs[img]} alt={p.title} /> : <div className="noimg">No image</div>}</button>
        {imgs.length > 1 && <div className="thumbs">{imgs.map((s, k) => <button key={s} className={k === img ? 'on' : ''} onClick={() => setImg(k)} aria-label={`Image ${k + 1}`}><img src={s} alt="" /></button>)}</div>}
      </div>
      <div className="p-info">
        <p className="kicker">{p.category}</p>
        <h1>{p.title}</h1>
        <p className="price big">{money(p.price_pence)}</p>
        <p className="desc">{p.description}</p>
        <p className="muted">{p.stock > 0 ? (p.stock <= 3 ? `Only ${p.stock} left` : 'In stock') : 'Sold out'}</p>
        {p.stock > 0 && <div className="buy">
          <label>Qty <input type="number" min="1" max={p.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(p.stock, parseInt(e.target.value) || 1)))} /></label>
          <button className="btn gold" onClick={() => { add(p, qty); setAdded(true); }}>{added ? 'Added ✓' : 'Add to basket'}</button>
          {added && <button className="btn" onClick={() => nav('/cart')}>View basket</button>}
        </div>}
        {p.etsy_url && <p><a href={p.etsy_url} target="_blank" rel="noopener noreferrer">Also available on Etsy ↗</a></p>}
        <p className="muted small">{t('shop.shipping')}</p>
      </div>
      {zoom && <Lightbox items={imgs.map((s) => ({ image: s, title: p.title }))} start={img} onClose={() => setZoom(false)} />}
    </section>
  );
}

export function Cart() {
  const { cart, setQty, remove, total, money } = useSite();
  useSEO('Your basket | MelanaBlac', '');
  if (!cart.length) return <section className="section center"><h1 className="section-title">Your basket is empty</h1><Link to="/shop" className="btn gold">Browse the gallery</Link></section>;
  return (
    <section className="section narrow">
      <h1 className="section-title">Your basket</h1>
      {cart.map((i) => (
        <div className="cart-row" key={i.id}>
          <img src={i.image} alt="" />
          <div><Link to={`/product/${i.slug}`}>{i.title}</Link><p className="muted">{money(i.price_pence)}</p></div>
          <input type="number" min="1" max={i.stock || 10} value={i.qty} aria-label={`Quantity for ${i.title}`} onChange={(e) => setQty(i.id, parseInt(e.target.value) || 1)} />
          <b>{money(i.price_pence * i.qty)}</b>
          <button className="link" onClick={() => remove(i.id)} aria-label={`Remove ${i.title}`}>Remove</button>
        </div>
      ))}
      <p className="total">Total <b>{money(total)}</b></p>
      <p className="right"><Link to="/checkout" className="btn gold">Checkout</Link></p>
    </section>
  );
}

export function Checkout() {
  const { cart, total, money, clear } = useSite();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', line1: '', line2: '', city: '', postcode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useSEO('Checkout | MelanaBlac', '');
  if (!cart.length) return <section className="section center"><h1 className="section-title">Your basket is empty</h1><Link to="/shop" className="btn">Shop</Link></section>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await api('checkout', { method: 'POST', body: { name: f.name, email: f.email, address: { line1: f.line1, line2: f.line2, city: f.city, postcode: f.postcode }, items: cart.map((i) => ({ id: i.id, qty: i.qty })) } });
      clear();
      if (r.redirect) window.location.href = r.redirect; else nav('/order/' + r.number);
    } catch (e2) { setError(e2.message); setBusy(false); }
  };
  return (
    <section className="section narrow">
      <h1 className="section-title">Checkout</h1>
      <form className="form" onSubmit={submit}>
        <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Address line 1<input required value={f.line1} onChange={set('line1')} autoComplete="address-line1" /></label>
        <label>Address line 2<input value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></label>
        <div className="two"><label>Town / city<input required value={f.city} onChange={set('city')} autoComplete="address-level2" /></label>
          <label>Postcode<input required value={f.postcode} onChange={set('postcode')} autoComplete="postal-code" /></label></div>
        <p className="total">Order total <b>{money(total)}</b></p>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn gold" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
      </form>
    </section>
  );
}

export function OrderDone() {
  const { number } = useParams();
  const { money } = useSite();
  const [o, setO] = useState(undefined);
  useSEO('Order confirmed | MelanaBlac', '');
  useEffect(() => { api('order/' + number).then(setO).catch(() => setO(null)); }, [number]);
  if (o === undefined) return <Loading />;
  if (!o) return <section className="section center"><h1 className="section-title">Order not found</h1></section>;
  return (
    <section className="section narrow center">
      <h1 className="section-title">Thank you, {o.name.split(' ')[0]}!</h1>
      <p className="lead">Order <b>{o.number}</b> is {o.status === 'awaiting_payment' ? 'awaiting payment confirmation' : 'confirmed'}. Total {money(o.total_pence)}.</p>
      <ul className="plain">{o.items.map((i) => <li key={i.id}>{i.qty} × {i.title}</li>)}</ul>
      <Link to="/shop" className="btn">Keep browsing</Link>
    </section>
  );
}

export function About() {
  const { t } = useSite();
  useSEO(t('seo.about.title'), t('seo.about.description'));
  return <section className="section narrow center"><h1 className="section-title">{t('about.title')}</h1>{t('about.body').split('\n').filter(Boolean).map((l, i) => <p key={i} className="lead">{l}</p>)}<Link className="btn gold" to="/shop">Shop the collection</Link></section>;
}

export function Contact() {
  const { t } = useSite();
  useSEO(t('seo.contact.title'), t('seo.contact.description'));
  const [f, setF] = useState({ name: '', email: '', body: '', website: '' });
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, done: false, error: '' });
    try { await api('contact', { method: 'POST', body: f }); setState({ busy: false, done: true, error: '' }); setF({ name: '', email: '', body: '', website: '' }); }
    catch (er) { setState({ busy: false, done: false, error: er.message }); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="section narrow">
      <h1 className="section-title">{t('contact.title')}</h1>
      <p className="center lead">{t('contact.body')}</p>
      {state.done ? <p className="center ok" role="status">Thank you. Your message has been sent.</p> : (
        <form className="form" onSubmit={submit}>
          <label>Name<input required value={f.name} onChange={set('name')} /></label>
          <label>Email<input required type="email" value={f.email} onChange={set('email')} /></label>
          <label>Message<textarea required rows="6" value={f.body} onChange={set('body')} /></label>
          <input className="hp" tabIndex="-1" autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
          {state.error && <p className="err" role="alert">{state.error}</p>}
          <button className="btn gold" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</button>
        </form>
      )}
    </section>
  );
}

export const NotFound = () => <section className="section center"><h1 className="section-title">Page not found</h1><Link className="btn" to="/">Home</Link></section>;
