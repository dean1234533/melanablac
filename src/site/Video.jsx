import React, { useEffect, useRef, useState } from 'react';

// Muted, looping, autoplaying clip that only plays while on screen and respects "reduce motion".
export default function Video({ src, poster, className = '', label = '', lazy = true }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const pst = poster || (src && /\.mp4$/i.test(src) ? src.replace(/\.mp4$/i, '.jpg') : undefined);
  useEffect(() => {
    const v = ref.current;
    if (!v || reduce || failed) return;
    const play = () => v.play().catch(() => {});
    if (!('IntersectionObserver' in window)) { play(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) play(); else v.pause(); }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [src, reduce, failed]);
  if (!src) return null;
  if (failed) return pst ? <img className={'vid ' + className} src={pst} alt={label} loading="lazy" /> : null;
  return (
    <video ref={ref} className={'vid ' + className} src={src} poster={pst} muted loop playsInline preload={lazy ? 'none' : 'metadata'}
      autoPlay={!reduce && !lazy} aria-label={label || undefined} aria-hidden={label ? undefined : true} disablePictureInPicture onError={() => setFailed(true)} />
  );
}
