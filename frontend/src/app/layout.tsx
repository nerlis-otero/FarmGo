import type { Metadata } from "next";
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import FieldBackground from "@/components/FieldBackground";
import { body } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmGo | Crop planning",
  description: "Compare crop rotation plans for Texas farms.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${body.className} relative flex min-h-screen flex-col bg-page text-base text-navy antialiased`}
      >
        <FieldBackground />
        <header className="relative z-10 border-b border-navy/10 bg-white/80 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 text-xl font-bold text-navy">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fern text-lg text-white">
                F
              </span>
              <span>FarmGo</span>
            </Link>
            <p className="hidden text-sm font-medium text-navy/60 sm:block">
              Crop plans for Texas farms
            </p>
          </div>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-4 sm:py-6">
          {children}
        </main>
        <div className="relative z-10">
          <Disclaimer />
        </div>
      </body>
    </html>
  );
}
