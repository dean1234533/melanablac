import sharp from 'sharp';
const svg = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0b0b0d"/><circle cx="256" cy="256" r="190" fill="none" stroke="#d4af37" stroke-width="14"/><text x="256" y="320" font-family="Georgia,serif" font-style="italic" font-size="210" text-anchor="middle" fill="#d4af37">MB</text></svg>`);
for (const s of [192, 512]) await sharp(svg(s)).png().toFile(`public/admin/icon-${s}.png`);
await sharp(svg(180)).png().toFile('public/admin/apple-touch-icon.png');
await sharp(svg(64)).png().toFile('public/favicon.png');
console.log('icons done');
