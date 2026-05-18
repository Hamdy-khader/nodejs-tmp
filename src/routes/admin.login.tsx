import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAdminStyles, Alert } from "@/components/admin/ui";
import { adminApi, adminTokenStore, ApiError } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  useAdminStyles();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (adminTokenStore.exists()) navigate({ to: "/admin/dashboard" });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    try {
      await adminApi.login(email.trim(), password);
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          const flat: Record<string, string> = {};
          Object.entries(err.errors).forEach(([k, v]) => { flat[k] = v[0]; });
          setFieldErrors(flat);
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to connect to the server. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm adm-login-root">
      {/* Background orbs */}
      <div className="adm-orb" style={{ width: 500, height: 500, background: "rgba(37,99,235,.12)", top: -120, left: -150 }} />
      <div className="adm-orb" style={{ width: 400, height: 400, background: "rgba(45,212,167,.08)", bottom: -100, right: -80 }} />

      <div className="adm-login-card">
        <div className="adm-system-badge">
          <span className="adm-pulse" />
          Admin System
        </div>

        <div className="adm-login-logo">Bright<span>Plans</span></div>
        <p className="adm-login-sub">Sign in to manage the platform</p>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} noValidate>
          <div className="adm-field">
            <label className="adm-label">Email address</label>
            <input
              className={`adm-input${fieldErrors.email ? " err" : ""}`}
              type="email"
              placeholder="admin@brightplans.io"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
            {fieldErrors.email && <div className="adm-field-err">{fieldErrors.email}</div>}
          </div>

          <div className="adm-field" style={{ marginBottom: 20 }}>
            <label className="adm-label">Password</label>
            <input
              className={`adm-input${fieldErrors.password ? " err" : ""}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoComplete="current-password"
            />
            {fieldErrors.password && <div className="adm-field-err">{fieldErrors.password}</div>}
          </div>

          <label className="adm-remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me for 30 days
          </label>

          <button className="adm-login-btn" type="submit" disabled={loading}>
            {loading && <span className="adm-spinner" style={{ width: 16, height: 16, borderTopColor: "white" }} />}
            {loading ? "Signing in…" : "Sign in to Admin Panel"}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: "1px solid var(--adm-border)", paddingTop: 18, textAlign: "center", fontSize: 12, color: "var(--adm-muted2)" }}>
          BrightPlans Admin · Authorized access only
        </div>
      </div>
    </div>
  );
}
