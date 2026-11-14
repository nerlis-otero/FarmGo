"use client";

import { useEffect, useState, type ReactNode } from "react";
import Blueby from "./Blueby";

// Types text one character at a time while Blueby moves her mouth.
function useTypewriter(text: string, interval = 24) {
  const [state, setState] = useState({ forText: "", count: 0 });
  const count = state.forText === text ? state.count : 0;
  const done = count >= text.length;

  useEffect(() => {
    if (done) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => {
      setState((s) => {
        const base = s.forText === text ? s.count : 0;
        const next = Math.min(base + (reduce ? text.length : 1), text.length);
        return { forText: text, count: next };
      });
    }, interval);
    return () => clearInterval(id);
  }, [text, done, interval]);

  return { shown: text.slice(0, count), done };
}

type Props = { text: string; children?: ReactNode };

export default function BluebyStage({ text, children }: Props) {
  const { shown, done } = useTypewriter(text);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 pt-1">
          <Blueby talking={!done} />
        </div>
        <div className="bubble min-w-0 flex-1 rounded-xl border-2 border-navy/80 bg-white/95 p-3 shadow-sm sm:p-4">
          {/* Screen readers receive the full text at once. */}
          <p className="sr-only" role="status">
            Blueby says: {text}
          </p>
          <p aria-hidden="true" className="relative text-base font-semibold leading-snug sm:text-lg">
            <span className="invisible">{text}</span>
            <span className="absolute inset-0">{shown}</span>
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
