import React, { useEffect, useState } from 'react';

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const platform = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
};
let deferred = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event('mb-installable')); });

export function InstallSteps({ onInstall }) {
  const p = platform();
  return (
    <div className="steps">
      {deferred && <button className="btn gold" onClick={onInstall}>Install app now</button>}
      {p === 'ios' && <ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open <b>MB Admin</b> from your Home Screen. Notifications work from there.</li></ol>}
      {p === 'android' && <ol><li>Tap <b>Install app now</b> above, or open the Chrome menu (⋮).</li><li>Choose <b>Install app</b> / <b>Add to Home screen</b>.</li><li>Open <b>MB Admin</b> from your home screen.</li></ol>}
      {p === 'desktop' && <ol><li>In Chrome or Edge, click the <b>install icon</b> in the address bar, or the menu → <b>Install MelanaBlac Admin</b>.</li><li>The app opens in its own window and can be pinned to your dock or taskbar.</li></ol>}
    </div>
  );
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    let dismissed = false; try { dismissed = localStorage.getItem('mb_install_dismissed') === '1'; } catch {}
    if (!standalone() && !dismissed) setShow(true);
    const h = () => force((x) => x + 1);
    window.addEventListener('mb-installable', h);
    return () => window.removeEventListener('mb-installable', h);
  }, []);
  if (!show) return null;
  const close = () => { try { localStorage.setItem('mb_install_dismissed', '1'); } catch {} setShow(false); };
  const install = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; close(); };
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="inst-t">
      <div className="modal">
        <h2 id="inst-t">Get the MelanaBlac Admin app</h2>
        <p className="muted">Install this dashboard on your phone or computer for one-tap access and instant push notifications when orders and messages arrive.</p>
        <InstallSteps onInstall={install} />
        <button className="btn" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}
export { deferred as _d };
