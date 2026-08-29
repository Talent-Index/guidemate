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
    <>
      <NavBar />
      <main className={isHome ? "pt-0" : "mx-auto max-w-5xl px-4 pb-8 pt-24"}>{children}</main>
      <SiteFooter />
      <CookieToast />
    </>
  );
}
