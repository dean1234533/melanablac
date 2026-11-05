import { siteUrl, esc } from './lib/util.js';
import { loadProducts, indexablePages, STATIC_PATHS } from './lib/seo.js';
export async function onRequest({ request, env }) {
  const o = siteUrl(env, request);
  const products = await loadProducts(env);
  const abs = (u) => (u && u.startsWith('/') ? o + u : u);
  const entry = (loc, { priority, images = [] } = {}) => `<url><loc>${esc(o + loc)}</loc>${priority ? `<priority>${priority}</priority>` : ''}${images.filter(Boolean).slice(0, 5).map((i) => `<image:image><image:loc>${esc(abs(i))}</image:loc></image:image>`).join('')}</url>`;
  const urls = [
    ...STATIC_PATHS.map((u) => entry(u, { priority: u === '/' ? '1.0' : '0.8' })),
    ...indexablePages(products).map((pg) => entry(pg.path, { priority: pg.kind === 'guide' ? '0.6' : '0.9' })),
    ...products.map((p) => entry(`/product/${p.slug}`, { priority: '0.7', images: p.images })),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
