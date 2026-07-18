/**
 * All widget CSS, injected into the Shadow DOM so it is fully isolated from —
 * and cannot leak into — the host page. Uses a high z-index and system fonts.
 */
export const css = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

.dpdp-root { position: fixed; z-index: 2147483000; color: #1a1a2e; }

/* Banner */
.banner {
  left: 16px; right: 16px; bottom: 16px; position: fixed;
  max-width: 720px; margin: 0 auto;
  background: #ffffff; border: 1px solid #e6e6ef; border-radius: 14px;
  box-shadow: 0 10px 40px rgba(20, 20, 60, 0.18);
  padding: 20px 22px;
}
.banner h2 { margin: 0 0 6px; font-size: 16px; font-weight: 650; }
.banner p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.5; color: #4a4a63; }
.banner .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

/* Buttons */
.btn { border: 0; border-radius: 9px; padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.btn-primary { background: #4338ca; color: #fff; }
.btn-primary:hover { background: #3730a3; }
.btn-secondary { background: #f1f1f7; color: #2a2a45; }
.btn-secondary:hover { background: #e6e6ef; }
.btn-ghost { background: transparent; color: #4338ca; padding: 10px 6px; }
.btn-ghost:hover { text-decoration: underline; }
.link { background: none; border: 0; color: #4338ca; cursor: pointer; font-size: 13px; padding: 0; text-decoration: underline; }

/* Persistent launcher */
.launcher {
  position: fixed; left: 16px; bottom: 16px;
  background: #fff; border: 1px solid #e6e6ef; border-radius: 999px;
  box-shadow: 0 4px 16px rgba(20, 20, 60, 0.15);
  padding: 9px 14px; font-size: 12.5px; font-weight: 600; color: #3730a3; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
}
.launcher:hover { background: #f7f7fc; }
.launcher svg { width: 15px; height: 15px; }

/* Modal */
.overlay {
  position: fixed; inset: 0; background: rgba(20, 20, 45, 0.5);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 560px;
  max-height: 88vh; display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 20px 60px rgba(20, 20, 60, 0.3);
}
.modal-head { padding: 20px 22px 12px; border-bottom: 1px solid #eee; }
.modal-head h2 { margin: 0; font-size: 17px; font-weight: 680; }
.modal-head p { margin: 6px 0 0; font-size: 13px; color: #6a6a80; line-height: 1.45; }
.modal-body { padding: 8px 22px; overflow-y: auto; }
.modal-foot { padding: 14px 22px 20px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }

.purpose { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f0f0f5; }
.purpose:last-child { border-bottom: 0; }
.purpose .meta { flex: 1; }
.purpose .name { font-size: 14px; font-weight: 620; margin: 0 0 3px; display: flex; align-items: center; gap: 8px; }
.purpose .desc { font-size: 12.5px; color: #6a6a80; line-height: 1.45; margin: 0; }
.tag { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: #7a7a90; background: #f1f1f7; padding: 2px 7px; border-radius: 6px; }

/* Toggle */
.switch { position: relative; width: 42px; height: 24px; flex: none; align-self: center; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: #d4d4e0; border-radius: 999px; transition: .18s; cursor: pointer; }
.slider::before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .18s; }
.switch input:checked + .slider { background: #4338ca; }
.switch input:checked + .slider::before { transform: translateX(18px); }
.switch input:disabled + .slider { background: #a9a9c4; cursor: not-allowed; }

.notice-toggle { margin-top: 12px; }
.notice-text { margin-top: 10px; font-size: 12px; color: #55556e; white-space: pre-wrap; line-height: 1.5; background: #fafafd; border: 1px solid #eee; border-radius: 10px; padding: 12px; max-height: 220px; overflow-y: auto; }
.foot-note { font-size: 11px; color: #9a9ab0; margin: 12px 22px 0; }

/* Minor / parental-consent block */
.minor-box { margin-top: 10px; border-top: 1px dashed #e6e6ef; padding-top: 12px; }
.minor-box label.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4a4a63; }
.minor-box input[type=email] { margin-top: 8px; width: 100%; padding: 9px 11px; border: 1px solid #d4d4e0; border-radius: 8px; font-size: 13px; }
.minor-hint { font-size: 11.5px; color: #8a8aa0; margin-top: 6px; line-height: 1.4; }

/* Toast */
.toast { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); background: #1a1a2e; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 13px; max-width: 92vw; text-align: center; box-shadow: 0 8px 30px rgba(20,20,60,.3); }

@media (max-width: 520px) {
  .banner .actions { flex-direction: column; align-items: stretch; }
  .btn { width: 100%; }
}
`;
