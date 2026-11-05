// Server-side SEO / GEO / AEO helpers: structured data (JSON-LD) and crawler-readable HTML.
import { SEO_PAGES, SEO_BY_PATH, SITE_FAQ, matchesProduct } from '../../src/shared/seoPages.js';
import { optimizedImage } from '../../src/shared/mediaPolicy.js';
import { esc } from './util.js';
import { deliveryText } from '../../src/shared/delivery.js';

export const MIN_PRODUCTS_TO_INDEX = 2; // thinner pages stay out of the index and sitemap
export const NOINDEX_PREFIXES = ['/cart', '/checkout', '/order/'];
export const STATIC_PATHS = ['/', '/shop', '/about', '/contact', '/faq'];

export const json = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
export const normPath = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/';

export async function loadProducts(env) {
  if (!env.DB) return [];
  const { results } = await env.DB.prepare("SELECT slug,title,category,description,price_pence,images,stock FROM products WHERE status='published' ORDER BY sort, id DESC").all();
  return results.map((r) => ({ ...r, images: JSON.parse(r.images || '[]').map(optimizedImage) }));
}
export const productsFor = (page, products) => (page.kind === 'hub' || page.kind === 'guide' ? [] : products.filter((p) => matchesProduct(page, p)));
export const pageIndexable = (page, products) => page.kind === 'hub' || page.kind === 'guide' || productsFor(page, products).length >= MIN_PRODUCTS_TO_INDEX;
export const indexablePages = (products) => SEO_PAGES.filter((pg) => pageIndexable(pg, products));

const abs = (origin, u) => (u && u.startsWith('/') ? origin + u : u);

