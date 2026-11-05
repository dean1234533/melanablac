// Usage: node scripts/import-art.mjs [sourceDir]
// Converts the supplied PNGs to web JPEGs in public/art/cards, builds the gold logo, favicon and app icons,
// and writes public/art/cards/manifest.json (used by make-seed.mjs). Titles/prices come from scripts/art-titles.json.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
const src = process.argv[2] || '/Volumes/Untitled/claude-tmp/jacq/raw';
const out = 'public/art/cards';
fs.mkdirSync(out, { recursive: true });
const titles = JSON.parse(fs.readFileSync('scripts/art-titles.json', 'utf8'));
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- logo ----
const logoFile = fs.readdirSync(src).find((f) => /^melana.?black/i.test(f));
if (logoFile) {
  // The supplied PNG is dark ink on opaque white, so build real transparency from ink darkness.
  const base = await sharp(path.join(src, logoFile)).flatten({ background: '#ffffff' }).trim({ background: '#ffffff', threshold: 40 }).resize({ width: 1000 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = base;
  const mk = (rgb) => { const b = Buffer.alloc(data.length); for (let i = 0; i < data.length; i += 4) { const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114); const a = Math.max(0, Math.min(255, Math.round((255 - lum) * 1.25))); b[i] = rgb[0]; b[i + 1] = rgb[1]; b[i + 2] = rgb[2]; b[i + 3] = a; } return b; };
  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  await sharp(mk([0x2a, 0x2a, 0x30]), raw).png().toFile('public/logo-dark.png');
  await sharp(mk([0xe8, 0xc5, 0x5a]), raw).png().toFile('public/logo.png');
  const meta = { width: info.width, height: info.height };
  for (const [name, s] of [['admin/icon-192.png', 192], ['admin/icon-512.png', 512], ['admin/apple-touch-icon.png', 180], ['favicon.png', 64]]) {
    const inner = await sharp('public/logo.png').resize({ width: Math.round(s * 0.84) }).toBuffer();
    await sharp({ create: { width: s, height: s, channels: 4, background: '#0b0b0d' } }).composite([{ input: inner, gravity: 'centre' }]).png().toFile('public/' + name);
  }
  console.log('logo ok', meta.width, 'x', meta.height);
}

// ---- artwork ----
const manifest = [];
const present = new Set(fs.readdirSync(src));
const order = Object.keys(titles).filter((f) => present.has(f));
const extra = fs.readdirSync(src).filter((f) => /\.png$/i.test(f) && !f.startsWith('._') && f !== logoFile && !titles[f] && !/^ATTR2022_1_/.test(f)).sort();
const files = [...order, ...extra];
for (const f of files) {
  const t = titles[f] || titles[f.replace(/_/g, ' ')] || {};
  const code = f.replace(/\.png$/i, '').replace(/[_\s]+/g, ' ').trim();
  const title = t.title || `Greeting Card ${code}`;
  const name = slug(title) + '.jpg';
  await sharp(path.join(src, f)).flatten({ background: '#ffffff' }).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(out, name));
  await sharp(path.join(src, f)).flatten({ background: '#ffffff' }).resize({ width: 480, withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(out, 'thumb-' + name));
  manifest.push({ source: f, title, slug: slug(title), image: `/art/cards/${name}`, thumb: `/art/cards/thumb-${name}`, description: t.description || `Illustrated greeting card (${code}). A5, blank inside, with envelope.`, price_pence: t.price_pence || 450, category: t.category || 'Greeting Cards', featured: !!t.featured, status: t.status || 'published' });
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('imported', manifest.length, 'artworks');
