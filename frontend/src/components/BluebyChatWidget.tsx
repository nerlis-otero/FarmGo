"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "Why add a cover crop?",
  "How does rotation help save water?",
  "Tell me about Texas peanut prices",
  "How does soil pH affect my crops?",
];

export default function BluebyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I’m Blueby, your AI farming companion. Ask me anything about crop rotations, NASA weather data, soil moisture, or Texas commodity markets.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");
  const priorityParam = searchParams.get("priority");

  const lat = latParam ? Number(latParam) : null;
  const lon = lonParam ? Number(lonParam) : null;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          lat: lat && Number.isFinite(lat) ? lat : undefined,
          lon: lon && Number.isFinite(lon) ? lon : undefined,
          priority: priorityParam?.toLowerCase().replace(" ", "_"),
        }),
      });

      if (!res.ok) {
        throw new Error("Chat service unavailable");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn’t complete that answer. Please try again.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't reach the advisory service right now. Please confirm your connection or try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Ventana de chat desplegable */}
      {isOpen && (
        <section
          aria-label="Chat with Blueby"
          className="mb-3 flex h-[520px] w-[92vw] max-w-[390px] flex-col overflow-hidden rounded-2xl border-2 border-fern/30 bg-white shadow-2xl transition-all"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-navy/10 bg-foam px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-fern/40 bg-white p-0.5 shadow-xs">
                <Image
                  src="/iconblueby.png"
                  alt="Blueby mascot"
                  width={34}
                  height={34}
                  unoptimized
                  className="h-full w-full object-contain [image-rendering:pixelated]"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-navy">Blueby</h3>
                  <span className="flex h-2 w-2 rounded-full bg-fern" aria-hidden="true" />
                </div>
                <p className="text-xs font-medium text-navy/60">FarmGo Assistant · NASA & USDA</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-navy/60 hover:bg-white hover:text-navy"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Lista de mensajes */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-page/60 p-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-fern/30 bg-white p-0.5">
                    <Image
                      src="/iconblueby.png"
                      alt=""
                      width={24}
                      height={24}
                      unoptimized
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-xs bg-indigo text-white shadow-xs"
                      : "rounded-tl-xs border border-navy/10 bg-white text-navy shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-navy/60">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-fern/30 bg-white p-0.5">
                  <Image
                    src="/iconblueby.png"
                    alt=""
                    width={24}
                    height={24}
                    unoptimized
                    className="h-full w-full object-contain [image-rendering:pixelated]"
                  />
                </div>
                <div className="rounded-2xl rounded-tl-xs border border-navy/10 bg-white px-3.5 py-2.5 text-xs font-medium text-navy/70 shadow-xs">
                  <span className="inline-flex items-center gap-1">
                    Thinking
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse delay-100">.</span>
                    <span className="animate-pulse delay-200">.</span>
                  </span>
                </div>
              </div>
            )}

            {/* Preguntas rápidas si solo está el mensaje inicial */}
            {messages.length === 1 && !loading && (
              <div className="mt-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-navy/50">Suggested questions</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      className="rounded-xl border border-navy/15 bg-white/90 px-3 py-1.5 text-left text-xs font-medium text-navy transition hover:border-indigo hover:bg-mist"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de envío */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="border-t border-navy/10 bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Blueby a farm question…"
                disabled={loading}
                className="flex-1 rounded-xl border border-navy/20 bg-page/60 px-3 py-2 text-sm text-navy outline-none transition focus:border-indigo focus:bg-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-7-7l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Botón Flotante (FAB) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2.5 rounded-full border-2 border-white/90 bg-indigo py-2 pl-2.5 pr-4 text-white shadow-lg transition-transform hover:scale-105 hover:bg-navy focus:outline-none"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close chat with Blueby" : "Open chat with Blueby"}
      >
        <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/40 bg-white p-0.5 shadow-xs">
          <Image
            src="/iconblueby.png"
            alt="Blueby avatar"
            width={34}
            height={34}
            unoptimized
            className="h-full w-full object-contain [image-rendering:pixelated]"
          />
        </div>
        <span className="font-bold text-sm">Ask Blueby</span>
      </button>
    </div>
  );
}
