// Serves /video/* with HTTP Range support (Safari/iOS will not play MP4 without 206 responses).
export async function onRequest({ request, env }) {
  const res = await env.ASSETS.fetch(new Request(request.url, { method: 'GET' }));
  if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) return new Response('Not found', { status: 404 }); // missing files fall through to the SPA page
  const buf = await res.arrayBuffer();
  const total = buf.byteLength;
  const base = { 'content-type': res.headers.get('content-type') || 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=86400' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    const start = m[1] === '' ? Math.max(0, total - Number(m[2])) : Number(m[1]);
    const end = m[1] === '' || m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1);
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${total}` } });
    return new Response(request.method === 'HEAD' ? null : buf.slice(start, end + 1), { status: 206, headers: { ...base, 'content-range': `bytes ${start}-${end}/${total}`, 'content-length': String(end - start + 1) } });
  }
  return new Response(request.method === 'HEAD' ? null : buf, { status: 200, headers: { ...base, 'content-length': String(total) } });
}
