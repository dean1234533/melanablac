import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api.js';
import { DEFAULTS } from '../shared/contentSchema.js';
import { deliveryFeePence, deliveryText } from '../shared/delivery.js';

const Ctx = createContext(null);
export const useSite = () => useContext(Ctx);

export function SiteProvider({ children }) {
  const [site, setSite] = useState({ content: DEFAULTS, slides: [], categories: [], featured: [], loaded: false, error: '' });
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('mb_cart') || '[]'); } catch { return []; } });
  useEffect(() => { api('site').then((d) => setSite({ ...d, loaded: true, error: '' })).catch((e) => setSite((s) => ({ ...s, loaded: true, error: e.message }))); }, []);
  useEffect(() => { try { localStorage.setItem('mb_cart', JSON.stringify(cart)); } catch {} }, [cart]);
  const add = useCallback((p, qty = 1) => setCart((c) => {
    const ex = c.find((i) => i.id === p.id);
    const max = Math.max(1, p.stock || 1);
    if (ex) return c.map((i) => (i.id === p.id ? { ...i, qty: Math.min(max, i.qty + qty) } : i));
    return [...c, { id: p.id, slug: p.slug, title: p.title, price_pence: p.price_pence, image: p.images?.[0] || '', stock: p.stock, qty: Math.min(max, qty) }];
  }), []);
  const setQty = (id, qty) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(i.stock || 10, qty)) } : i)));
  const remove = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const clear = () => setCart([]);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price_pence, 0);
  const t = (k) => site.content[k] ?? DEFAULTS[k] ?? '';
  const delivery = deliveryFeePence({ ...DEFAULTS, ...site.content }, total);
  const grandTotal = total + delivery;
  const deliveryNote = deliveryText({ ...DEFAULTS, ...site.content });
  const money = (p) => `${t('site.currency')}${(p / 100).toFixed(2)}`;
  return <Ctx.Provider value={{ ...site, t, money, cart, add, setQty, remove, clear, count, total, delivery, grandTotal, deliveryNote }}>{children}</Ctx.Provider>;
}

// Client-side SEO (the server also injects tags for crawlers).
export function useSEO(title, description) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
      m.content = description;
    }
  }, [title, description]);
}
