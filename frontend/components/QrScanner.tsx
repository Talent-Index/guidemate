"use client";

import { useEffect, useRef } from "react";

const ELEMENT_ID = "guidemate-qr-scanner";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const scannerRef = useRef<import("html5-qrcode").Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let mounted = true;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!mounted) return;

      const scanner = new Html5QrcodeScanner(
        ELEMENT_ID,
        { fps: 10, qrbox: 220 },
        /* verbose= */ false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => onScan(decodedText),
        () => {
          // ignore per-frame scan failures - expected while the camera searches
        }
      );
    });

    return () => {
      mounted = false;
      scannerRef.current?.clear().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={ELEMENT_ID} className="w-full max-w-sm" />;
}
