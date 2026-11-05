import React, { useEffect, useRef, useState } from "react";

export default function Video({
  src,
  poster,
  className = "",
  label = "",
  lazy = true,
  controls = false,
}) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false,
  );
  const [playing, setPlaying] = useState(false);
  const pst =
    poster ||
    (src && /\.mp4$/i.test(src) ? src.replace(/\.mp4$/i, ".jpg") : undefined);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (media.matches) setPaused(true);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v || failed) return;
    if (paused) {
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
  }, [src, paused, failed]);
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
      autoPlay={!paused && !lazy}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      disablePictureInPicture
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onError={() => setFailed(true)}
    />
  );
  if (!controls) return media;
  return (
    <div className="media-player">
      {media}
      {!failed && (
        <button
          type="button"
          className="video-toggle"
          aria-label={`${playing ? "Pause" : "Play"} ${label || "video"}`}
          onClick={() => {
            if (playing) setPaused(true);
            else {
              setPaused(false);
              ref.current?.play().catch(() => {});
            }
          }}
        >
          {playing ? "Ⅱ Pause film" : "▷ Play film"}
        </button>
      )}
    </div>
  );
}
