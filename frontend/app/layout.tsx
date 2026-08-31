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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("guidemate-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--gm-canvas)] font-sans text-[var(--gm-ink)] antialiased">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
