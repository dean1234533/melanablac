import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SNOOZE_KEY = "mb_studio_install_snooze";
const WEEK = 7 * 24 * 60 * 60 * 1000;
export const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const platform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return "safari";
  return "desktop";
};
let deferred = null;
let installed = false;
const changed = () => window.dispatchEvent(new Event("mb-installable"));
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    changed();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    changed();
  });
}
function useInstallState() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    const display = window.matchMedia("(display-mode: standalone)");
    window.addEventListener("mb-installable", update);
    display.addEventListener("change", update);
    return () => {
      window.removeEventListener("mb-installable", update);
      display.removeEventListener("change", update);
    };
  }, []);
  return { canInstall: !!deferred, isInstalled: installed || standalone() };
}
export async function installApp() {
  if (!deferred) return "unavailable";
  const prompt = deferred;
  deferred = null;
  changed();
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") installed = true;
    return choice.outcome;
  } finally {
    changed();
  }
}
export function InstallSteps() {
  const { canInstall, isInstalled } = useInstallState();
  const [error, setError] = useState("");
  const p = platform();
  const install = async () => {
    setError("");
    try { await installApp(); }
    catch { setError("The install window could not open. Follow the browser steps below instead."); }
  };
  if (isInstalled) return <p className="muted">You’re using the Studio app. You can enable order and message alerts in Settings.</p>;
  return (
    <div className="steps">
      {canInstall && <button type="button" className="btn gold" onClick={install}>Install Studio</button>}
      {p === "ios" ? (
        <ol>
          <li>Open this admin page in <b>Safari</b>.</li>
          <li>Tap <b>Share</b>, then <b>Add to Home Screen</b>. Keep <b>Open as Web App</b> on if shown, then tap <b>Add</b>.</li>
          <li>Open <b>MB Studio</b> from your Home Screen and sign in.</li>
          <li>Go to <b>Settings</b> and tap <b>Enable notifications</b> to receive order and message alerts.</li>
        </ol>
      ) : p === "android" ? (
        <ol>
          <li>{canInstall ? <>Tap <b>Install Studio</b> above.</> : <>Open this page in <b>Chrome</b>. In its menu, choose <b>Install app</b> or <b>Add to Home screen</b>.</>}</li>
          <li>Open <b>MB Studio</b> from your home screen and sign in.</li>
          <li>In <b>Settings</b>, tap <b>Enable notifications</b>.</li>
        </ol>
      ) : p === "safari" ? (
        <ol>
          <li>In Safari’s <b>File</b> menu, choose <b>Add to Dock</b>.</li>
          <li>Open <b>MelanaBlac Studio</b> from your Dock and sign in.</li>
          <li>In <b>Settings</b>, tap <b>Enable notifications</b>.</li>
        </ol>
      ) : (
        <ol>
          <li>{canInstall ? <>Click <b>Install Studio</b> above.</> : <>In <b>Chrome or Edge</b>, use the install icon in the address bar or choose <b>Install app</b> from the browser menu.</>}</li>
          <li>Open <b>MelanaBlac Studio</b> from your Dock, taskbar or app launcher.</li>
          <li>In <b>Settings</b>, click <b>Enable notifications</b>.</li>
        </ol>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
export function InstallLauncher() {
  const { isInstalled } = useInstallState();
  if (isInstalled) return null;
  return <button type="button" className="link studio-install-link" onClick={() => window.dispatchEvent(new Event("mb-open-install"))}>Install Studio app</button>;
}
export default function InstallBanner() {
  const { isInstalled } = useInstallState();
  const [show, setShow] = useState(() => {
    try { return Date.now() >= Number(localStorage.getItem(SNOOZE_KEY) || 0); }
    catch { return true; }
  });
  useEffect(() => {
    const open = () => {
      try { localStorage.setItem(SNOOZE_KEY, "0"); } catch {}
      setShow(true);
    };
    window.addEventListener("mb-open-install", open);
    return () => window.removeEventListener("mb-open-install", open);
  }, []);
  const close = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + WEEK)); } catch {}
    setShow(false);
  };
  if (!show || isInstalled) return null;
  return (
    <section className="studio-install-banner" aria-labelledby="studio-install-title">
      <div className="install-banner-heading">
        <img src="/admin/icon-192.png" alt="" width="44" height="44" />
        <div><p className="admin-eyebrow">YOUR STUDIO, ONE TAP AWAY</p><h2 id="studio-install-title">Install MelanaBlac Studio</h2></div>
        <button type="button" className="install-dismiss" onClick={close} aria-label="Dismiss install guide for seven days">×</button>
      </div>
      <p>Add Studio to your phone or computer, then enable notifications for new orders and messages.</p>
      <InstallSteps />
      <div className="install-banner-actions">
        <button type="button" className="btn small" onClick={close}>Maybe later</button>
        <Link to="/admin/settings" onClick={close}>Notification settings</Link>
      </div>
    </section>
  );
}
