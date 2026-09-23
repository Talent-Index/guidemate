import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import { loadAuditReportData, type AuditReportData } from "./analytics.js";
import { formatReportPeriodLabel } from "./reportDates.js";

const BRAND = "#003B95";
const MUTED = "#5B6B82";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function pageBottom(doc: PDFKit.PDFDocument): number {
  return doc.page.height - doc.page.margins.bottom;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > pageBottom(doc)) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string, y: number): number {
  y = ensureSpace(doc, y, 28);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text(title, doc.page.margins.left, y);
  y += 20;
  doc.fillColor("#000000");
  return y;
}

function bulletLines(doc: PDFKit.PDFDocument, pairs: [string, string][], y: number): number {
  doc.font("Helvetica").fontSize(10);
  for (const [label, value] of pairs) {
    y = ensureSpace(doc, y, 16);
    doc.font("Helvetica-Bold").text(`${label}: `, doc.page.margins.left, y, { continued: true });
    doc.font("Helvetica").text(value);
    y = doc.y + 4;
  }
  return y + 6;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  y: number
): number {
  const left = doc.page.margins.left;
  const rowPad = 4;
  const headerH = 18;
  const lineH = 12;

  const drawHeader = (startY: number) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
    doc.rect(left, startY, colWidths.reduce((a, b) => a + b, 0), headerH).fill(BRAND);
    let x = left;
    headers.forEach((h, i) => {
      doc.fillColor("#FFFFFF").text(h, x + 3, startY + rowPad, {
        width: colWidths[i] - 6,
        lineBreak: false,
      });
      x += colWidths[i];
    });
    doc.fillColor("#000000");
    return startY + headerH;
  };

  y = ensureSpace(doc, y, headerH + lineH);
  y = drawHeader(y);

  doc.font("Helvetica").fontSize(8);
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r];
    const cellHeights: number[] = cells.map((cell, i) =>
      doc.heightOfString(cell, { width: colWidths[i] - 6 })
    );
    const rowH = Math.max(headerH - 4, ...cellHeights) + rowPad * 2;

    y = ensureSpace(doc, y, rowH + 2);
    if (y === doc.page.margins.top && r > 0) {
      y = drawHeader(y);
    }

    if (r % 2 === 0) {
      doc.rect(left, y, colWidths.reduce((a, b) => a + b, 0), rowH).fill("#F4F6F9");
      doc.fillColor("#000000");
    }

    let x = left;
    cells.forEach((cell, i) => {
      doc.fillColor("#000000").text(cell, x + 3, y + rowPad, {
        width: colWidths[i] - 6,
      });
      x += colWidths[i];
    });
    y += rowH;
  }

  return y + 10;
}

function buildPdfDocument(data: AuditReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { overview } = data;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    let y = doc.page.margins.top;

    doc.font("Helvetica-Bold").fontSize(22).fillColor(BRAND).text("Guidemate", { align: "center" });
    doc.fontSize(16).fillColor("#000000").text("Platform Audit Report", { align: "center" });
    y = doc.y + 8;
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text(`Generated ${fmtDate(data.generatedAt)}`, { align: "center" });
    doc.text(`Period: ${formatReportPeriodLabel(data.from, data.to)} (EAT)`, { align: "center" });
    y = doc.y + 16;
    doc.fillColor("#000000");

    y = sectionHeading(doc, "User base", y);
    y = bulletLines(
      doc,
      [
        ["Guides", String(overview.guides)],
        ["Tourists", String(overview.tourists)],
        ["Admins", String(overview.admins)],
      ],
      y
    );

    y = sectionHeading(doc, "Booking custody", y);
    y = bulletLines(
      doc,
      [
        ["Locked (in escrow)", String(overview.bookingsLocked)],
        ["Paid / released", String(overview.bookingsPaid)],
        ["Refunded", String(overview.bookingsRefunded)],
        ["Total bookings", String(overview.bookingsTotal)],
      ],
      y
    );

    y = sectionHeading(doc, "Financials (USDC)", y);
    y = bulletLines(
      doc,
      [
        ["Gross volume (GMV)", overview.gmvUsdc.toFixed(2)],
        ["Platform revenue", overview.platformRevenueUsdc.toFixed(2)],
        ["Guide earnings", overview.guideEarningsUsdc.toFixed(2)],
        ["Stream tips", overview.streamTipsUsdc.toFixed(2)],
      ],
      y
    );

    y = sectionHeading(doc, "Guide intake pipeline", y);
    y = bulletLines(
      doc,
      [
        ["Pending review", String(overview.pendingApplications)],
        ["Approved", String(overview.applicationsApproved)],
        ["Rejected", String(overview.applicationsRejected)],
        ["Total applications", String(overview.applicationsTotal)],
        ["Waitlist signups", String(overview.waitlistCount)],
      ],
      y
    );

    y = sectionHeading(doc, "Live streams", y);
    y = bulletLines(
      doc,
      [
        ["Total streams", String(overview.streamsTotal)],
        ["Currently live", String(overview.streamsLive)],
      ],
      y
    );

    y = sectionHeading(doc, "Guide applications (detail)", y);
    y = drawTable(
      doc,
      ["Name", "Email", "Location", "Status", "Submitted"],
      data.applications.map((app) => [
        truncate(String(app.full_name ?? ""), 28),
        truncate(String(app.email ?? ""), 32),
        truncate(String(app.location ?? ""), 22),
        String(app.status ?? ""),
        fmtDate(app.created_at),
      ]),
      [contentWidth * 0.2, contentWidth * 0.28, contentWidth * 0.18, contentWidth * 0.14, contentWidth * 0.2],
      y
    );

    y = sectionHeading(doc, "Waitlist (detail)", y);
    y = drawTable(
      doc,
      ["Name", "Email", "Interest", "Joined"],
      data.waitlist.map((row) => [
        truncate(String(row.full_name ?? ""), 28),
        truncate(String(row.email ?? ""), 36),
        truncate(String(row.interest ?? ""), 24),
        fmtDate(row.created_at),
      ]),
      [contentWidth * 0.22, contentWidth * 0.32, contentWidth * 0.26, contentWidth * 0.2],
      y
    );

    y = sectionHeading(doc, "Transactions", y);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    y = ensureSpace(doc, y, 14);
    doc.text(`${data.transactions.length} ledger entries (newest first in export order)`, doc.page.margins.left, y);
    y = doc.y + 8;
    doc.fillColor("#000000");

    y = drawTable(
      doc,
      ["Type", "Amount", "Status", "Reference", "Date"],
      data.transactions.map((tx) => [
        tx.type.replace(/_/g, " "),
        `${tx.amountUsdc} USDC${tx.amountKes != null ? ` / ${tx.amountKes} KES` : ""}`,
        tx.status,
        truncate(String(tx.referenceId ?? tx.id.slice(0, 8)), 18),
        fmtDate(tx.createdAt),
      ]),
      [
        contentWidth * 0.22,
        contentWidth * 0.24,
        contentWidth * 0.14,
        contentWidth * 0.18,
        contentWidth * 0.22,
      ],
      y
    );

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(
        `Guidemate audit report · Page ${i + 1} of ${pages.count}`,
        doc.page.margins.left,
        pageBottom(doc) - 10,
        { align: "center", width: contentWidth }
      );
    }

    doc.end();
  });
}

export async function buildReportPdf(from?: string, to?: string): Promise<Buffer> {
  const data = await loadAuditReportData(from, to);
  return buildPdfDocument(data);
}
