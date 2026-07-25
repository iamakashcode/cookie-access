import { css } from "./styles";
import { getStrings, type Strings } from "./strings";
import { themeVars, type BannerTheme } from "./theme";

export interface UIPurpose {
  id: string;
  name: string;
  description: string;
  isEssential: boolean;
  granted: boolean;
}

export interface UIData {
  businessName: string;
  purposes: UIPurpose[];
  noticeText: string | null;
  hasMinorPurposes: boolean;
}

/** Save handler. `minor.guardianEmail` present → route through parental consent. */
type SaveFn = (
  decisions: Record<string, boolean>,
  minor?: { guardianEmail: string },
) => void;

/**
 * Owns the widget's Shadow DOM. All UI (banner, preferences modal, persistent
 * launcher) is rendered inside an isolated shadow root so nothing leaks in or
 * out of the host page's styles.
 */
export class WidgetUI {
  private host: HTMLElement;
  private root: HTMLElement;
  private t: Strings;
  private theme: BannerTheme;
  private rightsUrl: string | null;

  constructor(lang: string, theme: BannerTheme, rightsUrl?: string | null) {
    this.t = getStrings(lang);
    this.theme = theme;
    this.rightsUrl = rightsUrl ?? null;
    this.host = document.createElement("div");
    this.host.setAttribute("data-dpdp-consent", "");
    // Apply the tenant's colours/radius as CSS variables (inherited into the shadow tree).
    const vars = themeVars(theme);
    for (const name in vars) this.host.style.setProperty(name, vars[name]);
    const shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);
    this.root = document.createElement("div");
    this.root.className = "dpdp-root";
    shadow.appendChild(this.root);
  }

  mount(): void {
    if (!this.host.isConnected) document.body.appendChild(this.host);
  }

  private el(tag: string, className?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text; // textContent = XSS-safe
    return e;
  }

  private remove(selector: string): void {
    this.root.querySelector(selector)?.remove();
  }

  hideBanner(): void {
    this.remove(".banner");
  }

  hideModal(): void {
    this.remove(".overlay");
  }

  /** Brief confirmation message (e.g. after a parental-consent submission). */
  showToast(message: string): void {
    this.remove(".toast");
    const toast = this.el("div", "toast", message);
    this.root.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  /**
   * Consent receipt: a small overlay confirming exactly what the person chose,
   * with a reference id and a downloadable copy — their proof of consent.
   */
  showReceipt(
    r: { businessName: string; reference: string; items: { name: string; granted: boolean }[] },
    t: Strings,
  ): void {
    this.remove(".overlay");
    const overlay = this.el("div", "overlay");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.remove(".overlay");
    });
    const modal = this.el("div", "modal");

    const head = this.el("div", "modal-head");
    head.appendChild(this.el("h2", undefined, t.receiptTitle));
    head.appendChild(this.el("p", undefined, r.businessName));
    modal.appendChild(head);

    const body = this.el("div", "modal-body");
    for (const it of r.items) {
      const row = this.el("div", "receipt-row");
      row.appendChild(this.el("span", `receipt-mark ${it.granted ? "on" : "off"}`, it.granted ? "✓" : "✕"));
      row.appendChild(this.el("span", "receipt-name", it.name));
      body.appendChild(row);
    }
    if (r.reference) {
      body.appendChild(
        this.el("div", "receipt-ref", `${t.receiptRef}: ${r.reference.slice(0, 8)}`),
      );
    }
    modal.appendChild(body);

    const foot = this.el("div", "modal-foot");
    const download = this.el("button", "btn btn-secondary", t.receiptDownload) as HTMLButtonElement;
    download.onclick = () => this.downloadReceipt(r, t);
    const done = this.el("button", "btn btn-primary", t.receiptDone) as HTMLButtonElement;
    done.onclick = () => this.remove(".overlay");
    foot.append(download, done);
    modal.appendChild(foot);

    overlay.appendChild(modal);
    this.root.appendChild(overlay);
  }

  private downloadReceipt(
    r: { businessName: string; reference: string; items: { name: string; granted: boolean }[] },
    t: Strings,
  ): void {
    const lines = [
      `${t.receiptTitle} — ${r.businessName}`,
      new Date().toLocaleString(),
      "",
      ...r.items.map((it) => `${it.granted ? "[x]" : "[ ]"} ${it.name}`),
      "",
      r.reference ? `${t.receiptRef}: ${r.reference}` : "",
    ];
    try {
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "consent-receipt.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* download blocked — the on-screen receipt is still shown */
    }
  }

  /** First-run consent banner with Accept all / Reject / Customize. */
  showBanner(data: UIData, cb: { onSave: SaveFn; onCustomize: () => void }): void {
    this.hideBanner();
    const t = this.t;
    const banner = this.el("div", `banner layout-${this.theme.layout}`);

    banner.appendChild(this.el("h2", undefined, t.bannerTitle(data.businessName)));
    banner.appendChild(this.el("p", undefined, t.bannerBody));

    const actions = this.el("div", "actions");

    const acceptAll = this.el("button", "btn btn-primary", t.acceptAll) as HTMLButtonElement;
    acceptAll.onclick = () => {
      // If any purpose involves minors, don't silently accept — send them into
      // the preferences flow to declare age / capture a guardian.
      if (data.hasMinorPurposes) {
        cb.onCustomize();
        return;
      }
      const decisions: Record<string, boolean> = {};
      data.purposes.forEach((p) => (decisions[p.id] = true));
      cb.onSave(decisions);
    };

    const reject = this.el("button", "btn btn-secondary", t.rejectOptional) as HTMLButtonElement;
    reject.onclick = () => {
      const decisions: Record<string, boolean> = {};
      data.purposes.forEach((p) => (decisions[p.id] = p.isEssential));
      cb.onSave(decisions);
    };

    const customize = this.el("button", "btn btn-ghost", t.choose) as HTMLButtonElement;
    customize.onclick = () => cb.onCustomize();

    actions.append(acceptAll, reject, customize);
    banner.appendChild(actions);
    this.root.appendChild(banner);
  }

  /** Preferences modal — per-purpose toggles + (if needed) parental consent. */
  showModal(data: UIData, cb: { onSave: SaveFn }): void {
    this.hideModal();
    const t = this.t;
    const overlay = this.el("div", "overlay");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.hideModal();
    });

    const modal = this.el("div", "modal");

    const head = this.el("div", "modal-head");
    head.appendChild(this.el("h2", undefined, t.prefsTitle));
    head.appendChild(this.el("p", undefined, t.prefsBody));
    modal.appendChild(head);

    const body = this.el("div", "modal-body");
    const inputs = new Map<string, HTMLInputElement>();

    for (const p of data.purposes) {
      const row = this.el("div", "purpose");
      const meta = this.el("div", "meta");
      const name = this.el("div", "name");
      name.appendChild(document.createTextNode(p.name));
      if (p.isEssential) name.appendChild(this.el("span", "tag", t.essential));
      meta.appendChild(name);
      meta.appendChild(this.el("p", "desc", p.description));

      const sw = this.el("label", "switch");
      const input = this.el("input") as HTMLInputElement;
      input.type = "checkbox";
      input.checked = p.isEssential ? true : p.granted;
      input.disabled = p.isEssential;
      inputs.set(p.id, input);
      sw.appendChild(input);
      sw.appendChild(this.el("span", "slider"));

      row.append(meta, sw);
      body.appendChild(row);
    }

    // Parental-consent block (only when a purpose involves minors).
    let minorCheck: HTMLInputElement | null = null;
    let guardianInput: HTMLInputElement | null = null;
    if (data.hasMinorPurposes) {
      const box = this.el("div", "minor-box");
      const checkLabel = this.el("label", "check");
      minorCheck = this.el("input") as HTMLInputElement;
      minorCheck.type = "checkbox";
      checkLabel.appendChild(minorCheck);
      checkLabel.appendChild(document.createTextNode(t.minorCheck));
      box.appendChild(checkLabel);

      guardianInput = this.el("input") as HTMLInputElement;
      guardianInput.type = "email";
      guardianInput.placeholder = t.guardianPlaceholder;
      guardianInput.style.display = "none";
      box.appendChild(guardianInput);
      box.appendChild(this.el("div", "minor-hint", t.minorHint));

      minorCheck.onchange = () => {
        guardianInput!.style.display = minorCheck!.checked ? "block" : "none";
      };
      body.appendChild(box);
    }

    // Collapsible full privacy notice.
    if (data.noticeText) {
      const toggle = this.el("button", "link notice-toggle", t.viewNotice) as HTMLButtonElement;
      const noticeBox = this.el("div", "notice-text", data.noticeText);
      noticeBox.style.display = "none";
      toggle.onclick = () => {
        const open = noticeBox.style.display === "none";
        noticeBox.style.display = open ? "block" : "none";
        toggle.textContent = open ? t.hideNotice : t.viewNotice;
      };
      body.append(toggle, noticeBox);
    }

    // "Your data rights" — opens the business's rights portal in a new tab so a
    // visitor can request access / correction / erasure of their data.
    if (this.rightsUrl) {
      const rights = this.el("a", "link rights-link", this.t.dataRights) as HTMLAnchorElement;
      rights.href = this.rightsUrl;
      rights.target = "_blank";
      rights.rel = "noopener noreferrer";
      body.appendChild(rights);
    }
    modal.appendChild(body);

    const foot = this.el("div", "modal-foot");
    const cancel = this.el("button", "btn btn-secondary", t.cancel) as HTMLButtonElement;
    cancel.onclick = () => this.hideModal();
    const save = this.el("button", "btn btn-primary", t.save) as HTMLButtonElement;
    save.onclick = () => {
      const decisions: Record<string, boolean> = {};
      inputs.forEach((input, id) => (decisions[id] = input.checked));
      const guardianEmail = guardianInput?.value.trim();
      if (minorCheck?.checked && guardianEmail) {
        cb.onSave(decisions, { guardianEmail });
      } else {
        cb.onSave(decisions);
      }
    };
    foot.append(cancel, save);
    modal.appendChild(foot);

    modal.appendChild(this.el("div", "foot-note", t.disclaimer));

    overlay.appendChild(modal);
    this.root.appendChild(overlay);
  }

  /** Persistent "Manage preferences" launcher, always available after a choice. */
  showLauncher(onOpen: () => void): void {
    if (this.root.querySelector(".launcher")) return;
    const btn = this.el("button", "launcher") as HTMLButtonElement;
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a4 4 0 100 8 4 4 0 000-8zM4 21a8 8 0 0116 0"/></svg>';
    btn.appendChild(document.createTextNode(this.t.manage));
    btn.onclick = onOpen;
    this.root.appendChild(btn);
  }
}
