export interface SessionResponse {
  admin: { id: string; email: string; role: "owner" | "staff" };
  tenant: { id: string; businessName: string } | null;
}

export interface BannerTheme {
  preset: string;
  layout: "bar" | "box-left" | "box-right" | "modal";
  primaryColor: string;
  bgColor: string;
  textColor: string;
  radius: number;
}

export interface Site {
  id: string;
  name: string;
  domain: string | null;
  apiKey: string;
  status: "active" | "suspended";
  planTier: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedOrigin: string | null;
  createdAt: string;
  counts?: { consentRecords: number; dprRequests: number };
}

export type DprType =
  | "access"
  | "correction"
  | "erasure"
  | "grievance"
  | "nomination";

export interface DprRequest {
  id: string;
  type: DprType;
  status: "open" | "in_progress" | "resolved";
  requester: string;
  details: string;
  resolutionNotes: string | null;
  createdAt: string;
  slaDeadline: string;
  daysLeft: number | null;
  resolvedAt: string | null;
}

export interface BreachIncident {
  id: string;
  description: string;
  discoveredAt: string;
  reportedToBoardAt: string | null;
  affectedUsersNotifiedAt: string | null;
  status: "open" | "reported" | "closed";
  createdAt: string;
}

export interface UsageInfo {
  period: string;
  sessions: number;
  limit: number;
  percent: number;
  warn: boolean;
  over: boolean;
  planTier: string;
}

export interface BillingPlan {
  tier: "free" | "starter" | "growth";
  name: string;
  priceInr: number;
  features: string[];
}

export interface BillingInfo {
  configured: boolean;
  currentPlan: string;
  subscriptionStatus: string | null;
  renewsAt: string | null;
  plans: BillingPlan[];
}

export interface SuperSite {
  id: string;
  name: string;
  domain: string | null;
  account: string;
  contactEmail: string;
  planTier: string;
  status: "active" | "suspended";
  subscriptionStatus: string | null;
  createdAt: string;
  counts: { consentRecords: number; dprRequests: number };
}

export interface Purpose {
  id: string;
  name: string;
  description: string;
  isEssential: boolean;
  isActive: boolean;
  sortOrder: number;
  involvesMinors: boolean;
  categoryKey: string;
  createdAt: string;
}

export interface NoticeVersion {
  id: string;
  language: string;
  bodyText: string;
  version: number;
  publishedAt: string;
}

export interface ConsentRecordRow {
  id: string;
  purpose: string;
  action: "granted" | "withdrawn";
  identifier: string;
  identifierType: string;
  method: string;
  ipAddress: string | null;
  timestamp: string;
}

export interface ConsentPage {
  total: number;
  page: number;
  pageSize: number;
  records: ConsentRecordRow[];
}

export interface ConsentEvent {
  id: string;
  timestamp: string;
  identifier: string;
  identifierType: string;
  method: string;
  ipAddress: string | null;
  accepted: string[];
  declined: string[];
}

export interface ConsentEventsPage {
  total: number;
  page: number;
  pageSize: number;
  events: ConsentEvent[];
}

export interface DashboardSummary {
  totals: {
    grants: number;
    withdrawals: number;
    trackedPeople: number;
    activePurposes: number;
    openDprRequests: number;
  };
  byPurpose: { purpose: string; granted: number; withdrawn: number }[];
  daily: { date: string; granted: number; withdrawn: number }[];
  recentActivity: {
    id: string;
    purpose: string;
    action: string;
    method: string;
    timestamp: string;
  }[];
}
