/**
 * Treatly Admin — Shared UI Components
 *
 * Self-contained components that don't depend on shadcn/ui.
 * Uses Tailwind v4 utility classes + CSS custom properties injected once.
 */

import React, { useEffect, useRef, useCallback, type ReactNode } from "react";

// ─── CSS injection (once) ─────────────────────────────────────────────────────

const ADMIN_CSS = `
  .adm { --adm-navy: #0d1520; --adm-navy2: #111c2e; --adm-navy3: #162038; --adm-blue: #2563eb; --adm-blue-l: #3b82f6; --adm-teal: #2dd4a7; --adm-teal-d: #1a9e7e; --adm-coral: #e85d6b; --adm-gold: #c9a84c; --adm-text: #eef2f7; --adm-muted: #8898b3; --adm-muted2: #5a6e8a; --adm-border: rgba(255,255,255,0.06); --adm-border-s: rgba(255,255,255,0.1); }
  .adm * { box-sizing: border-box; }
  .adm, .adm body { background: var(--adm-navy); color: var(--adm-text); font-family: 'DM Sans', 'Inter', sans-serif; }

  /* Layout */
  .adm-layout { display: flex; min-height: 100vh; background: var(--adm-navy); }
  .adm-sidebar { width: 240px; min-height: 100vh; background: var(--adm-navy2); border-right: 1px solid var(--adm-border); display: flex; flex-direction: column; position: fixed; left: 0; top: 0; bottom: 0; z-index: 50; }
  .adm-main { flex: 1; margin-left: 240px; display: flex; flex-direction: column; min-height: 100vh; }
  .adm-topbar { height: 60px; border-bottom: 1px solid var(--adm-border); background: rgba(13,21,32,.88); backdrop-filter: blur(12px); display: flex; align-items: center; padding: 0 28px; gap: 16px; position: sticky; top: 0; z-index: 40; }
  .adm-content { flex: 1; padding: 28px; }

  /* Sidebar */
  .adm-logo-area { padding: 20px; border-bottom: 1px solid var(--adm-border); }
  .adm-logo { font-size: 22px; font-weight: 700; letter-spacing: -.5px; color: var(--adm-text); }
  .adm-logo span { color: var(--adm-teal); }
  .adm-logo-sub { font-size: 10px; color: var(--adm-muted2); text-transform: uppercase; letter-spacing: .1em; margin-top: 2px; }
  .adm-nav { flex: 1; padding: 10px 0; overflow-y: auto; }
  .adm-nav-label { padding: 14px 20px 6px; font-size: 10px; font-weight: 600; color: var(--adm-muted2); text-transform: uppercase; letter-spacing: .12em; }
  .adm-nav-link { display: flex; align-items: center; gap: 10px; padding: 9px 20px; font-size: 13px; font-weight: 500; color: var(--adm-muted); text-decoration: none; border: none; background: none; width: 100%; text-align: left; cursor: pointer; transition: color .15s, background .15s; position: relative; }
  .adm-nav-link:hover { color: var(--adm-text); background: rgba(255,255,255,.04); }
  .adm-nav-link.active { color: var(--adm-text); background: rgba(37,99,235,.12); }
  .adm-nav-link.active::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: var(--adm-teal); border-radius: 0 2px 2px 0; }
  .adm-sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--adm-border); }
  .adm-user-chip { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .adm-avatar { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,var(--adm-blue),var(--adm-teal-d)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
  .adm-user-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .adm-user-role { font-size: 11px; color: var(--adm-muted2); }

  /* Cards */
  .adm-card { background: var(--adm-navy2); border: 1px solid var(--adm-border); border-radius: 16px; padding: 24px; }
  .adm-stat { background: var(--adm-navy2); border: 1px solid var(--adm-border); border-radius: 14px; padding: 20px 22px; position: relative; overflow: hidden; }
  .adm-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 2px 2px 0 0; }
  .adm-stat.c-blue::before { background: var(--adm-blue); }
  .adm-stat.c-teal::before { background: var(--adm-teal); }
  .adm-stat.c-coral::before { background: var(--adm-coral); }
  .adm-stat.c-gold::before { background: var(--adm-gold); }
  .adm-stat.c-purple::before { background: #8b5cf6; }
  .adm-stat-label { font-size: 11px; font-weight: 600; color: var(--adm-muted2); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .adm-stat-val { font-size: 32px; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; }
  .adm-stat-sub { font-size: 11px; color: var(--adm-muted); margin-top: 6px; }

  /* Badges */
  .adm-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .adm-badge.active { background: rgba(45,212,167,.12); color: #34d399; border: 1px solid rgba(45,212,167,.2); }
  .adm-badge.suspended { background: rgba(232,93,107,.1); color: #f87171; border: 1px solid rgba(232,93,107,.2); }
  .adm-badge.inactive { background: rgba(107,114,128,.1); color: #9ca3af; border: 1px solid rgba(107,114,128,.2); }
  .adm-badge.clinic_owner { background: rgba(37,99,235,.12); color: #60a5fa; border: 1px solid rgba(37,99,235,.2); }
  .adm-badge.clinic_admin { background: rgba(45,212,167,.1); color: #2dd4a7; border: 1px solid rgba(45,212,167,.2); }
  .adm-badge.clinic_staff { background: rgba(107,114,128,.1); color: #9ca3af; border: 1px solid rgba(107,114,128,.2); }

  /* Buttons */
  .adm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; text-decoration: none; transition: all .15s; white-space: nowrap; }
  .adm-btn:disabled { opacity: .55; cursor: not-allowed; }
  .adm-btn.primary { background: var(--adm-blue); color: white; }
  .adm-btn.primary:hover:not(:disabled) { background: var(--adm-blue-l); box-shadow: 0 4px 16px rgba(37,99,235,.35); }
  .adm-btn.ghost { background: rgba(255,255,255,.04); border: 1px solid var(--adm-border-s); color: var(--adm-muted); }
  .adm-btn.ghost:hover:not(:disabled) { color: var(--adm-text); background: rgba(255,255,255,.08); }
  .adm-btn.danger { background: rgba(232,93,107,.1); border: 1px solid rgba(232,93,107,.2); color: #f87171; }
  .adm-btn.danger:hover:not(:disabled) { background: rgba(232,93,107,.2); }
  .adm-btn.teal { background: rgba(45,212,167,.1); border: 1px solid rgba(45,212,167,.2); color: var(--adm-teal); }
  .adm-btn.teal:hover:not(:disabled) { background: rgba(45,212,167,.2); }
  .adm-btn.sm { padding: 6px 11px; font-size: 12px; font-weight: 500; }
  .adm-btn.full { width: 100%; }

  /* Table */
  .adm-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--adm-border); }
  .adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .adm-table th { background: var(--adm-navy3); padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--adm-muted2); text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid var(--adm-border); white-space: nowrap; }
  .adm-table td { padding: 13px 16px; border-bottom: 1px solid var(--adm-border); vertical-align: middle; }
  .adm-table tr:last-child td { border-bottom: none; }
  .adm-table tr:hover td { background: rgba(255,255,255,.02); }

  /* Form */
  .adm-field { margin-bottom: 16px; }
  .adm-label { display: block; font-size: 11px; font-weight: 600; color: var(--adm-muted2); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 7px; }
  .adm-input, .adm-select, .adm-textarea { width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--adm-border-s); border-radius: 8px; padding: 10px 14px; color: var(--adm-text); font-family: inherit; font-size: 13px; outline: none; transition: border-color .2s; }
  .adm-input:focus, .adm-select:focus, .adm-textarea:focus { border-color: var(--adm-blue); }
  .adm-input::placeholder, .adm-textarea::placeholder { color: var(--adm-muted2); }
  .adm-input.err, .adm-select.err { border-color: var(--adm-coral); }
  .adm-select option { background: var(--adm-navy2); color: var(--adm-text); }
  .adm-textarea { resize: vertical; min-height: 80px; }
  .adm-field-err { font-size: 11px; color: #f87171; margin-top: 4px; }
  .adm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* Modal */
  .adm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.72); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .adm-modal { background: var(--adm-navy2); border: 1px solid var(--adm-border-s); border-radius: 20px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; box-shadow: 0 32px 80px rgba(0,0,0,.6); }
  .adm-modal-lg { max-width: 680px; }
  .adm-modal-hdr { padding: 22px 26px 18px; border-bottom: 1px solid var(--adm-border); display: flex; align-items: center; justify-content: space-between; }
  .adm-modal-title { font-size: 18px; font-weight: 600; }
  .adm-modal-body { padding: 22px 26px; }
  .adm-modal-footer { padding: 18px 26px; border-top: 1px solid var(--adm-border); display: flex; justify-content: flex-end; gap: 10px; }
  .adm-close-btn { background: none; border: none; color: var(--adm-muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; transition: color .15s; }
  .adm-close-btn:hover { color: var(--adm-text); }

  /* Misc */
  .adm-page-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .adm-page-title { font-size: 24px; font-weight: 700; letter-spacing: -.5px; }
  .adm-page-sub { font-size: 13px; color: var(--adm-muted); margin-top: 2px; }
  .adm-filters { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .adm-search-wrap { position: relative; flex: 1; min-width: 200px; }
  .adm-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--adm-muted2); pointer-events: none; }
  .adm-search { width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--adm-border-s); border-radius: 8px; padding: 9px 14px 9px 34px; color: var(--adm-text); font-family: inherit; font-size: 13px; outline: none; transition: border-color .2s; }
  .adm-search:focus { border-color: var(--adm-blue); }
  .adm-search::placeholder { color: var(--adm-muted2); }
  .adm-filter-select { background: rgba(255,255,255,.04); border: 1px solid var(--adm-border-s); border-radius: 8px; padding: 9px 12px; color: var(--adm-muted); font-family: inherit; font-size: 12px; outline: none; cursor: pointer; }
  .adm-filter-select option { background: var(--adm-navy2); color: var(--adm-text); }
  .adm-actions { display: flex; align-items: center; gap: 6px; }
  .adm-spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.15); border-top-color: var(--adm-teal); border-radius: 50%; animation: adm-spin .7s linear infinite; flex-shrink: 0; }
  @keyframes adm-spin { to { transform: rotate(360deg); } }
  .adm-loading { display: flex; align-items: center; justify-content: center; padding: 60px 0; gap: 12px; color: var(--adm-muted); font-size: 14px; }
  .adm-empty { text-align: center; padding: 60px 20px; color: var(--adm-muted); }
  .adm-alert { border-radius: 10px; padding: 12px 16px; font-size: 13px; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
  .adm-alert.error { background: rgba(232,93,107,.1); border: 1px solid rgba(232,93,107,.3); color: #f87171; }
  .adm-alert.success { background: rgba(45,212,167,.1); border: 1px solid rgba(45,212,167,.3); color: #34d399; }
  .adm-section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--adm-border); }
  .adm-logout-btn { display: flex; align-items: center; gap: 8px; width: 100%; background: rgba(232,93,107,.08); border: 1px solid rgba(232,93,107,.15); border-radius: 8px; padding: 8px 12px; color: #f87171; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background .15s; }
  .adm-logout-btn:hover { background: rgba(232,93,107,.15); }
  .adm-pagination { display: flex; justify-content: center; align-items: center; gap: 6px; margin-top: 20px; }
  .adm-live-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(45,212,167,.1); border: 1px solid rgba(45,212,167,.2); border-radius: 20px; padding: 4px 10px; font-size: 11px; color: var(--adm-teal); font-weight: 500; }
  .adm-pulse { width: 5px; height: 5px; background: var(--adm-teal); border-radius: 50%; animation: adm-pulse 2s ease-in-out infinite; }
  @keyframes adm-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  /* Login */
  .adm-login-root { min-height: 100vh; background: var(--adm-navy); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; font-family: 'DM Sans','Inter',sans-serif; color: var(--adm-text); }
  .adm-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
  .adm-login-card { background: rgba(17,28,46,.88); backdrop-filter: blur(20px); border: 1px solid var(--adm-border-s); border-radius: 20px; padding: 44px; width: 100%; max-width: 420px; position: relative; z-index: 1; box-shadow: 0 24px 80px rgba(0,0,0,.5); }
  .adm-login-logo { font-size: 28px; font-weight: 700; letter-spacing: -.5px; margin-bottom: 3px; }
  .adm-login-logo span { color: var(--adm-teal); }
  .adm-login-sub { color: var(--adm-muted); font-size: 13px; margin-bottom: 32px; }
  .adm-login-btn { width: 100%; background: var(--adm-blue); border: none; border-radius: 10px; padding: 13px; color: white; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .adm-login-btn:hover:not(:disabled) { background: var(--adm-blue-l); box-shadow: 0 8px 24px rgba(37,99,235,.4); }
  .adm-login-btn:disabled { opacity: .6; cursor: not-allowed; }
  .adm-remember { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 13px; color: var(--adm-muted); cursor: pointer; }
  .adm-remember input { accent-color: var(--adm-teal); width: 15px; height: 15px; }
  .adm-system-badge { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 28px; background: rgba(45,212,167,.1); border: 1px solid rgba(45,212,167,.2); border-radius: 20px; padding: 5px 12px; font-size: 12px; color: var(--adm-teal); font-weight: 500; }
`;

