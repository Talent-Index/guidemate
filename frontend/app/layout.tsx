import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { SiteChrome } from "@/components/ui/SiteChrome";
import { PwaRegister } from "@/components/pwa/PwaRegister";

const SPLASHES = [
  { file: "640x1136", dw: 320, dh: 568, dpr: 2 },
  { file: "750x1334", dw: 375, dh: 667, dpr: 2 },
  { file: "828x1792", dw: 414, dh: 896, dpr: 2 },
  { file: "1125x2436", dw: 375, dh: 812, dpr: 3 },
  { file: "1170x2532", dw: 390, dh: 844, dpr: 3 },
  { file: "1179x2556", dw: 393, dh: 852, dpr: 3 },
  { file: "1284x2778", dw: 428, dh: 926, dpr: 3 },
  { file: "1290x2796", dw: 430, dh: 932, dpr: 3 },
  { file: "1320x2868", dw: 440, dh: 956, dpr: 3 },
  { file: "1242x2688", dw: 414, dh: 896, dpr: 3 },
  { file: "1488x2266", dw: 744, dh: 1133, dpr: 2 },
  { file: "1640x2360", dw: 820, dh: 1180, dpr: 2 },
  { file: "1668x2388", dw: 834, dh: 1194, dpr: 2 },
  { file: "2048x2732", dw: 1024, dh: 1366, dpr: 2 },
] as const;

function splashMedia(s: (typeof SPLASHES)[number], dark: boolean) {
  return `(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)${
    dark ? " and (prefers-color-scheme: dark)" : ""
  }`;
}

export const metadata: Metadata = {
  title: "Guidemate",
  description: "Find a local guide, book instantly, pay same-day - secured on Avalanche.",
  applicationName: "Guidemate",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guidemate",
    startupImage: [
      ...SPLASHES.map((s) => ({ url: `/splash/${s.file}.png`, media: splashMedia(s, false) })),
      ...SPLASHES.map((s) => ({ url: `/splash/dark-${s.file}.png`, media: splashMedia(s, true) })),
    ],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const bootScript = `try{if(localStorage.getItem("guidemate-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}
(function(){try{if(window.navigator.standalone===true||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)){document.documentElement.classList.add("gm-standalone")}}catch(e){}})();`;

const hideSplashScript = `(function(){if(!document.documentElement.classList.contains("gm-standalone"))return;var el=document.getElementById("gm-splash");if(!el)return;var t=Date.now();function hide(){setTimeout(function(){el.classList.add("gm-splash-hide");setTimeout(function(){el.remove()},360)},Math.max(0,700-(Date.now()-t)))}if(document.readyState==="complete")hide();else window.addEventListener("load",hide)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `#gm-splash{display:none}html.gm-standalone #gm-splash{display:flex;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center;background:#ffffff;transition:opacity .35s ease}html.gm-standalone.dark #gm-splash{background:#000000}html.gm-standalone #gm-splash img{width:min(62vw,280px);height:auto}html.gm-standalone #gm-splash .gm-logo-dark{display:none}html.gm-standalone.dark #gm-splash .gm-logo-light{display:none}html.gm-standalone.dark #gm-splash .gm-logo-dark{display:block}#gm-splash.gm-splash-hide{opacity:0;pointer-events:none}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--gm-canvas)] font-sans text-[var(--gm-ink)] antialiased">
        <div id="gm-splash" aria-hidden="true">
          <img className="gm-logo-light" src="/logo.png" alt="" width={268} height={105} />
          <img className="gm-logo-dark" src="/logo-dark.png" alt="" width={266} height={103} />
        </div>
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
        <PwaRegister />
        <script dangerouslySetInnerHTML={{ __html: hideSplashScript }} />
      </body>
    </html>
  );
}
