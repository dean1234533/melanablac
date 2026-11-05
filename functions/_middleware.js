import { DEFAULT_SHARE_IMAGE } from '../src/shared/contentSchema.js';
import { optimizedImage } from '../src/shared/mediaPolicy.js';
import { getContent, esc, siteUrl, getAdmin } from './lib/util.js';
import { SEO_PAGES, SEO_BY_PATH, SITE_FAQ } from '../src/shared/seoPages.js';
import { json, normPath, loadProducts, productsFor, pageIndexable, siteGraph, breadcrumb, faqNode, itemList, productNode, crawlerHtml, NOINDEX_PREFIXES } from './lib/seo.js';
const abs = (origin, u) => (u && u.startsWith('/') ? origin + u : u);

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
  const path = normPath(p);
  let products = []; try { products = await loadProducts(env); } catch {}
  let title = c['seo.home.title'], desc = c['seo.home.description'], image = c['seo.home.image'], type_ = 'website';
  let page = SEO_BY_PATH[path], product = null, status = 200, noindex = false;
  const graph = siteGraph(origin, c);
  const crumbs = [{ name: 'Home', path: '/' }];
  const pageKey = { '/': 'home', '/shop': 'shop', '/about': 'about', '/contact': 'contact' }[path];
  if (pageKey) {
    title = c[`seo.${pageKey}.title`]; desc = c[`seo.${pageKey}.description`]; image = c[`seo.${pageKey}.image`];
    const kind = { home: 'WebPage', shop: 'CollectionPage', about: 'AboutPage', contact: 'ContactPage' }[pageKey];
    graph.push({ '@type': kind, '@id': `${origin}${path}#page`, url: origin + path, name: title, description: desc, isPartOf: { '@id': `${origin}/#website` }, inLanguage: 'en-GB', primaryImageOfPage: abs(origin, image) });
    if (pageKey !== 'home') graph.push(breadcrumb(origin, [...crumbs, { name: pageKey === 'shop' ? 'Shop' : pageKey === 'about' ? 'About' : 'Contact', path }]));
    if (pageKey === 'shop') graph.push(itemList(origin, products));
  } else if (path === '/faq') {
    title = `FAQ | ${c['site.name']}`; desc = 'Card size, what is inside, delivery, commissions and how to contact MelanaBlac.';
    const faqs = SITE_FAQ((k) => c[k] ?? '');
    graph.push({ '@type': 'WebPage', url: origin + path, name: title, description: desc, isPartOf: { '@id': `${origin}/#website` } }, faqNode(faqs), breadcrumb(origin, [...crumbs, { name: 'FAQ', path }]));
  } else if (page) {
    title = page.title; desc = page.description; image = (productsFor(page, products)[0]?.images[0]) || image;
    const ps = productsFor(page, products);
    noindex = !pageIndexable(page, products);
    const trail = [...crumbs]; if (page.kind !== 'hub' && page.kind !== 'guide') trail.push({ name: 'Cards', path: '/cards' });
    trail.push({ name: page.h1, path });
    graph.push(page.kind === 'guide'
      ? { '@type': 'Article', '@id': `${origin}${path}#article`, headline: page.h1, description: desc, url: origin + path, inLanguage: 'en-GB', author: { '@id': `${origin}/#org` }, publisher: { '@id': `${origin}/#org` }, image: abs(origin, image), mainEntityOfPage: origin + path }
      : { '@type': 'CollectionPage', '@id': `${origin}${path}#page`, url: origin + path, name: page.h1, description: desc, isPartOf: { '@id': `${origin}/#website` }, inLanguage: 'en-GB' });
    graph.push(breadcrumb(origin, trail), faqNode(page.faqs));
    if (ps.length) graph.push(itemList(origin, ps));
  } else {
    const m = path.match(/^\/product\/([^/]+)$/);
    const r = m && env.DB ? await env.DB.prepare("SELECT * FROM products WHERE slug=? AND status='published'").bind(m[1]).first() : null;
    if (r) {
      product = r;
      const imgs = JSON.parse(r.images || '[]').map(optimizedImage);
      title = r.seo_title || `${r.title} | ${c['site.name']}`;
      desc = r.seo_description || r.description.slice(0, 155);
      image = imgs[0] || image; type_ = 'product';
      page = SEO_PAGES.find((pg) => pg.kind === 'category' && pg.category === r.category);
      const trail = [...crumbs, ...(page ? [{ name: page.h1, path: page.path }] : [{ name: 'Shop', path: '/shop' }]), { name: r.title, path }];
      graph.push(productNode(origin, c, r, path, imgs, desc), breadcrumb(origin, trail));
    } else if (NOINDEX_PREFIXES.some((x) => path === x.replace(/\/$/, '') || path.startsWith(x))) {
      noindex = true; title = `${c['site.name']}`;
    } else {
      status = 404; noindex = true; title = `Page not found | ${c['site.name']}`; desc = 'This page could not be found.';
    }
  }
  const absImage = (i) => { const im = optimizedImage(i); return im && im.startsWith('/') ? origin + im : im; };
  const isDefault = image === DEFAULT_SHARE_IMAGE;
  const shareImage = image ? `<meta property="og:image" content="${esc(absImage(image))}"><meta property="og:image:alt" content="${esc(isDefault ? 'MelanaBlac artwork: a portrait with an African sunset and acacia trees' : title)}">${isDefault ? '<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1024"><meta property="og:image:height" content="1024">' : ''}<meta name="twitter:image" content="${esc(absImage(image))}">` : '';
  const canonical = `${origin}${path}`;
  const robots = noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  const head = `<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="${robots}">` +
    `<link rel="alternate" hreflang="en-GB" href="${canonical}"><link rel="alternate" hreflang="x-default" href="${canonical}">` +
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type_}"><meta property="og:url" content="${canonical}"><meta property="og:locale" content="en_GB">${shareImage}<meta property="og:site_name" content="${esc(c['site.name'])}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">` +
    (noindex ? '' : json({ '@context': 'https://schema.org', '@graph': graph }));
  const out = new Response(res.body, res);
  if (status !== 200) out.headers.set('x-robots-tag', 'noindex');
  const rewriter = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(title || 'MelanaBlac'); } })
    .on('head', { element(e) { e.append(head, { html: true }); } });
  if (!noindex) rewriter.on('body', { element(e) { e.append(crawlerHtml({ origin, c, path, products, page, product }), { html: true }); } });
  return new Response(rewriter.transform(out).body, { status, headers: out.headers });
}
