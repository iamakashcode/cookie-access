import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface ConsentReportData {
  businessName: string;
  domain: string | null;
  eventId: string;
  timestamp: Date;
  identifier: string;
  identifierType: string;
  method: string;
  ipAddress: string | null;
  noticeVersion: number | null;
  noticeLanguage: string | null;
  accepted: string[];
  declined: string[];
}

// pdf-lib's standard fonts use WinAnsi encoding, which can't represent every
// Unicode character (emoji, ✓, etc.). Replace anything outside that range so a
// stray character in stored data can never crash report generation.
function safe(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

const INK = rgb(0.1, 0.1, 0.18);
const MUTED = rgb(0.42, 0.45, 0.55);
const RULE = rgb(0.82, 0.84, 0.9);
const ACCENT = rgb(0.263, 0.22, 0.792); // #4338ca

export async function buildConsentReport(
  data: ConsentReportData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Consent Record ${data.eventId}`);
  doc.setProducer("DPDP Consent Manager");

  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const left = 56;
  const right = width - 56;
  let y = 800;

  const text = (
    s: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; x?: number } = {},
  ) => {
    page.drawText(safe(s), {
      x: opts.x ?? left,
      y,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? INK,
    });
  };

  const rule = (yy: number) => {
    page.drawLine({
      start: { x: left, y: yy },
      end: { x: right, y: yy },
      thickness: 1,
      color: RULE,
    });
  };

  // Header
  text(data.businessName, { size: 16, font: bold, color: ACCENT });
  y -= 18;
  text("Consent Record", { size: 11, font: bold });
  y -= 13;
  if (data.domain) {
    text(data.domain, { size: 9, color: MUTED });
    y -= 12;
  }
  y -= 6;
  rule(y);
  y -= 22;

  // Key / value details
  const row = (label: string, value: string) => {
    text(label.toUpperCase(), { size: 8, font: bold, color: MUTED });
    y -= 12;
    text(value || "—", { size: 11 });
    y -= 20;
  };

  row("Record ID", data.eventId);
  row("Date & time", data.timestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" }) + " (IST)");
  row("Data principal", `${data.identifier}  (${data.identifierType})`);
  row("Collection method", data.method === "widget" ? "Website consent banner" : data.method);
  row("IP address (masked)", data.ipAddress ?? "not recorded");
  if (data.noticeVersion != null) {
    row(
      "Notice agreed to",
      `Version ${data.noticeVersion}${data.noticeLanguage ? ` (${data.noticeLanguage})` : ""}`,
    );
  }

  // Purposes
  y -= 4;
  rule(y);
  y -= 22;
  text("Consent decisions", { size: 11, font: bold });
  y -= 20;

  const listSection = (title: string, items: string[], on: boolean) => {
    text(title, { size: 9, font: bold, color: on ? rgb(0.02, 0.5, 0.34) : rgb(0.72, 0.45, 0.05) });
    y -= 15;
    if (items.length === 0) {
      text("None", { size: 10, color: MUTED, x: left + 12 });
      y -= 16;
    } else {
      for (const it of items) {
        text(`-  ${it}`, { size: 10, x: left + 12 });
        y -= 15;
        y = maybeNewPage(doc, page, y); // guard very long lists
      }
    }
    y -= 8;
  };

  listSection("ACCEPTED", data.accepted, true);
  listSection("DECLINED", data.declined, false);

  // Footer
  const footY = 70;
  page.drawLine({
    start: { x: left, y: footY + 20 },
    end: { x: right, y: footY + 20 },
    thickness: 1,
    color: RULE,
  });
  page.drawText(
    safe(
      `Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    ),
    { x: left, y: footY, size: 8, font, color: MUTED },
  );
  page.drawText(
    safe(
      "Compliance-assistance record under the DPDP Act, 2023. Not legal advice.",
    ),
    { x: left, y: footY - 12, size: 8, font, color: MUTED },
  );

  return doc.save();
}

// Very small safeguard: pdf-lib doesn't auto-paginate. If a huge purpose list
// runs off the page, we simply stop drawing lower than the footer margin.
function maybeNewPage(_doc: PDFDocument, _page: PDFPage, y: number): number {
  return Math.max(y, 96);
}
