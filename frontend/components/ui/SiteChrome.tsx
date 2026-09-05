"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CookieToast } from "@/components/ui/CookieToast";
import { MobileTabBar } from "@/components/ui/MobileTabBar";
import { NavBar } from "@/components/ui/NavBar";
import { SiteFooter } from "@/components/ui/SiteFooter";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isChatThread = pathname.startsWith("/chat/") && pathname !== "/chat";
const isLiveRoom = /^\/live\/[^/]+$/.test(pathname);
  const hideTabs = isHome || pathname.startsWith("/auth/") || isChatThread || isLiveRoom;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--gm-canvas)]">
      <NavBar />
      <main
        className={`flex-1 ${
          isHome
            ? "pt-0"
            : isChatThread || isLiveRoom
              ? "mx-auto flex w-full max-w-3xl flex-col px-4 pb-4 pt-20 md:max-w-3xl md:pb-8 md:pt-24"
              : "mx-auto w-full px-4 pb-8 pt-24 md:max-w-5xl max-md:pb-28"
        }`}
      >
        {children}
      </main>
      <div className={isHome ? "block" : "hidden md:block"}>
        <SiteFooter />
      </div>
      {!hideTabs && <MobileTabBar />}
      <CookieToast />
    </div>
  );
}
