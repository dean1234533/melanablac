import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Slider({ slides }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const n = slides.length;
  useEffect(() => { if (n < 2 || paused) return; const id = setInterval(() => setI((x) => (x + 1) % n), 5500); return () => clearInterval(id); }, [n, paused]);
  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  if (!n) return <div className="slider empty" />;
  const go = (d) => setI((x) => (x + d + n) % n);
  return (
    <section className="slider" aria-roledescription="carousel" aria-label="Featured art" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { if (touch.current == null) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      {slides.map((s, k) => (
        <div key={s.id} className={'slide' + (k === i ? ' active' : '')} aria-hidden={k !== i}>
          <img src={s.image} alt={s.title || 'Artwork'} loading={k === 0 ? 'eager' : 'lazy'} />
          <div className="slide-caption">
            {s.title && <h2>{s.title}</h2>}
            {s.subtitle && <p>{s.subtitle}</p>}
            {s.link && <Link className="btn" to={s.link} tabIndex={k === i ? 0 : -1}>View</Link>}
          </div>
        </div>
      ))}
      {n > 1 && <>
        <button className="arrow prev" onClick={() => go(-1)} aria-label="Previous slide">‹</button>
        <button className="arrow next" onClick={() => go(1)} aria-label="Next slide">›</button>
        <div className="dots">{slides.map((s, k) => <button key={s.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} />)}</div>
      </>}
    </section>
  );
}