export function siteGraph(origin, c) {
  const org = { '@type': 'OnlineStore', '@id': `${origin}/#org`, name: c['site.name'], url: origin, logo: `${origin}/logo-dark.png`, image: abs(origin, c['seo.home.image']), description: c['seo.home.description'], email: c['site.email'], currenciesAccepted: 'GBP' };
  if (c['site.instagram']) org.sameAs = [c['site.instagram']];
  const site = { '@type': 'WebSite', '@id': `${origin}/#website`, url: origin, name: c['site.name'], inLanguage: 'en-GB', publisher: { '@id': `${origin}/#org` } };
  return [org, site];
}
export const breadcrumb = (origin, items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: origin + it.path })) });
export const faqNode = (faqs) => ({ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
export const itemList = (origin, products) => ({ '@type': 'ItemList', numberOfItems: products.length, itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/product/${p.slug}`, name: p.title, image: abs(origin, p.images[0]) })) });

export function productNode(origin, c, r, path, imgs, desc) {
  const page = SEO_PAGES.find((pg) => pg.kind === 'category' && pg.category === r.category);
  return {
    '@type': 'Product', '@id': `${origin}${path}#product`, name: r.title, description: desc, sku: r.slug, category: r.category,
    image: imgs.map((i) => abs(origin, i)), brand: { '@type': 'Brand', name: c['site.name'] },
    offers: { '@type': 'Offer', url: origin + path, priceCurrency: 'GBP', price: (r.price_pence / 100).toFixed(2), itemCondition: 'https://schema.org/NewCondition', availability: r.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@id': `${origin}/#org` } },
    ...(page ? { isRelatedTo: { '@type': 'CollectionPage', url: origin + page.path, name: page.h1 } } : {}),
  };
}

const money = (c, p) => `${c['site.currency'] || '£'}${(p / 100).toFixed(2)}`;
const list = (items) => `<ul>${items.join('')}</ul>`;
const productLinks = (origin, c, products) => list(products.map((p) => `<li><a href="/product/${esc(p.slug)}">${esc(p.title)}</a> (${esc(p.category)}), ${esc(money(c, p.price_pence))}${p.stock > 0 ? '' : ', sold out'}</li>`));
const pageLinks = (pages) => list(pages.map((pg) => `<li><a href="${esc(pg.path)}">${esc(pg.h1)}</a></li>`));
const faqHtml = (faqs) => faqs.length ? `<section><h2>Frequently asked questions</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>` : '';
const nav = '<nav><a href="/">Home</a> · <a href="/shop">Shop</a> · <a href="/cards">Cards by occasion</a> · <a href="/about">About</a> · <a href="/faq">FAQ</a> · <a href="/contact">Contact</a></nav>';

// Plain, semantic HTML for crawlers and AI assistants that do not run JavaScript. Placed in <noscript>, so visitors never see it.
export function crawlerHtml({ origin, c, path, products, page, product }) {
  const related = (page?.related || []).map((p) => SEO_BY_PATH[p]).filter(Boolean);
  let body = '';
  if (path === '/') {
    body = `<h1>${esc(c['home.title'])}</h1><p>${esc(c['home.tagline'])}</p><h2>${esc(c['home.welcomeTitle'])}</h2><p>${esc(c['home.welcomeBody'])}</p><h2>${esc(c['home.whyTitle'])}</h2><p>${esc(c['home.whyBody'])}</p><h2>Shop by occasion</h2>${pageLinks(SEO_PAGES.filter((p) => p.kind === 'category'))}<h2>Featured cards</h2>${productLinks(origin, c, products.slice(0, 12))}`;
  } else if (path === '/shop') {
    body = `<h1>${esc(c['shop.title'])}</h1><p>${esc(c['shop.intro'])}</p><p>${esc(deliveryText(c))}</p><h2>Browse by occasion</h2>${pageLinks(SEO_PAGES.filter((p) => p.kind === 'category'))}<h2>All cards</h2>${productLinks(origin, c, products)}`;
  } else if (path === '/about') {
    body = `<h1>${esc(c['about.title'])}</h1><p>${esc(c['about.body'])}</p>`;
  } else if (path === '/contact') {
    body = `<h1>${esc(c['contact.title'])}</h1><p>${esc(c['contact.body'])}</p><p>Email: ${esc(c['site.email'])}</p>`;
  } else if (path === '/faq') {
    body = `<h1>Frequently asked questions</h1>${faqHtml(SITE_FAQ((k) => c[k] ?? ''))}`;
  } else if (product) {
    body = `<h1>${esc(product.title)}</h1><p>${esc(product.description)}</p><p>Category: <a href="${esc(page?.path || '/shop')}">${esc(product.category)}</a>. Price: ${esc(money(c, product.price_pence))}. ${product.stock > 0 ? 'In stock.' : 'Sold out.'}</p>`;
  } else if (page) {
    const ps = productsFor(page, products);
    body = `<h1>${esc(page.h1)}</h1>${page.intro.map((t) => `<p>${esc(t)}</p>`).join('')}${page.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join('')}${s.links ? list(s.links.map((l) => `<li><a href="${esc(l.path)}">${esc(l.label)}</a></li>`)) : ''}`).join('')}${page.kind === 'hub' ? `<h2>Occasions</h2>${pageLinks(SEO_PAGES.filter((p) => p.kind === 'category'))}<h2>Guides</h2>${pageLinks(SEO_PAGES.filter((p) => p.kind === 'guide'))}` : ''}${ps.length ? `<h2>${esc(page.h1)} in the shop</h2>${productLinks(origin, c, ps)}` : ''}${faqHtml(page.faqs)}${related.length ? `<h2>Related</h2>${pageLinks(related)}` : ''}`;
  }
  return `<noscript><header>${nav}</header><main>${body}</main></noscript>`;
}

// llms.txt: a concise, link-rich summary for AI assistants (https://llmstxt.org).
export function llmsTxt(origin, c, products) {
  const cats = SEO_PAGES.filter((p) => p.kind === 'category');
  const guides = SEO_PAGES.filter((p) => p.kind === 'guide');
  return [
    `# ${c['site.name']}`, '',
    `> ${c['seo.home.description']}`, '',
    `${c['site.name']} sells original illustrated greeting cards celebrating Black culture, family, faith and joy. Every card is ${'A5 (148 × 210 mm)'}, blank inside, and comes with an envelope. Prices are in GBP. ${deliveryText(c)}`, '',
    '## Shop', `- [Shop all cards](${origin}/shop): the full collection (${products.length} designs)`, `- [Cards by occasion](${origin}/cards): birthday, Christmas, nativity, Mother's Day and inspirational`,
    ...cats.map((p) => `- [${p.h1}](${origin}${p.path}): ${p.description}`), '',
    '## Guides', ...guides.map((p) => `- [${p.h1}](${origin}${p.path}): ${p.description}`), '',
    '## About', `- [About the artist](${origin}/about)`, `- [FAQ](${origin}/faq): size, delivery, commissions and contact`, `- [Contact](${origin}/contact): ${c['site.email']}`, '',
    '## Products', ...products.map((p) => `- [${p.title}](${origin}/product/${p.slug}): ${p.category}, ${money(c, p.price_pence)}`), '',
  ].join('\n');
}
