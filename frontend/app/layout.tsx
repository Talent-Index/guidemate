import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { SiteChrome } from "@/components/ui/SiteChrome";

export const metadata: Metadata = {
  title: "Guidemate",
  description: "Find a local guide, book instantly, pay same-day - secured on Avalanche.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-bg font-sans text-brand-ink antialiased">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
