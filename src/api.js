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
export const uploadImage = (file) => api('admin/upload', { method: 'POST', raw: file, headers: { 'content-type': file.type } });
