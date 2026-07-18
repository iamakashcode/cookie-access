/**
 * Block-first tracker gating. Two layers:
 *  1. Auto-block — intercepts scripts created for known third-party trackers
 *     (Google Analytics, GTM, Facebook Pixel, …) and holds them until the
 *     matching consent category is granted. Best-effort; needs the widget to
 *     load first (in <head>).
 *  2. Tag-based (reliable) — <script type="text/plain" data-dpdp="analytics">
 *     never runs until we activate it on consent.
 *
 * The host page can also read state: window.DPDPConsent.getConsent("analytics").
 */

const TRACKERS: { re: RegExp; cat: string }[] = [
  {
    re: /google-analytics\.com|googletagmanager\.com|analytics\.google\.com|\/gtag\/js/i,
    cat: "analytics",
  },
  {
    re: /clarity\.ms|hotjar\.com|mixpanel|segment\.(io|com)|amplitude\.com|plausible\.io|matomo|mc\.yandex\./i,
    cat: "analytics",
  },
  {
    re: /connect\.facebook\.net|facebook\.com\/tr|doubleclick\.net|googlesyndication\.com|googleadservices\.com|ads\.linkedin\.com|snap\.licdn\.com|analytics\.tiktok\.com|static\.ads-twitter\.com|ct\.pinterest\.com/i,
    cat: "marketing",
  },
];

function trackerCategory(url: string): string | null {
  for (const t of TRACKERS) if (t.re.test(url)) return t.cat;
  return null;
}

let managed = new Set<string>();
let granted = new Set<string>();
let ready = false;
let prevGranted = new Set<string>();
const changeCbs: Array<() => void> = [];

const origCreate =
  typeof document !== "undefined" ? document.createElement.bind(document) : null;

// Auto-blocked tracker scripts, held until their category is consented.
const stash: Array<{ cat: string; el: HTMLScriptElement; src: string }> = [];

/** Should a category be blocked right now? Deny-by-default until consent resolves. */
function blockedNow(cat: string): boolean {
  if (granted.has(cat)) return false;
  if (!ready) return true; // before we know the visitor's choice → block
  return managed.has(cat); // only auto-block categories this site actually manages
}

/** Patch document.createElement to neutralise known-tracker <script src>. */
export function installBlocking(): void {
  if (!origCreate) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).createElement = function (tag: string, options?: unknown) {
      const el = origCreate(tag as string, options as ElementCreationOptions);
      if (String(tag).toLowerCase() === "script") {
        hookScriptSrc(el as HTMLScriptElement);
      }
      return el;
    };
  } catch {
    /* environment froze document — skip auto-block */
  }
}

function hookScriptSrc(el: HTMLScriptElement): void {
  let real = "";
  try {
    Object.defineProperty(el, "src", {
      configurable: true,
      enumerable: true,
      get() {
        return real;
      },
      set(v: string) {
        real = String(v);
        let abs = real;
        try {
          abs = new URL(real, location.href).href;
        } catch {
          /* relative or malformed */
        }
        const cat = trackerCategory(abs);
        if (cat && blockedNow(cat)) {
          stash.push({ cat, el, src: real }); // held — no real src set yet
        } else {
          el.setAttribute("src", real);
        }
      },
    });
  } catch {
    /* some scripts freeze their prototype — leave as-is */
  }
}

/** Turn any blocked <script type="text/plain" data-dpdp="cat"> into a live script. */
function activateTagged(cat: string): void {
  const nodes = document.querySelectorAll<HTMLScriptElement>(
    'script[type="text/plain"][data-dpdp]',
  );
  nodes.forEach((old) => {
    if (old.getAttribute("data-dpdp") !== cat) return;
    const s = origCreate!("script");
    for (let i = 0; i < old.attributes.length; i++) {
      const a = old.attributes[i];
      if (a.name === "type" || a.name === "data-dpdp") continue;
      s.setAttribute(a.name === "data-src" ? "src" : a.name, a.value);
    }
    if (old.textContent) s.textContent = old.textContent;
    old.parentNode?.replaceChild(s, old);
  });
}

/** Load any auto-blocked tracker scripts whose category is now granted. */
function loadGrantedStash(): void {
  for (let i = stash.length - 1; i >= 0; i--) {
    if (granted.has(stash[i].cat)) {
      const item = stash.splice(i, 1)[0];
      item.el.setAttribute("src", item.src);
    }
  }
}

/**
 * Apply the current consent. `managedKeys` = category keys this site manages;
 * `grantedKeys` = the ones the visitor allows. Activates newly-allowed scripts;
 * if a previously-allowed category was withdrawn, reloads so it's re-blocked.
 */
export function setConsent(managedKeys: string[], grantedKeys: string[]): void {
  const wasReady = ready;
  managed = new Set(managedKeys);
  const next = new Set(grantedKeys);

  let withdrew = false;
  if (wasReady) {
    for (const g of prevGranted) {
      if (!next.has(g)) {
        withdrew = true;
        break;
      }
    }
  }

  granted = next;
  ready = true;

  granted.forEach((cat) => activateTagged(cat));
  loadGrantedStash();

  prevGranted = new Set(granted);
  changeCbs.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });

  if (withdrew) {
    // A tracker that had been allowed is now denied — reload to stop it.
    setTimeout(() => location.reload(), 250);
  }
}

export function getConsent(key: string): boolean {
  return granted.has(key);
}

export function getAllConsent(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  managed.forEach((k) => (out[k] = granted.has(k)));
  return out;
}

export function onConsentChange(cb: () => void): void {
  changeCbs.push(cb);
  if (ready) {
    try {
      cb();
    } catch {
      /* ignore */
    }
  }
}
