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
    <section className="flex flex-col items-start gap-6 md:flex-row md:gap-8">
      <div className="md:sticky md:top-6">
        <Blueby talking={!done} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="bubble rounded-xl border-2 border-navy bg-white p-5">
          {/* Screen readers receive the full text at once. */}
          <p className="sr-only" role="status">
            Blueby says: {text}
          </p>
          <p aria-hidden="true" className="relative text-xl font-semibold leading-snug">
            <span className="invisible">{text}</span>
            <span className="absolute inset-0">{shown}</span>
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}
