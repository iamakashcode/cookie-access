/**
 * All widget CSS, injected into the Shadow DOM so it is fully isolated from —
 * and cannot leak into — the host page. Colours/radius/layout are driven by
 * CSS custom properties set from the tenant's saved theme (see theme.ts), with
 * sensible fallbacks so it works even before the theme resolves.
 */
export const css = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

.dpdp-root {
  position: fixed; z-index: 2147483000;
  color: var(--dpdp-text, #1a1a2e);
}

/* Banner (default layout = bottom bar) */
.banner {
  left: 16px; right: 16px; bottom: 16px; position: fixed;
  max-width: 720px; margin: 0 auto;
  background: var(--dpdp-bg, #ffffff);
  border: 1px solid var(--dpdp-border, #e6e6ef);
  border-radius: var(--dpdp-radius, 14px);
  box-shadow: 0 10px 40px rgba(20, 20, 60, 0.18);
  padding: 20px 22px;
  color: var(--dpdp-text, #1a1a2e);
}
/* Layout variants */
.banner.layout-box-left  { left: 16px; right: auto; max-width: 400px; margin: 0; }
.banner.layout-box-right { right: 16px; left: auto; max-width: 400px; margin: 0; }
.banner.layout-modal {
  left: 50%; right: auto; top: 50%; bottom: auto;
  transform: translate(-50%, -50%); max-width: 460px; margin: 0;
}
.banner h2 { margin: 0 0 6px; font-size: 16px; font-weight: 650; color: var(--dpdp-text, #1a1a2e); }
.banner p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: var(--dpdp-muted, #4a4a63); }
.banner .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

/* Buttons */
.btn { border: 0; border-radius: calc(var(--dpdp-radius, 14px) * 0.6); padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.btn-primary { background: var(--dpdp-primary, #4338ca); color: var(--dpdp-on-primary, #fff); }
.btn-primary:hover { filter: brightness(0.92); }
.btn-secondary { background: var(--dpdp-secondary-bg, #f1f1f7); color: var(--dpdp-text, #2a2a45); }
.btn-secondary:hover { background: var(--dpdp-secondary-bg-hover, #e6e6ef); }
.btn-ghost { background: transparent; color: var(--dpdp-primary, #4338ca); padding: 10px 6px; }
.btn-ghost:hover { text-decoration: underline; }
.link { background: none; border: 0; color: var(--dpdp-primary, #4338ca); cursor: pointer; font-size: 13px; padding: 0; text-decoration: underline; }

/* Persistent launcher */
.launcher {
  position: fixed; left: 16px; bottom: 16px;
  background: var(--dpdp-bg, #fff);
  border: 1px solid var(--dpdp-border, #e6e6ef);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(20, 20, 60, 0.15);
  padding: 9px 14px; font-size: 12.5px; font-weight: 600;
  color: var(--dpdp-primary, #3730a3); cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
}
.launcher:hover { filter: brightness(0.97); }
.launcher svg { width: 15px; height: 15px; }

/* Modal (preferences) */
.overlay {
  position: fixed; inset: 0; background: rgba(20, 20, 45, 0.5);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: var(--dpdp-bg, #fff); color: var(--dpdp-text, #1a1a2e);
  border-radius: var(--dpdp-radius, 16px); width: 100%; max-width: 560px;
  max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 20px 60px rgba(20, 20, 60, 0.3);
}
.modal-head { padding: 20px 22px 12px; border-bottom: 1px solid var(--dpdp-border, #eee); }
.modal-head h2 { margin: 0; font-size: 17px; font-weight: 680; }
.modal-head p { margin: 6px 0 0; font-size: 13px; color: var(--dpdp-muted, #6a6a80); line-height: 1.45; }
.modal-body { padding: 8px 22px; overflow-y: auto; }
.modal-foot { padding: 14px 22px 20px; border-top: 1px solid var(--dpdp-border, #eee); display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

.purpose { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--dpdp-border, #f0f0f5); }
.purpose:last-child { border-bottom: 0; }
.purpose .meta { flex: 1; }
.purpose .name { font-size: 14px; font-weight: 620; margin: 0 0 3px; display: flex; align-items: center; gap: 8px; }
.purpose .desc { font-size: 12.5px; color: var(--dpdp-muted, #6a6a80); line-height: 1.45; margin: 0; }
.tag { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: var(--dpdp-muted, #7a7a90); background: var(--dpdp-secondary-bg, #f1f1f7); padding: 2px 7px; border-radius: 6px; }

/* Toggle */
.switch { position: relative; width: 42px; height: 24px; flex: none; align-self: center; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: var(--dpdp-secondary-bg-hover, #d4d4e0); border-radius: 999px; transition: .18s; cursor: pointer; }
.slider::before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .18s; box-shadow: 0 1px 2px rgba(0,0,0,.2); }
.switch input:checked + .slider { background: var(--dpdp-primary, #4338ca); }
.switch input:checked + .slider::before { transform: translateX(18px); }
.switch input:disabled + .slider { opacity: 0.6; cursor: not-allowed; }

.notice-toggle { margin-top: 12px; }
.notice-text { margin-top: 10px; font-size: 12px; color: var(--dpdp-muted, #55556e); white-space: pre-wrap; line-height: 1.5; background: var(--dpdp-secondary-bg, #fafafd); border: 1px solid var(--dpdp-border, #eee); border-radius: 10px; padding: 12px; max-height: 220px; overflow-y: auto; }
.foot-note { font-size: 11px; color: var(--dpdp-muted, #9a9ab0); margin: 12px 22px 0; }

/* Minor / parental-consent block */
.minor-box { margin-top: 10px; border-top: 1px dashed var(--dpdp-border, #e6e6ef); padding-top: 12px; }
.minor-box label.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dpdp-muted, #4a4a63); }
.minor-box input[type=email] { margin-top: 8px; width: 100%; padding: 9px 11px; border: 1px solid var(--dpdp-border, #d4d4e0); border-radius: 8px; font-size: 13px; background: var(--dpdp-bg, #fff); color: var(--dpdp-text, #1a1a2e); }
.minor-hint { font-size: 11.5px; color: var(--dpdp-muted, #8a8aa0); margin-top: 6px; line-height: 1.4; }

/* Toast */
.toast { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); background: #1a1a2e; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 13px; max-width: 92vw; text-align: center; box-shadow: 0 8px 30px rgba(20,20,60,.3); }

@media (max-width: 520px) {
  .banner, .banner.layout-box-left, .banner.layout-box-right { left: 12px; right: 12px; max-width: none; }
  .banner .actions { flex-direction: column; align-items: stretch; }
  .btn { width: 100%; }
}
`;
