import { siteUrl } from './lib/util.js';
export const onRequest = ({ request, env }) => new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${siteUrl(env, request)}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
