const toUint8 = (b64) => { const p = '='.repeat((4 - (b64.length % 4)) % 4); const r = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
import { api } from '../api.js';

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }); } catch { return null; }
}
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/admin/');
  return reg ? reg.pushManager.getSubscription() : null;
}
export async function enablePush() {
  if (!pushSupported()) throw new Error('Push notifications are not supported on this browser. On iPhone, install the app to your Home Screen first.');
  const { key } = await api('admin/push/key');
  if (!key) throw new Error('Push is not configured on the server yet (VAPID keys missing).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were blocked. Allow them in your browser settings and try again.');
  const reg = (await registerSW()) && (await navigator.serviceWorker.ready);
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) });
  await api('admin/push/subscribe', { method: 'POST', body: sub.toJSON() });
  return sub;
}
export async function disablePush() {
  const sub = await currentSub();
  if (sub) { await api('admin/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }); await sub.unsubscribe(); }
}
