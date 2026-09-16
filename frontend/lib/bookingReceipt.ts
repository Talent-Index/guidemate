import { SNOWTRACE_TX_BASE } from "@/lib/api";

export interface BookingPaymentReceipt {
  method: "mpesa" | "checkout" | "demo" | string;
  amountUsdc: number;
  amountKes: number | null;
  mpesaReceipt: string | null;
  paidAt: string | null;
  paymentIntentId?: string | null;
}

export interface BookingReceiptData {
  bookingId: string;
  createdAt: string;
  experienceTitle: string;
  guideName: string;
  location: string | null;
  durationMinutes: number;
  guestCount: number;
  slotDate?: string;
  slotTime?: string;
  payment: BookingPaymentReceipt | null;
  lockTxHash: string | null;
}

const RECEIPT_INK = "#00265E";
const RECEIPT_PAPER = "#F4EFE4";

function receiptShortId(bookingId: string) {
  return bookingId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatPaidAt(iso: string | null | undefined) {
  const d = iso ? new Date(iso) : new Date();
  return {
    date: d.toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
  };
}

function paymentMethodLabel(method: string | undefined) {
  if (method === "mpesa") return "M-Pesa (Minisend)";
  if (method === "checkout") return "USDC / USDT (Minisend)";
  if (method === "demo") return "Demo";
  return method ?? "Payment";
}

function formatKes(amount: number) {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export function buildReceiptHtml(data: BookingReceiptData): string {
  const ref = receiptShortId(data.bookingId);
  const { date, time } = formatPaidAt(data.payment?.paidAt ?? data.createdAt);
  const method = data.payment?.method ?? "demo";
  const mpesaPaid =
    method === "mpesa" && data.payment?.amountKes != null && data.payment.amountKes > 0
      ? Math.round(data.payment.amountKes)
      : null;
  const totalLine =
    mpesaPaid != null
      ? `TOTAL PAID: ${formatKes(mpesaPaid)}`
      : `TOTAL: ${data.payment?.amountUsdc ?? 0} USDC`;
  const mpesaRef = data.payment?.mpesaReceipt;
  const bars = barcodeBars(ref + (mpesaRef ?? ""));

  const lineRows = `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:8%"><span style="opacity:0.55">01</span></td>
      <td style="padding:8px 4px;vertical-align:top">
        <strong>${escapeHtml(data.experienceTitle)}</strong><br/>
        <span style="font-size:11px;opacity:0.85">Host: ${escapeHtml(data.guideName)}${
          data.location ? ` · ${escapeHtml(data.location)}` : ""
        }</span>
      </td>
      <td style="padding:8px 4px;text-align:center;vertical-align:top;width:18%">Qty: ${data.guestCount}</td>
      <td style="padding:8px 0;text-align:right;vertical-align:top;width:22%">
        <strong>${data.payment?.amountUsdc.toFixed(2)} USDC</strong>
        ${mpesaPaid != null ? `<br/><span style="font-size:11px">${formatKes(mpesaPaid)}</span>` : ""}
      </td>
    </tr>`;

  const barcodeHtml = bars
    .map((w) => `<span style="display:inline-block;width:${w}px;height:36px;background:${RECEIPT_INK};margin:0 1px"></span>`)
    .join("");

  const escrowLine = data.lockTxHash
    ? `<p style="font-size:10px;margin:8px 0 0;word-break:break-all">Escrow: ${escapeHtml(data.lockTxHash)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Guidemate receipt ${ref}</title>
  <style>
    body { margin: 0; padding: 24px; background: #e8eef5; font-family: Georgia, "Times New Roman", serif; color: ${RECEIPT_INK}; }
    .paper { max-width: 380px; margin: 0 auto; background: ${RECEIPT_PAPER}; padding: 28px 24px 32px; box-shadow: 0 8px 32px rgba(0,38,94,0.12); }
    .logo { text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 20px; }
    .dot { border: none; border-top: 2px dotted ${RECEIPT_INK}; margin: 14px 0; opacity: 0.85; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .meta { font-family: ui-monospace, "Cascadia Mono", monospace; font-size: 11px; display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .total { text-align: center; font-weight: 800; font-size: 14px; margin: 12px 0; letter-spacing: 0.02em; }
    .footer { text-align: center; font-size: 11px; line-height: 1.5; margin-top: 16px; }
    @media print { body { background: white; padding: 0; } .paper { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="paper">
    <div class="logo">GUIDEMATE</div>
    <hr class="dot"/>
    <table>
      <thead>
        <tr style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em">
          <th colspan="2" style="text-align:left;font-weight:600">Experience</th>
          <th style="text-align:center;font-weight:600">Qty</th>
          <th style="text-align:right;font-weight:600">Price</th>
        </tr>
      </thead>
    </table>
    <hr class="dot"/>
    <table>${lineRows}</table>
    <hr class="dot"/>
    <p style="font-size:11px;margin:0">Payment: ${escapeHtml(paymentMethodLabel(method))}</p>
    ${
      data.slotDate
        ? `<p style="font-size:11px;margin:4px 0 0">When: ${escapeHtml(data.slotDate)}${data.slotTime ? ` · ${escapeHtml(data.slotTime)}` : ""}</p>`
        : ""
    }
    ${
      mpesaRef
        ? `<p style="font-size:11px;margin:4px 0 0">M-Pesa ref: ${escapeHtml(mpesaRef)}</p>`
        : ""
    }
    <hr class="dot"/>
    <p class="total">${escapeHtml(totalLine)}</p>
    <p style="text-align:center;font-size:11px;margin:0">Experience price ${(data.payment?.amountUsdc ?? 0).toFixed(2)} USDC · held in escrow until trip ends</p>
    <hr class="dot"/>
    <div class="meta">
      <span>${date}</span>
      <span>${time}</span>
      <span>${ref}</span>
    </div>
    <div style="text-align:center;margin:16px 0 8px">${barcodeHtml}</div>
    <p style="text-align:center;font-family:ui-monospace,monospace;font-size:9px;letter-spacing:0.15em;margin:0">GUIDEMATE · ${ref}</p>
    <div class="footer">
      <strong>Guidemate</strong><br/>
      Book local experiences · guidemate.app
    </div>
    ${escrowLine}
    ${
      data.lockTxHash
        ? `<p style="font-size:10px;text-align:center;margin-top:8px"><a href="${SNOWTRACE_TX_BASE}/${data.lockTxHash}">View escrow transaction</a></p>`
        : ""
    }
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadBookingReceipt(data: BookingReceiptData) {
  const html = buildReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `guidemate-receipt-${receiptShortId(data.bookingId)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printBookingReceipt(data: BookingReceiptData) {
  const html = buildReceiptHtml(data);
  const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=720");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
}
