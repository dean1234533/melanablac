import { api } from "../api.js";
const toUint8 = (b64) => {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try { return await navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }); }
  catch { return null; }
}
export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/admin/");
  return reg ? reg.pushManager.getSubscription() : null;
}
export async function preparePush() {
  if (!pushSupported()) throw new Error("Install Studio on your Home Screen and open it there to enable notifications, or use a browser that supports web push.");
  const [{ key }, registration] = await withTimeout(Promise.all([api("admin/push/key"), registerSW()]), 15000, "Could not reach the server. Check your connection and reopen Studio.");
  if (!key) throw new Error("Notifications are not configured on the server yet.");
  if (!registration) throw new Error("The notification service could not start. Reload Studio and try again.");
  if (!registration.active) {
    await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      const timer = setTimeout(() => finish(new Error("The notification service is taking too long. Reload Studio and try again.")), 15000);
      const finish = (error) => {
        clearTimeout(timer);
        worker?.removeEventListener("statechange", check);
        error ? reject(error) : resolve();
      };
      const check = () => {
        if (registration.active || worker?.state === "activated") finish();
        else if (!worker || worker.state === "redundant") finish(new Error("The notification service could not start. Reload Studio and try again."));
      };
      worker?.addEventListener("statechange", check);
      check();
    });
  }
  return { key, registration };
}
const withTimeout = (promise, ms, message) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export async function enablePush(prepared) {
  if (isIOS() && !isStandalone()) throw new Error("On iPhone or iPad, open Studio from its Home Screen icon (Share, then Add to Home Screen) and enable notifications there.");
  if (!pushSupported()) throw new Error("This browser does not support notifications. On iPhone or iPad, install Studio on your Home Screen first.");
  if (!prepared?.key || !prepared.registration) throw new Error("Notifications are still setting up. Wait a moment and try again.");
  // Ask directly in the button gesture; awaiting a fetch first breaks iOS permission prompts.
  const permission = Notification.permission === "granted" ? "granted" : await withTimeout(Notification.requestPermission(), 60000, "No answer to the notification prompt. Tap Enable notifications and choose Allow.");
  if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked. Allow them in your browser or device notification settings, then try again." : "Permission was not granted. Tap Enable notifications when you are ready.");
  const { registration, key } = prepared;
  let sub = await registration.pushManager.getSubscription();
  const created = !sub;
  if (!sub) {
    try {
      sub = await withTimeout(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) }), 20000, "Your device did not respond. Close and reopen Studio, check you are online, then try again.");
    } catch (error) {
      if (error?.name === "InvalidStateError") {
        // A stale subscription from an older key blocks a new one: clear it and retry once.
        await (await registration.pushManager.getSubscription())?.unsubscribe().catch(() => {});
        sub = await withTimeout(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) }), 20000, "Your device did not respond. Close and reopen Studio, then try again.");
      } else if (error?.name === "NotAllowedError") {
        throw new Error("Notifications are blocked for Studio. Allow them in your device or browser notification settings, then try again.");
      } else if (error?.name === "AbortError") {
        throw new Error("Your browser's push service could not be reached. Check your connection (in Brave, turn on Google services for push messaging) and try again.");
      } else throw error;
    }
  }
  try {
    await api("admin/push/subscribe", { method: "POST", body: sub.toJSON() });
  } catch (error) {
    if (created) await sub.unsubscribe().catch(() => {});
    throw error;
  }
  return sub;
}
export async function disablePush() {
  const sub = await currentSub();
  if (sub) {
    await api("admin/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
}
