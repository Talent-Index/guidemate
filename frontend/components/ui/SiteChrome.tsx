"use client";

import { Suspense, type ReactNode } from "react";
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
  const isExperienceFlow =
    /^\/(e|experiences)\//.test(pathname) || pathname.startsWith("/book/");
  const hideTabs = isHome || pathname.startsWith("/auth/") || isChatThread || isLiveRoom;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--gm-canvas)]">
      <Suspense fallback={null}>
        <NavBar />
      </Suspense>
      <main
        className={`min-w-0 flex-1 ${
          isHome
            ? "pt-0"
            : isChatThread || isLiveRoom
              ? "mx-auto flex w-full max-w-3xl flex-col px-4 pb-4 pt-20 sm:px-5 md:max-w-3xl md:pb-8 md:pt-24"
              : isExperienceFlow
                ? "mx-auto w-full max-w-6xl px-4 pb-8 pt-20 sm:px-5 sm:pt-24 max-md:pb-[calc(var(--gm-mobile-tab-height)+6.5rem+env(safe-area-inset-bottom))] md:pb-10 lg:pb-12"
                : "mx-auto w-full max-w-6xl px-4 pb-8 pt-20 sm:px-5 sm:pt-24 max-md:pb-[calc(var(--gm-mobile-tab-height)+1.25rem+env(safe-area-inset-bottom))] md:pb-10"
        }`}
      >
        {children}
      </main>
      {isHome && <SiteFooter />}
      {!hideTabs && <MobileTabBar />}
      <CookieToast />
    </div>
  );
}
