import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consent Manager — DPDP compliance assistant",
  description:
    "Operationalize consent management and record-keeping under India's DPDP Act.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col">{children}</div>
        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs leading-relaxed text-slate-500">
          <p className="mx-auto max-w-5xl">
            This tool helps you operationalize consent management and
            record-keeping under India&rsquo;s Digital Personal Data Protection
            Act. It <strong>does not constitute legal advice</strong> and is not a
            substitute for a lawyer. Consult qualified legal counsel about your
            specific compliance obligations.
          </p>
        </footer>
      </body>
    </html>
  );
}
