import { prisma } from "../prisma";
import { env } from "../env";

/**
 * Build a complete, itemized privacy notice from the domain's structured data,
 * so the notice satisfies §5 by construction: it names the Data Fiduciary,
 * itemizes each purpose and what it's for, explains how to exercise rights and
 * withdraw consent, publishes the grievance officer, and explains how to
 * complain to the Data Protection Board.
 */
export async function generateNotice(
  siteId: string,
  language: "en" | "hi",
): Promise<string> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: {
      name: true,
      apiKey: true,
      legalName: true,
      businessAddress: true,
      grievanceName: true,
      grievanceEmail: true,
      grievancePhone: true,
    },
  });
  if (!site) return "";

  const [purposes, processors] = await Promise.all([
    prisma.consentPurpose.findMany({
      where: { siteId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { name: true, description: true, isEssential: true, retentionDays: true },
    }),
    prisma.processor.findMany({
      where: { siteId },
      orderBy: { createdAt: "asc" },
      select: { name: true, purpose: true, dataShared: true },
    }),
  ]);

  const fiduciary = site.legalName || site.name;
  const rightsUrl = `${env.APP_URL.replace(/\/+$/, "")}/rights?k=${site.apiKey}`;
  const today = new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return language === "hi"
    ? hindi({ ...site, fiduciary, rightsUrl, today }, purposes, processors)
    : english({ ...site, fiduciary, rightsUrl, today }, purposes, processors);
}

type Proc = { name: string; purpose: string; dataShared: string | null };

interface Ctx {
  name: string;
  fiduciary: string;
  businessAddress: string | null;
  grievanceName: string | null;
  grievanceEmail: string | null;
  grievancePhone: string | null;
  rightsUrl: string;
  today: string;
}
type P = { name: string; description: string; isEssential: boolean; retentionDays: number | null };

function english(c: Ctx, purposes: P[], processors: Proc[]): string {
  const lines: string[] = [];
  lines.push(`Privacy Notice — ${c.fiduciary}`);
  lines.push("");
  lines.push(
    `This notice explains how ${c.name} collects and uses your personal data, and your rights, under India's Digital Personal Data Protection Act, 2023.`,
  );
  lines.push("");
  lines.push("1. Who we are");
  lines.push(
    `${c.fiduciary}${c.businessAddress ? `, ${c.businessAddress}` : ""}. We are the Data Fiduciary responsible for your personal data.`,
  );
  lines.push("");
  lines.push("2. What we collect and why");
  lines.push(
    "We process your personal data only for the purposes below. Except where a purpose is essential to providing our service, we do so only with your consent:",
  );
  for (const p of purposes) {
    const bits = [`- ${p.name}: ${p.description}`];
    bits.push(p.isEssential ? "(Essential — required to provide the service.)" : "(Optional — you may decline or withdraw.)");
    if (p.retentionDays != null) bits.push(`Kept for up to ${p.retentionDays} days.`);
    lines.push(bits.join(" "));
  }
  if (processors.length > 0) {
    lines.push("");
    lines.push("3. Who we share your data with");
    lines.push("We share your personal data with the following, only as needed:");
    for (const pr of processors) {
      lines.push(`- ${pr.name} — ${pr.purpose}${pr.dataShared ? ` (${pr.dataShared})` : ""}`);
    }
  }
  lines.push("");
  lines.push(`${processors.length > 0 ? "4" : "3"}. Your rights`);
  lines.push("At any time you may: access a copy of your data; correct or update it; withdraw consent; ask us to erase your data; nominate someone to act for you; or raise a grievance.");
  lines.push(`Manage your consent anytime via the "Manage preferences" link on our website, or submit a request here: ${c.rightsUrl}`);
  lines.push("");
  lines.push(`${processors.length > 0 ? "5" : "4"}. Grievance Officer`);
  if (c.grievanceName || c.grievanceEmail) {
    if (c.grievanceName) lines.push(c.grievanceName);
    if (c.grievanceEmail) lines.push(c.grievanceEmail);
    if (c.grievancePhone) lines.push(c.grievancePhone);
  } else {
    lines.push("[Add your grievance officer's name and contact on the DPDP compliance page.]");
  }
  lines.push("");
  lines.push(`${processors.length > 0 ? "6" : "5"}. Complaints`);
  lines.push("If your concern is not resolved, you may complain to the Data Protection Board of India under the Digital Personal Data Protection Act, 2023.");
  lines.push("");
  lines.push(`Generated ${c.today}. This helps operationalize consent and record-keeping under the DPDP Act; it is not legal advice.`);
  return lines.join("\n");
}

