import { siteUrl, getContent } from './lib/util.js';
import { loadProducts, llmsTxt } from './lib/seo.js';
export async function onRequest({ request, env }) {
  const [c, products] = await Promise.all([getContent(env), loadProducts(env)]);
  return new Response(llmsTxt(siteUrl(env, request), c, products), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
