// Generates original placeholder artwork (SVG) and seed.sql. Replace via the admin dashboard.
import fs from 'node:fs';
const W = 800, H = 1000;
let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const pal = [
  ['#0b0b0d', '#d4af37', '#7a5c12'], ['#0a1022', '#e8c766', '#3a5fa8'], ['#1a0a0a', '#f0b84a', '#8a2b2b'],
  ['#07120f', '#d9b95b', '#2f7a63'], ['#120a1a', '#e6c36a', '#6a3a9a'], ['#0d0d0d', '#f2e2a8', '#555555'],
];
const styles = {
  rings: (c) => Array.from({ length: 14 }, (_, i) => `<circle cx="400" cy="480" r="${40 + i * 26}" fill="none" stroke="${i % 3 ? c[1] : c[2]}" stroke-width="${1 + (i % 4)}" opacity="${0.9 - i * 0.04}"/>`).join('') + `<circle cx="400" cy="480" r="30" fill="${c[1]}"/>`,
  moon: (c) => `<circle cx="400" cy="400" r="190" fill="${c[1]}"/><circle cx="470" cy="360" r="170" fill="${c[0]}"/>` + Array.from({ length: 60 }, () => `<circle cx="${rnd() * W}" cy="${rnd() * 700}" r="${rnd() * 2.2}" fill="${c[1]}" opacity="${rnd()}"/>`).join('') + `<path d="M0 820 Q200 720 400 810 T800 780 V1000 H0Z" fill="${c[2]}"/>`,
  rays: (c) => Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return `<line x1="400" y1="500" x2="${400 + Math.cos(a) * 700}" y2="${500 + Math.sin(a) * 700}" stroke="${i % 2 ? c[1] : c[2]}" stroke-width="${2 + (i % 5)}" opacity="0.7"/>`; }).join('') + `<circle cx="400" cy="500" r="110" fill="${c[0]}" stroke="${c[1]}" stroke-width="6"/>`,
  waves: (c) => Array.from({ length: 18 }, (_, i) => `<path d="M0 ${200 + i * 42} Q200 ${140 + i * 42 + (i % 3) * 40} 400 ${200 + i * 42} T800 ${200 + i * 42}" fill="none" stroke="${i % 2 ? c[1] : c[2]}" stroke-width="${2 + (i % 3)}"/>`).join(''),
  petals: (c) => Array.from({ length: 12 }, (_, i) => `<ellipse cx="400" cy="320" rx="50" ry="190" fill="${i % 2 ? c[1] : c[2]}" opacity="0.75" transform="rotate(${i * 30} 400 500)"/>`).join('') + `<circle cx="400" cy="500" r="48" fill="${c[0]}" stroke="${c[1]}" stroke-width="5"/>`,
  shards: (c) => Array.from({ length: 40 }, () => { const x = rnd() * W, y = rnd() * H; return `<polygon points="${x},${y} ${x + rnd() * 140 - 20},${y + rnd() * 100} ${x + rnd() * 90},${y + rnd() * 180}" fill="${rnd() > 0.5 ? c[1] : c[2]}" opacity="${0.35 + rnd() * 0.6}"/>`; }).join(''),
  arches: (c) => Array.from({ length: 8 }, (_, i) => `<path d="M${120 + i * 20} 900 V${520 - i * 20} A${280 - i * 20} ${280 - i * 20} 0 0 1 ${680 - i * 20} ${520 - i * 20} V900" fill="none" stroke="${i % 2 ? c[1] : c[2]}" stroke-width="${3 + i % 3}"/>`).join(''),
  silhouette: (c) => `<circle cx="400" cy="420" r="260" fill="${c[2]}" opacity="0.55"/><path d="M400 250 C330 250 300 320 320 390 C330 430 300 470 250 520 C200 570 190 700 190 1000 H610 C610 700 600 570 550 520 C500 470 470 430 480 390 C500 320 470 250 400 250Z" fill="#050505" stroke="${c[1]}" stroke-width="4"/><circle cx="400" cy="300" r="26" fill="${c[1]}"/>`,
};
const works = [
  ['Golden Orbit', 'rings', 0, 'Gallery', 8500, 'A study in orbits and light. Gold leaf tones on deep black, printed on archival paper and framed.'],
  ['Midnight Moon', 'moon', 1, 'Gallery', 9500, 'Moonlight over still water. Deep blues and warm gold.'],
  ['Crown of Light', 'rays', 2, 'Gallery', 11000, 'Radiant lines break outward from a calm centre.'],
  ['Still Waters', 'waves', 3, 'Gallery', 7500, 'Layered currents in emerald and gold.'],
  ['Bloom in Blac', 'petals', 4, 'Gallery', 10000, 'A flower of violet and gold opening against the dark.'],
  ['Breaking Free', 'shards', 5, 'Gallery', 12500, 'Fragments rise and scatter, turning fear into movement.'],
  ['The Gateway', 'arches', 1, 'Gallery', 9000, 'Nested arches, a doorway into somewhere new.'],
  ['Quiet Power', 'silhouette', 2, 'Gallery', 13500, 'A silhouette lit from behind by a deep ember glow.'],
  ['Golden Hour Card', 'rings', 3, 'Greeting Cards', 450, 'A5 greeting card, blank inside, with envelope.'],
  ['Moonrise Card', 'moon', 4, 'Greeting Cards', 450, 'A5 greeting card, blank inside, with envelope.'],
  ['Bloom Card', 'petals', 0, 'Greeting Cards', 450, 'A5 greeting card, blank inside, with envelope.'],
  ['Gateway Card', 'arches', 5, 'Greeting Cards', 450, 'A5 greeting card, blank inside, with envelope.'],
];
const svg = (body, c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="${c[2]}" stop-opacity=".45"/><stop offset="1" stop-color="${c[0]}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="${c[0]}"/><rect width="${W}" height="${H}" fill="url(#g)"/>${body}<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${c[1]}" stroke-width="5"/></svg>`;
const q = (t) => `'${String(t).replace(/'/g, "''")}'`;
let sql = ''; const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
works.forEach(([title, st, p, cat, price, desc], i) => {
  const c = pal[p]; const f = `${slug(title)}.svg`;
  fs.writeFileSync(`public/art/${f}`, svg(styles[st](c), c));
  sql += `INSERT INTO products (slug,title,description,price_pence,category,images,stock,featured,sort) VALUES (${q(slug(title))},${q(title)},${q(desc)},${price},${q(cat)},${q(JSON.stringify(['/art/' + f]))},${cat === 'Gallery' ? 3 : 25},${i < 4 ? 1 : 0},${i});\n`;
});
[['Golden Orbit', 0, 'rings'], ['Midnight Moon', 1, 'moon'], ['Crown of Light', 2, 'rays']].forEach(([t, p, st], i) => {
  const W2 = 1600, c = pal[p]; const f = `hero-${i + 1}.svg`;
  fs.writeFileSync(`public/art/${f}`, svg(styles[st](c), c).replace(`viewBox="0 0 ${W} ${H}"`, `viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"`));
  sql += `INSERT INTO slides (image,title,subtitle,link,sort) VALUES ('/art/${f}',${q(t)},${q(['Original framed art', 'Light in the dark', 'Power in every line'][i])},'/shop',${i});\n`;
});
fs.writeFileSync('seed.sql', sql);
console.log('seed.sql + art written');
