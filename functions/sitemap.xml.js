import { siteUrl } from './lib/util.js';
export async function onRequest({ request, env }) {
  const o = siteUrl(env, request);
  const { results } = await env.DB.prepare("SELECT slug FROM products WHERE status='published'").all();
  const urls = ['/', '/shop', '/about', '/contact', ...results.map((r) => `/product/${r.slug}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${o}${u}</loc></url>`).join('')}</urlset>`, { headers: { 'content-type': 'application/xml' } });
}
