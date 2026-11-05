import { videoPoster } from "../shared/mediaPolicy.js";
import React, { useEffect, useRef, useState } from "react";

export default function Video({
  src,
  poster,
  className = "",
  label = "",
  lazy = true,
}) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
  );
  const pst = poster || videoPoster(src);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v || failed) return;
    if (reducedMotion) {
      v.pause();
      return;
    }
    const play = () => v.play().catch(() => {});
    if (!("IntersectionObserver" in window)) {
      play();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) play();
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src, reducedMotion, failed]);
  if (!src) return null;
  const media = failed ? (
    pst ? (
      <img
        className={"vid " + className}
        src={pst}
        alt={label}
        loading="lazy"
      />
    ) : null
  ) : (
    <video
      ref={ref}
      className={"vid " + className}
      src={src}
      poster={pst}
      muted
      loop
      playsInline
      preload={lazy ? "none" : "metadata"}
      autoPlay={!reducedMotion && !lazy}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      disablePictureInPicture
      onError={() => setFailed(true)}
    />
  );
  return <div className="media-player">{media}</div>;
}
