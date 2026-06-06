import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAdminStyles, Alert } from "@/components/admin/ui";
import { clinicApi, clinicTokenStore, ApiError } from "@/lib/admin/api";

export const Route = createFileRoute("/clinic/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: ClinicLoginPage,
});

function cleanClinicRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value === "/clinic/login" || value === "/admin/login") return "/";
  if (value.startsWith("/admin")) return "/";
  return value;
}

function ClinicLoginPage() {
  useAdminStyles();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = cleanClinicRedirect(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (clinicTokenStore.exists()) navigate({ to: redirectTo });
  }, [navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    if (!password) errs.password = "Password is required";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setLoading(true);
    try {
      await clinicApi.login(email.trim(), password);
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CLINIC_SUSPENDED") {
          setError("⛔ Access to this clinic is currently suspended. Please contact your administrator.");
        } else if (err.code === "ACCOUNT_INACTIVE") {
          setError("Your account has been deactivated. Contact your clinic administrator.");
        } else if (err.errors) {
          const flat: Record<string, string> = {};
          Object.entries(err.errors).forEach(([k, v]) => { flat[k] = v[0]; });
          setFieldErrors(flat);
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to connect. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm adm-login-root">
      <div className="adm-orb" style={{ width: 500, height: 500, background: "rgba(45,212,167,.1)", top: -120, right: -150 }} />
      <div className="adm-orb" style={{ width: 400, height: 400, background: "rgba(37,99,235,.07)", bottom: -100, left: -80 }} />

      <div className="adm-login-card">
        <div className="adm-system-badge" style={{ background: "rgba(37,99,235,.1)", borderColor: "rgba(37,99,235,.25)", color: "var(--adm-blue-l)" }}>
          🦷 Clinic Portal
        </div>

        <div className="adm-login-logo">Bright<span>Plans</span></div>
        <p className="adm-login-sub">Sign in to your clinic dashboard</p>

        {error && (
          <div className="adm-alert error" style={{ marginBottom: 20, whiteSpace: "pre-line" }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="adm-field">
            <label className="adm-label">Email address</label>
            <input
              className={`adm-input${fieldErrors.email ? " err" : ""}`}
              type="email"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              autoComplete="email"
              autoFocus
            />
            {fieldErrors.email && <div className="adm-field-err">{fieldErrors.email}</div>}
          </div>

          <div className="adm-field" style={{ marginBottom: 28 }}>
            <label className="adm-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                className={`adm-input${fieldErrors.password ? " err" : ""}`}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--adm-muted2)",
                  display: "flex",
                  alignItems: "center",
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <div className="adm-field-err">{fieldErrors.password}</div>}
          </div>

          <button className="adm-login-btn" type="submit" disabled={loading} style={{ background: "var(--adm-teal-d)" }}>
            {loading && <span className="adm-spinner" style={{ width: 16, height: 16, borderTopColor: "white" }} />}
            {loading ? "Signing in…" : "Sign in to Clinic"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--adm-muted2)" }}>
          <a href="/admin/login" style={{ color: "var(--adm-muted2)", textDecoration: "none" }}>Admin login →</a>
        </div>
      </div>
    </div>
  );
}
