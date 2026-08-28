import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/ui/NavBar";
import { Providers } from "@/lib/providers";

export const metadata: Metadata = {
  title: "Guidemate",
  description: "Find a local guide, book instantly, pay same-day - secured on Avalanche.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg font-sans text-brand-ink antialiased">
        <Providers>
          <NavBar />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
