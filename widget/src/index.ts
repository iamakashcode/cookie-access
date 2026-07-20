import { readConfig } from "./config";
import {
  fetchPurposes,
  fetchStatus,
  postConsent,
  postParentalConsent,
} from "./api";
import { WidgetUI, type UIData } from "./ui";
import { getStrings } from "./strings";
import { resolveTheme } from "./theme";
import type { Decision, IdentifierType, Purpose } from "./types";
import {
  installBlocking,
  setConsent,
  getConsent,
  getAllConsent,
  onConsentChange,
} from "./block";
import {
  getActiveIdentity,
  getCachedConsent,
  getCachedPurposes,
  hasChosen,
  setActiveIdentity,
  setCachedConsent,
  setCachedPurposes,
} from "./storage";

// Patch script creation to auto-block known trackers as early as possible.
installBlocking();

/**
 * Public JS surface a host page can call, e.g.:
 *   window.DPDPConsent.open()                      // open the preferences modal
 *   window.DPDPConsent.identify("user@site.com")   // attach a known identity
 *   window.DPDPConsent.getConsent("analytics")     // gate your own scripts
 *   window.DPDPConsent.onChange(fn)                // react to consent changes
 */
interface DPDPConsentAPI {
  open: () => void;
  identify: (identifier: string, type?: IdentifierType) => void;
  getConsent: (categoryKey: string) => boolean;
  getAll: () => Record<string, boolean>;
  onChange: (cb: () => void) => void;
}

declare global {
  interface Window {
    DPDPConsent?: DPDPConsentAPI;
    __dpdpConsentLoaded?: boolean;
  }
}

async function init(): Promise<void> {
  // Guard against the script being included twice.
  if (window.__dpdpConsentLoaded) return;
  window.__dpdpConsentLoaded = true;

  const config = readConfig();
  if (!config) return; // no tenant key → silently do nothing
  const cfg = config; // non-null binding usable inside nested closures

  // Everything below is wrapped so a failure can never break the host page.
  try {
    // Serve from the short-lived local cache when fresh, else fetch + cache.
    // Repeat page views within the TTL never touch the network or the server.
    let fetched = getCachedPurposes(cfg.tenantKey, cfg.language);
    const fromCache = !!fetched;
    if (!fetched) fetched = await fetchPurposes(cfg);
    if (!fetched || fetched.purposes.length === 0) return; // API down / empty → no-op
    if (!fromCache) setCachedPurposes(cfg.tenantKey, cfg.language, fetched);
    const resp = fetched; // const binding → narrowing persists inside closures

    // The rights portal is served by the API origin (not the customer's site).
    // Carry this browser's identity so an access request can be matched to the
    // consent recorded here (which is anonymous by default).
    const who = getActiveIdentity();
    const rightsUrl =
      `${cfg.apiBase}/rights?k=${encodeURIComponent(cfg.tenantKey)}` +
      `&id=${encodeURIComponent(who.identifier)}`;
    const ui = new WidgetUI(cfg.language, resolveTheme(resp.theme), rightsUrl);
    ui.mount();
    const t = getStrings(cfg.language);

    const noticeText = resp.notice?.bodyText ?? null;
    const hasMinorPurposes = resp.purposes.some((p) => p.involvesMinors);
    const buildData = (granted: Record<string, boolean>): UIData => ({
      businessName: resp.businessName,
      noticeText,
      hasMinorPurposes,
      purposes: resp.purposes.map((p) => ({
        ...p,
        granted: p.isEssential ? true : granted[p.id] ?? false,
      })),
    });

    // --- Tracker gating: map consent to category keys and apply it ---
    const keyOf = (p: Purpose) => p.key || "";
    const managedKeys = resp.purposes.map(keyOf).filter(Boolean);
    const grantedKeys = (decisions: Record<string, boolean>) =>
      resp.purposes
        .filter((p) => p.isEssential || decisions[p.id])
        .map(keyOf)
        .filter(Boolean);
    // Apply prior consent (from cache) immediately — deny-by-default otherwise.
    setConsent(managedKeys, grantedKeys(getCachedConsent()?.decisions ?? {}));

    const save = async (
      decisions: Record<string, boolean>,
      minor?: { guardianEmail: string },
    ): Promise<void> => {
      // Optimistically reflect the choice; the network call fails soft.
      setCachedConsent(decisions);
      setConsent(managedKeys, grantedKeys(decisions)); // activate/re-block trackers
      ui.hideBanner();
      ui.hideModal();
      ui.showLauncher(openPreferences);

      const identity = getActiveIdentity();
      const arr: Decision[] = resp.purposes.map((p) => ({
        purposeId: p.id,
        granted: p.isEssential ? true : !!decisions[p.id],
      }));

      if (minor?.guardianEmail) {
        // Route through parental consent — recorded only after the guardian verifies.
        await postParentalConsent(cfg, identity.identifier, minor.guardianEmail, arr);
        ui.showToast(t.minorToast);
      } else {
        await postConsent(cfg, identity.identifier, identity.type, arr);
      }
    };

    async function openPreferences(): Promise<void> {
      const identity = getActiveIdentity();
      const granted: Record<string, boolean> = {};

      // Prefer the server's current state; fall back to local cache, then defaults.
      const status = await fetchStatus(cfg, identity.identifier);
      if (status) {
        status.purposes.forEach((p) => (granted[p.id] = p.granted));
      } else {
        const cached = getCachedConsent();
        resp!.purposes.forEach(
          (p) => (granted[p.id] = cached?.decisions[p.id] ?? p.isEssential),
        );
      }
      ui.showModal(buildData(granted), { onSave: save });
    }

    // Expose the host-page API.
    window.DPDPConsent = {
      open: openPreferences,
      identify: (identifier: string, type: IdentifierType = "email") =>
        setActiveIdentity(identifier, type),
      getConsent: (categoryKey: string) => getConsent(categoryKey),
      getAll: () => getAllConsent(),
      onChange: (cb: () => void) => onConsentChange(cb),
    };

    if (hasChosen()) {
      // Returning visitor: no banner, just the persistent management launcher.
      ui.showLauncher(openPreferences);
    } else {
      const defaults: Record<string, boolean> = {};
      resp.purposes.forEach((p) => (defaults[p.id] = p.isEssential)); // opt-in
      ui.showBanner(buildData(defaults), {
        onSave: save,
        onCustomize: () => ui.showModal(buildData(defaults), { onSave: save }),
      });
    }
  } catch {
    // Absolute last-resort guard — never surface an error to the host site.
  }
}

// Wait for <body> to exist before mounting.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
