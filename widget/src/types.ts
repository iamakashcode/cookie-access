export interface Purpose {
  id: string;
  name: string;
  description: string;
  isEssential: boolean;
  involvesMinors?: boolean;
  key?: string; // category key used to gate scripts (data-dpdp="…")
}

export interface NoticeInfo {
  id: string;
  language: string;
  version: number;
  bodyText: string;
  publishedAt: string;
}

export interface PurposesResponse {
  businessName: string;
  purposes: Purpose[];
  notice: NoticeInfo | null;
}

export interface StatusPurpose extends Purpose {
  granted: boolean;
  lastUpdated: string | null;
}

export interface StatusResponse {
  purposes: StatusPurpose[];
}

export type IdentifierType = "email" | "phone" | "anon";

export interface Decision {
  purposeId: string;
  granted: boolean;
}
