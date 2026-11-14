import type { Metadata } from "next";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { body } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmFuture AI",
  description: "Blueby helps you choose what to grow using NASA data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${body.className} flex min-h-screen flex-col bg-page text-lg text-navy antialiased`}
      >
        <header className="border-b border-navy/10 bg-white px-4 py-3">
          <Link href="/" className="text-2xl font-bold text-navy">
            FarmFuture AI
          </Link>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}
