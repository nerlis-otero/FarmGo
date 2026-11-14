"use client";

import { useEffect, useState } from "react";

// Frames in public/mascot/blueby-<name>.png (39 x 65 px).
// To use your own sprites, replace those PNGs while keeping the names and dimensions.
type Frame = "idle" | "talk1" | "talk2" | "talk3" | "blink";
const FRAMES: Frame[] = ["idle", "talk1", "talk2", "talk3", "blink"];
const TALK_SEQUENCE: Frame[] = ["talk1", "talk2", "talk3", "talk2"];

export default function Blueby({ talking = false }: { talking?: boolean }) {
  const [frame, setFrame] = useState<Frame>("idle");

  useEffect(() => {
    // Keep Blueby still for users who prefer reduced motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (talking) {
      let i = 0;
      const id = setInterval(() => {
        setFrame(TALK_SEQUENCE[i % TALK_SEQUENCE.length]);
        i += 1;
      }, 130);
      return () => {
        clearInterval(id);
        setFrame("idle");
      };
    }

    // Blink occasionally while idle.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setFrame("blink");
        timer = setTimeout(() => {
          setFrame("idle");
          schedule();
        }, 150);
      }, 3200);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [talking]);

  // 78 px = 2x the original size; 156 px = 4x, keeping the pixels sharp.
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[39/65] w-[88px] shrink-0 sm:w-[112px]"
    >
      {FRAMES.map((f) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={f}
          src={`/mascot/blueby-${f}.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
          style={{ opacity: f === frame ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
