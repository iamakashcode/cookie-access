/** Serialize a Site row for the dashboard (optionally with usage counts). */
export function shapeSite(s: {
  id: string;
  name: string;
  domain: string | null;
  apiKey: string;
  status: string;
  planTier: string;
  verified: boolean;
  verifiedAt: Date | null;
  verifiedOrigin: string | null;
  createdAt: Date;
  _count?: { consentRecords: number; dprRequests: number };
}) {
  return {
    id: s.id,
    name: s.name,
    domain: s.domain,
    apiKey: s.apiKey,
    status: s.status,
    planTier: s.planTier,
    verified: s.verified,
    verifiedAt: s.verifiedAt,
    verifiedOrigin: s.verifiedOrigin,
    createdAt: s.createdAt,
    counts: s._count
      ? {
          consentRecords: s._count.consentRecords,
          dprRequests: s._count.dprRequests,
        }
      : undefined,
  };
}
