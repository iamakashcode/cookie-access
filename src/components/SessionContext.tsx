"use client";

import { createContext, useContext } from "react";
import type { SessionResponse } from "@/lib/types";

export const SessionContext = createContext<SessionResponse | null>(null);

export function useSession(): SessionResponse {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within the app layout");
  return ctx;
}
