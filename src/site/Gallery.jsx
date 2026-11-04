import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from './SiteContext.jsx';

export function Lightbox({ items, start, onClose }) {
  const [i, setI] = useState(start);
  const n = items.length;
  const go = useCallback((d) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    document.addEventListener('keydown', h); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [go, onClose]);
  const it = items[i];
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="Close">×</button>
      {n > 1 && <button className="arrow prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous">‹</button>}
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={it.image} alt={it.title} />
        <figcaption>{it.title}{it.slug && <> · <Link to={`/product/${it.slug}`} onClick={onClose}>View details</Link></>}</figcaption>
      </figure>
      {n > 1 && <button className="arrow next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next">›</button>}
    </div>
  );
}

export default function Gallery({ products }) {
  const { money } = useSite();
  const [lb, setLb] = useState(null);
  const items = products.filter((p) => p.images?.[0]).map((p) => ({ image: p.images[0], title: p.title, slug: p.slug, price: p.price_pence }));
  if (!items.length) return <p className="muted center">No artwork to show yet.</p>;
  return (
    <>
      <div className="gallery">
        {items.map((it, k) => (
          <button key={it.slug} className="g-item" onClick={() => setLb(k)} aria-label={`View ${it.title} larger`}>
            <img src={it.image} alt={it.title} loading="lazy" />
            <span><b>{it.title}</b><em>{money(it.price)}</em></span>
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox items={items} start={lb} onClose={() => setLb(null)} />}
    </>
  );
}
