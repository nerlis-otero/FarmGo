"use client";

import { useEffect, useState, type ReactNode } from "react";
import Blueby from "./Blueby";

// Types short coaching lines; long text appears at once so results stay scannable.
function useTypewriter(text: string, interval = 22) {
  const instant = text.length > 90;
  const [state, setState] = useState({ forText: "", count: 0 });
  const count = state.forText === text ? state.count : 0;
  const done = instant || count >= text.length;

  useEffect(() => {
    if (instant) {
      setState({ forText: text, count: text.length });
      return;
    }
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
  }, [text, done, interval, instant]);

  return { shown: text.slice(0, instant ? text.length : count), done };
}

type Props = { text: string; children?: ReactNode; compact?: boolean };

export default function BluebyStage({ text, children, compact = false }: Props) {
  const { shown, done } = useTypewriter(text);

  return (
    <section className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="shrink-0 pt-1">
          <Blueby talking={!done} />
        </div>
        <div className="bubble min-w-0 flex-1 rounded-xl border-2 border-navy/80 bg-white/95 p-3 shadow-sm sm:p-4">
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
