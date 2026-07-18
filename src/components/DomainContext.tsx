"use client";

import { createContext, useContext } from "react";
import type { Site } from "@/lib/types";

export interface DomainCtx {
  sites: Site[];
  current: Site;
  selectSite: (id: string) => void;
  reloadSites: () => Promise<void>;
}

export const DomainContext = createContext<DomainCtx | null>(null);

export function useDomains(): DomainCtx {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomains must be used within the app layout");
  return ctx;
}
