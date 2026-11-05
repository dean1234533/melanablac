export async function api(path, { method = 'GET', body, raw, headers = {} } = {}) {
  const opts = { method, credentials: 'same-origin', headers: { ...headers } };
  if (method !== 'GET') opts.headers['x-requested-with'] = 'mb';
  if (raw) opts.body = raw;
  else if (body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch('/api/' + path, opts); } catch { throw new Error('Network error. Check your connection.'); }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error(data?.error || `Request failed (${res.status})`); e.status = res.status; throw e; }
  return data;
}
// Shrinks big photos in the browser (max 1800px, JPEG/WebP) so uploads are fast and fit storage limits.
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || (file.size < 900_000 && file.type !== 'image/png')) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    for (const q of [0.88, 0.8, 0.7, 0.6]) {
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
      if (blob && blob.size < 1_400_000) return blob;
    }
  } catch {}
  return file;
}
export const uploadImage = async (file) => { const f = await shrink(file); return api('admin/upload', { method: 'POST', raw: f, headers: { 'content-type': f.type || file.type } }); };