let cssInjected = false;
export function useAdminStyles() {
  useEffect(() => {
    if (cssInjected) return;
    cssInjected = true;
    const el = document.createElement("style");
    el.textContent = ADMIN_CSS;
    document.head.appendChild(el);
  }, []);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  return <span className={`adm-badge ${status}`}>{status.replace("_", " ")}</span>;
}

// ─── Btn ─────────────────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "teal";
  size?: "md" | "sm";
  loading?: boolean;
  full?: boolean;
}

export function Btn({ variant = "ghost", size = "md", loading, full, children, ...rest }: BtnProps) {
  return (
    <button
      className={`adm-btn ${variant}${size === "sm" ? " sm" : ""}${full ? " full" : ""}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="adm-spinner" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  large?: boolean;
}

export function Modal({ open, onClose, title, children, footer, large }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleKey = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);
  if (!open) return null;
  return (
    <div className="adm-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={`adm-modal${large ? " adm-modal-lg" : ""}`}>
        <div className="adm-modal-hdr">
          <span className="adm-modal-title">{title}</span>
          <button className="adm-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="adm-modal-body">{children}</div>
        {footer && <div className="adm-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  type?: "danger" | "warn";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", type = "danger", loading, onConfirm, onCancel }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="adm-overlay" onClick={onCancel}>
      <div className="adm-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal-body" style={{ padding: "30px 26px" }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <p style={{ fontSize: 13, color: "var(--adm-muted)", lineHeight: 1.65 }}>{message}</p>
        </div>
        <div className="adm-modal-footer">
          <Btn variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Btn>
          <Btn variant={type === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} style={{ padding: "9px 20px" }}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({ label, error, children, required }: { label: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <div className="adm-field">
      <label className="adm-label">{label}{required && <span style={{ color: "var(--adm-coral)", marginLeft: 2 }}>*</span>}</label>
      {children}
      {error && <div className="adm-field-err">{error}</div>}
    </div>
  );
}

// ─── Spinner / Empty / Alert ──────────────────────────────────────────────────

export function Spinner({ label }: { label?: string }) {
  return <div className="adm-loading"><span className="adm-spinner" />{label && <span>{label}</span>}</div>;
}

export function Empty({ icon = "📭", message, action }: { icon?: string; message: string; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <p>{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Alert({ type, message }: { type: "error" | "success"; message: string }) {
  return (
    <div className={`adm-alert ${type}`}>
      <span>{type === "error" ? "⚠" : "✓"}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastCtr: HTMLDivElement | null = null;

export function toast(msg: string, type: "success" | "error" = "success", ms = 3500) {
  if (!toastCtr) {
    const style = document.createElement("style");
    style.textContent = ".adm-toasts{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none}.adm-toast{background:#111c2e;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 16px;font-size:13px;color:#eef2f7;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:320px;pointer-events:all;animation:at-in .2s ease}.adm-toast.success{border-left:3px solid #2dd4a7}.adm-toast.error{border-left:3px solid #e85d6b}@keyframes at-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}";
    document.head.appendChild(style);
    toastCtr = document.createElement("div");
    toastCtr.className = "adm-toasts";
    document.body.appendChild(toastCtr);
  }
  const el = document.createElement("div");
  el.className = `adm-toast ${type}`;
  el.innerHTML = `<span>${type === "success" ? "✓" : "✕"}</span><span>${msg}</span>`;
  toastCtr.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