function hindi(c: Ctx, purposes: P[], processors: Proc[]): string {
  const lines: string[] = [];
  lines.push(`गोपनीयता सूचना — ${c.fiduciary}`);
  lines.push("");
  lines.push(
    `यह सूचना बताती है कि ${c.name} आपके व्यक्तिगत डेटा को कैसे एकत्र और उपयोग करता है, तथा डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत आपके अधिकार क्या हैं।`,
  );
  lines.push("");
  lines.push("1. हम कौन हैं");
  lines.push(
    `${c.fiduciary}${c.businessAddress ? `, ${c.businessAddress}` : ""}। हम आपके व्यक्तिगत डेटा के लिए ज़िम्मेदार डेटा फिड्यूशियरी हैं।`,
  );
  lines.push("");
  lines.push("2. हम क्या एकत्र करते हैं और क्यों");
  lines.push(
    "हम आपके व्यक्तिगत डेटा का उपयोग केवल नीचे दिए गए उद्देश्यों के लिए करते हैं। जहाँ कोई उद्देश्य सेवा देने के लिए आवश्यक है उसे छोड़कर, हम यह केवल आपकी सहमति से करते हैं:",
  );
  for (const p of purposes) {
    const bits = [`- ${p.name}: ${p.description}`];
    bits.push(p.isEssential ? "(आवश्यक — सेवा प्रदान करने के लिए ज़रूरी।)" : "(वैकल्पिक — आप अस्वीकार या वापस ले सकते हैं।)");
    if (p.retentionDays != null) bits.push(`अधिकतम ${p.retentionDays} दिनों तक रखा जाता है।`);
    lines.push(bits.join(" "));
  }
  if (processors.length > 0) {
    lines.push("");
    lines.push("3. हम आपका डेटा किसके साथ साझा करते हैं");
    lines.push("हम आपका व्यक्तिगत डेटा केवल आवश्यकतानुसार निम्नलिखित के साथ साझा करते हैं:");
    for (const pr of processors) {
      lines.push(`- ${pr.name} — ${pr.purpose}${pr.dataShared ? ` (${pr.dataShared})` : ""}`);
    }
  }
  lines.push("");
  lines.push(`${processors.length > 0 ? "4" : "3"}. आपके अधिकार`);
  lines.push("आप कभी भी: अपने डेटा की प्रति प्राप्त कर सकते हैं; उसे सुधार या अद्यतन कर सकते हैं; सहमति वापस ले सकते हैं; डेटा मिटाने के लिए कह सकते हैं; किसी को नामित कर सकते हैं; या शिकायत दर्ज कर सकते हैं।");
  lines.push(`हमारी वेबसाइट पर "प्राथमिकताएँ प्रबंधित करें" लिंक से अपनी सहमति प्रबंधित करें, या यहाँ अनुरोध करें: ${c.rightsUrl}`);
  lines.push("");
  lines.push(`${processors.length > 0 ? "5" : "4"}. शिकायत अधिकारी`);
  if (c.grievanceName || c.grievanceEmail) {
    if (c.grievanceName) lines.push(c.grievanceName);
    if (c.grievanceEmail) lines.push(c.grievanceEmail);
    if (c.grievancePhone) lines.push(c.grievancePhone);
  } else {
    lines.push("[DPDP अनुपालन पृष्ठ पर अपने शिकायत अधिकारी का नाम और संपर्क जोड़ें।]");
  }
  lines.push("");
  lines.push(`${processors.length > 0 ? "6" : "5"}. शिकायतें`);
  lines.push("यदि आपकी चिंता का समाधान नहीं होता है, तो आप DPDP अधिनियम, 2023 के तहत भारत के डेटा संरक्षण बोर्ड में शिकायत कर सकते हैं।");
  lines.push("");
  lines.push(`${c.today} को तैयार किया गया। यह DPDP अधिनियम के अनुपालन में सहायता करता है; यह कानूनी सलाह नहीं है।`);
  return lines.join("\n");
}
