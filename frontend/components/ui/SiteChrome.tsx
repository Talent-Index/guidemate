"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CookieToast } from "@/components/ui/CookieToast";
import { NavBar } from "@/components/ui/NavBar";
import { SiteFooter } from "@/components/ui/SiteFooter";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className={`flex-1 ${isHome ? "pt-0" : "mx-auto w-full max-w-5xl px-4 pb-8 pt-24"}`}>{children}</main>
      <SiteFooter />
      <CookieToast />
    </div>
  );
}
