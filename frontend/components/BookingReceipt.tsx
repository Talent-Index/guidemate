"use client";

import { Button } from "@/components/ui/Button";
import {
  type BookingReceiptData,
  downloadBookingReceipt,
  printBookingReceipt,
} from "@/lib/bookingReceipt";
import { SNOWTRACE_TX_BASE } from "@/lib/api";

const INK = "#00265E";
const PAPER = "#F4EFE4";

function receiptShortId(bookingId: string) {
  return bookingId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function barcodeBars(seed: string): number[] {
  const bars: number[] = [];
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    bars.push(1 + (c % 3));
    bars.push(2 + ((c * 7) % 4));
  }
  return bars.slice(0, 48);
}

function DotRow() {
  return <hr className="my-3 border-0 border-t-2 border-dotted opacity-80" style={{ borderColor: INK }} />;
}

export function BookingReceipt({ data }: { data: BookingReceiptData }) {
  const ref = receiptShortId(data.bookingId);
  const paidAt = data.payment?.paidAt ?? data.createdAt;
  const d = new Date(paidAt);
  const dateStr = d.toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  const method = data.payment?.method ?? "demo";
  const mpesaPaid =
    method === "mpesa" && data.payment?.amountKes != null && data.payment.amountKes > 0
      ? Math.round(data.payment.amountKes)
      : null;
  const mpesaRef = data.payment?.mpesaReceipt;
  const bars = barcodeBars(ref + (mpesaRef ?? ""));

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div
        className="rounded-sm px-6 py-7 shadow-card"
        style={{ backgroundColor: PAPER, color: INK }}
      >
        <p
          className="text-center text-[26px] font-extrabold tracking-[0.12em]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          GUIDEMATE
        </p>

        <DotRow />

        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[10px] font-semibold uppercase tracking-wider">
          <span>Experience</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Price</span>
        </div>

        <DotRow />

        <div className="grid grid-cols-[1.4rem_1fr_auto_auto] gap-x-2 text-xs leading-snug">
          <span className="opacity-50">01</span>
          <div>
            <p className="font-bold">{data.experienceTitle}</p>
            <p className="mt-0.5 text-[11px] opacity-85">
              Host: {data.guideName}
              {data.location ? ` · ${data.location}` : ""}
            </p>
          </div>
          <span className="text-center tabular-nums">{data.guestCount}</span>
          <div className="text-right">
            <p className="font-bold tabular-nums">{data.payment?.amountUsdc.toFixed(2) ?? "0.00"} USDC</p>
            {mpesaPaid != null && (
              <p className="text-[11px] tabular-nums">KES {mpesaPaid.toLocaleString("en-KE")}</p>
            )}
          </div>
        </div>

        <DotRow />

        <p className="text-[11px]">
          Payment:{" "}
          {method === "mpesa"
            ? "M-Pesa (Minisend)"
            : method === "checkout"
              ? "USDC / USDT (Minisend)"
              : method}
        </p>
        {data.slotDate && (
          <p className="mt-1 text-[11px]">
            When: {data.slotDate}
            {data.slotTime ? ` · ${data.slotTime}` : ""}
          </p>
        )}
        {mpesaRef && <p className="mt-1 text-[11px]">M-Pesa ref: {mpesaRef}</p>}

        <DotRow />

        <p className="text-center text-sm font-extrabold tracking-wide">
          {mpesaPaid != null
            ? `TOTAL PAID: KES ${mpesaPaid.toLocaleString("en-KE")}`
            : `TOTAL: ${data.payment?.amountUsdc.toFixed(2) ?? "0"} USDC`}
        </p>
        <p className="mt-2 text-center text-[11px] opacity-90">
          {data.payment?.amountUsdc.toFixed(2)} USDC experience · escrow until your trip ends
        </p>

        <DotRow />

        <div className="flex flex-wrap justify-between gap-2 font-mono text-[11px]">
          <span>{dateStr}</span>
          <span>{timeStr}</span>
          <span>{ref}</span>
        </div>

        <div className="mt-4 flex h-9 items-end justify-center gap-px" aria-hidden>
          {bars.map((w, i) => (
            <span
              key={i}
              className="inline-block"
              style={{ width: w, height: 36, backgroundColor: INK }}
            />
          ))}
        </div>
        <p className="mt-2 text-center font-mono text-[9px] tracking-[0.2em]">GUIDEMATE · {ref}</p>

        <div className="mt-4 text-center text-[11px] leading-relaxed">
          <p className="font-bold">Guidemate</p>
          <p>Book local experiences</p>
        </div>

        {data.lockTxHash && (
          <a
            href={`${SNOWTRACE_TX_BASE}/${data.lockTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-[10px] underline opacity-80"
          >
            Escrow lock on chain
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" className="w-full" onClick={() => downloadBookingReceipt(data)}>
          Download receipt
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={() => printBookingReceipt(data)}>
          Print / save PDF
        </Button>
      </div>
    </div>
  );
}
