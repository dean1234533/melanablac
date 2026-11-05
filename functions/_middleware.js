import { getContent, esc, siteUrl, getAdmin } from './lib/util.js';

// Injects per-page SEO tags (editable in the admin dashboard) into the HTML for crawlers and link previews.
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const res = await next();
  const type = res.headers.get('content-type') || '';
  if (!['GET', 'HEAD'].includes(request.method) || !type.includes('text/html')) return res;
  const p = url.pathname;
  if (p.startsWith('/api/')) return res;
  const origin = siteUrl(env, request);
  const isAdmin = p === '/admin' || p.startsWith('/admin/');
  if (isAdmin) {
    const publicPage = /^\/admin\/(login|forgot|reset)\/?$/.test(p);
    if (!publicPage && !(await getAdmin(request, env))) {
      return new Response(null, { status: 302, headers: { location: '/admin/login', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
    }
    const privateResponse = new Response(res.body, res);
    privateResponse.headers.set('cache-control', 'private, no-store');
    privateResponse.headers.set('x-robots-tag', 'noindex, nofollow');
    return new HTMLRewriter()
      .on('title', { element(e) { e.setInnerContent('MelanaBlac Studio'); } })
      .on('head', { element(e) { e.append('<meta name="robots" content="noindex,nofollow">', { html: true }); } })
      .transform(privateResponse);
  }
  let c; try { c = await getContent(env); } catch { return res; }
  let title = c['seo.home.title'], desc = c['seo.home.description'], image = c['seo.home.image'], extra = '', type_ = 'website';
  const pageKey = { '/': 'home', '/shop': 'shop', '/about': 'about', '/contact': 'contact' }[p.replace(/\/$/, '') || '/'];
  if (pageKey) { title = c[`seo.${pageKey}.title`]; desc = c[`seo.${pageKey}.description`]; image = c[`seo.${pageKey}.image`]; }
  const m = p.match(/^\/product\/([^/]+)$/);
  if (m && env.DB) {
    const r = await env.DB.prepare("SELECT * FROM products WHERE slug=? AND status='published'").bind(m[1]).first();
    if (r) {
      const imgs = JSON.parse(r.images || '[]');
      title = r.seo_title || `${r.title} | ${c['site.name']}`;
      desc = r.seo_description || r.description.slice(0, 155);
      image = imgs[0] || image; type_ = 'product';
      extra = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: r.title, description: desc, image: imgs.map((i) => origin + i), offers: { '@type': 'Offer', priceCurrency: 'GBP', price: (r.price_pence / 100).toFixed(2), availability: r.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: origin + p } }).replace(/</g, '\\u003c')}</script>`;
    }
  }
  if (isAdmin) { title = 'MelanaBlac Admin'; desc = 'Manage your art shop.'; }
  const abs = (i) => (i && i.startsWith('/') ? origin + i : i);
  const head = `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${origin}${p}">` +
    (isAdmin ? '<meta name="robots" content="noindex,nofollow">' : `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type_}"><meta property="og:url" content="${origin}${p}">${image ? `<meta property="og:image" content="${esc(abs(image))}">` : ''}<meta name="twitter:card" content="summary_large_image">`) + extra;
  return new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(title || 'MelanaBlac'); } })
    .on('head', { element(e) { e.append(head, { html: true }); } })
    .transform(res);
}
