/**
 * Block-first tracker gating. Two layers:
 *  1. Auto-block — holds scripts for known third-party trackers (Google
 *     Analytics, GTM, Facebook Pixel, …) until the matching consent category is
 *     granted. Covers scripts created from JS (createElement + src/setAttribute)
 *     and <script src> tags written in the page HTML (via a MutationObserver
 *     that neutralises them before they execute). Needs the widget to load
 *     first, synchronously, in <head>.
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

// Real setAttribute, so our own writes bypass the per-element src hook.
const setAttr = Element.prototype.setAttribute;

// Auto-blocked tracker scripts created from JS, held until consented.
const stash: Array<{ cat: string; el: HTMLScriptElement; src: string }> = [];

// Tracker <script> tags from the page HTML, neutralised by switching their type.
const BLOCKED_TYPE = "javascript/blocked";
const parsed: Array<{ cat: string; el: HTMLScriptElement; type: string | null }> = [];

function absolute(url: string): string {
  try {
    return new URL(url, location.href).href;
  } catch {
    return url; // relative or malformed
  }
}

/** Should a category be blocked right now? Deny-by-default until consent resolves. */
function blockedNow(cat: string): boolean {
  if (granted.has(cat)) return false;
  if (!ready) return true; // before we know the visitor's choice → block
  return managed.has(cat); // only auto-block categories this site actually manages
}

/**
 * Start blocking: patch document.createElement for JS-created scripts, and
 * watch the DOM for tracker <script src> tags coming from the page HTML.
 */
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
  observeParsedScripts();
}

function hookScriptSrc(el: HTMLScriptElement): void {
  let real = "";
  const assign = (v: string) => {
    real = String(v);
    const cat = trackerCategory(absolute(real));
    if (cat && blockedNow(cat)) {
      stash.push({ cat, el, src: real }); // held — no real src set yet
    } else {
      setAttr.call(el, "src", real);
    }
  };
  try {
    Object.defineProperty(el, "src", {
      configurable: true,
      enumerable: true,
      get() {
        return real;
      },
      set: assign,
    });
    // setAttribute("src", …) would otherwise bypass the property hook.
    el.setAttribute = function (name: string, value: string) {
      if (String(name).toLowerCase() === "src") assign(value);
      else setAttr.call(el, name, value);
    };
  } catch {
    /* some scripts freeze their prototype — leave as-is */
  }
}

/**
 * Tracker tags in the page HTML never go through createElement, so watch the
 * DOM instead. The observer runs before the parser executes a newly inserted
 * script; switching its type to a non-JS one stops it from running (Firefox
 * also needs `beforescriptexecute` cancelled). Works for tags that come after
 * the widget's own <script> in the document.
 */
function observeParsedScripts(): void {
  if (typeof MutationObserver === "undefined" || !document.documentElement) return;
  try {
    new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1 || (node as Element).tagName !== "SCRIPT") return;
          const el = node as HTMLScriptElement;
          const src = el.getAttribute("src");
          if (!src || el.getAttribute("type") === BLOCKED_TYPE) return;
          const cat = trackerCategory(absolute(src));
          if (!cat || !blockedNow(cat)) return;
          parsed.push({ cat, el, type: el.getAttribute("type") });
          setAttr.call(el, "type", BLOCKED_TYPE);
          const cancel = (e: Event) => {
            if (el.getAttribute("type") === BLOCKED_TYPE) e.preventDefault();
            el.removeEventListener("beforescriptexecute", cancel);
          };
          el.addEventListener("beforescriptexecute", cancel);
        });
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    /* no observer support — tag-based blocking still works */
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
      setAttr.call(item.el, "src", item.src);
    }
  }
  // A neutralised HTML tag can't be re-run in place — swap in a fresh copy.
  for (let i = parsed.length - 1; i >= 0; i--) {
    if (!granted.has(parsed[i].cat)) continue;
    const { el, type } = parsed.splice(i, 1)[0];
    const s = origCreate!("script");
    for (let j = 0; j < el.attributes.length; j++) {
      const a = el.attributes[j];
      if (a.name !== "type") setAttr.call(s, a.name, a.value);
    }
    if (type) setAttr.call(s, "type", type);
    if (el.textContent) s.textContent = el.textContent;
    el.parentNode?.replaceChild(s, el);
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
