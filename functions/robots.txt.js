import { siteUrl } from './lib/util.js';
// Search and AI crawlers are welcome on public pages; private areas stay out.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Bingbot', 'DuckAssistBot', 'CCBot'];
export const onRequest = ({ request, env }) => {
  const o = siteUrl(env, request);
  const block = 'Disallow: /admin\nDisallow: /api/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /order/\n';
  const txt = `User-agent: *\nAllow: /\n${block}\n${AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /\n${block}`).join('\n')}\nSitemap: ${o}/sitemap.xml\n# AI summary: ${o}/llms.txt\n`;
  return new Response(txt, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
