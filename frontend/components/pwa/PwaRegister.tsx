"use client";

import { useEffect } from "react";

/** Unregisters any old Guidemate SW. A previous worker intercepted API calls
 *  and broke M-Pesa checkout (CORS / Failed to fetch). */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });
  }, []);

  return null;
}
