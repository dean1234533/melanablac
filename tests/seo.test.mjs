import test from 'node:test';
import assert from 'node:assert/strict';
import { SEO_PAGES, SEO_BY_PATH, SITE_FAQ, matchesProduct } from '../src/shared/seoPages.js';
import { deliveryText, deliveryFeePence } from '../src/shared/delivery.js';
import { DEFAULTS } from '../src/shared/contentSchema.js';

test('SEO page data is well formed', () => {
  const paths = new Set();
  for (const p of SEO_PAGES) {
    assert.ok(p.path.startsWith('/') && !paths.has(p.path), `unique path ${p.path}`);
    paths.add(p.path);
    assert.ok(p.title.length <= 65, `${p.path} title too long (${p.title.length})`);
    assert.ok(p.description.length >= 70 && p.description.length <= 170, `${p.path} description length ${p.description.length}`);
    assert.ok(p.intro.length && p.faqs.length, `${p.path} needs intro and FAQs`);
    for (const r of p.related) assert.ok(SEO_BY_PATH[r], `${p.path} related ${r} exists`);
    for (const s of p.sections) for (const l of s.links || []) assert.ok(SEO_BY_PATH[l.path], `${p.path} link ${l.path} exists`);
  }
});
test('titles and descriptions of core pages are within search-result limits', () => {
  assert.ok(DEFAULTS['seo.home.title'].length <= 65);
  for (const k of ['seo.home.description', 'seo.shop.description']) assert.ok(DEFAULTS[k].length <= 170, k);
});
test('product filters match by category and title', () => {
  const pg = SEO_BY_PATH['/cards/18th-birthday-cards'];
  assert.ok(matchesProduct(pg, { category: 'Birthday Cards', title: '18th Birthday: To My Beautiful Sister' }));
  assert.ok(!matchesProduct(pg, { category: 'Christmas Cards', title: '18th Birthday' }));
  assert.ok(!matchesProduct(SEO_BY_PATH['/cards/birthday-cards-for-boys-and-men'], { category: 'Birthday Cards', title: 'Happy Birthday: Reason to Smile' }));
});
test('site FAQ fills dynamic answers', () => {
  const faq = SITE_FAQ((k) => `<${k}>`);
  assert.ok(faq.some((f) => f.a.includes('<shop.shipping>')));
});

test('delivery text and fee follow the editable settings', () => {
  assert.equal(deliveryFeePence(DEFAULTS, 450), 350);
  assert.equal(deliveryFeePence(DEFAULTS, 0), 0);
  assert.equal(deliveryFeePence({ ...DEFAULTS, 'shop.freeDeliveryOver': '20' }, 2000), 0);
  assert.match(deliveryText(DEFAULTS), /UK delivery is £3\.50\./);
  assert.match(deliveryText({ ...DEFAULTS, 'shop.deliveryFee': '0' }), /free/);
});
