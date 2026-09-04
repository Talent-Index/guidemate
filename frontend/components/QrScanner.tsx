"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type QrScannerHandle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

type QrScannerProps = {
  onScan: (text: string) => void;
  elementId?: string;
  /** When false, camera stays off until `start()` is called (keeps iOS user-gesture chain). */
  autoStart?: boolean;
};

export const QrScanner = forwardRef<QrScannerHandle, QrScannerProps>(function QrScanner(
  { onScan, elementId, autoStart = true },
  ref
) {
  const fallbackId = useId().replace(/:/g, "");
  const regionId = elementId ?? `qr-${fallbackId}`;
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const inFlightRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);

  onScanRef.current = onScan;

  const stop = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setRunning(false);
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      // camera may already be stopped
    }
    try {
      scanner.clear();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(async () => {
    if (inFlightRef.current || scannerRef.current?.isScanning) return;
    inFlightRef.current = true;

    setStarting(true);
    setError(null);
    scannedRef.current = false;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (scannerRef.current?.isScanning) {
        await stop();
      }

      const scanner = new Html5Qrcode(regionId);
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      const onDecoded = (decodedText: string) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        onScanRef.current(decodedText);
      };

      try {
        await scanner.start({ facingMode: "environment" }, config, onDecoded, () => undefined);
      } catch {
        await scanner.start({ facingMode: "user" }, config, onDecoded, () => undefined);
      }

      setRunning(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open the camera. Allow camera access in your browser settings."
      );
      await stop();
    } finally {
      inFlightRef.current = false;
      setStarting(false);
    }
  }, [regionId, stop]);

  useImperativeHandle(ref, () => ({ start, stop }), [start, stop]);

  useEffect(() => {
    if (!autoStart) return;
    void start();
    return () => {
      void stop();
    };
  }, [autoStart, start, stop]);

  return (
    <div className="w-full">
      {starting && <p className="py-3 text-center text-sm text-brand-muted">Opening camera...</p>}
      {error && (
        <p className="py-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}
      {!running && !starting && !error && !autoStart && (
        <p className="py-3 text-center text-sm text-brand-muted">Tap &quot;Scan tourist QR&quot; to open the camera.</p>
      )}
      <div
        id={regionId}
        className="w-full overflow-hidden rounded-xl bg-black [&_video]:mx-auto [&_video]:block [&_video]:max-h-72 [&_video]:w-full [&_video]:rounded-xl"
      />
    </div>
  );
});
