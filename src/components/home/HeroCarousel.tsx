"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type HeroItem = {
  id: string;
  type: "image" | "video";
  url: string;
  alt: string | null;
};

const FALLBACK_VIDEO = "https://res.cloudinary.com/dnaom2evd/video/upload/v1778512357/drone_lgjdsd.mp4";
const AUTO_INTERVAL = 6000;

export default function HeroCarousel() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    fetch("/api/hero")
      .then((r) => r.json())
      .then((json) => {
        const data: HeroItem[] = json.data ?? [];
        setItems(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const count = items.length;
  const hasMultiple = count > 1;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hasMultiple) {
      timerRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % count);
      }, AUTO_INTERVAL);
    }
  }, [hasMultiple, count]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    resetTimer();
  };

  const prev = () => goTo((current - 1 + count) % count);
  const next = () => goTo((current + 1) % count);

  if (!loaded) {
    return (
      <div className="absolute inset-0">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={FALLBACK_VIDEO}
        />
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="absolute inset-0">
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={FALLBACK_VIDEO}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {item.type === "video" ? (
            <video
              autoPlay loop muted playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src={item.url}
            />
          ) : (
            <img
              src={item.url}
              alt={item.alt ?? ""}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      ))}

      {hasMultiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors"
            aria-label="Anterior"
          >
            <FiChevronLeft size={22} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-colors"
            aria-label="Siguiente"
          >
            <FiChevronRight size={22} />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === current ? "bg-white" : "bg-white/40 hover:bg-white/60"}`}
                aria-label={`Ir a slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
