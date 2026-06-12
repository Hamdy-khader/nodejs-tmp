import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAdminStyles } from "./ui";
import { adminApi, adminTokenStore, type AdminUser } from "@/lib/admin/api";

const NAV = [
  { label: "Dashboard", icon: "⬚", to: "/admin/dashboard" },
  { label: "All Clinics", icon: "🏥", to: "/admin/clinics" },
  { label: "Add Clinic", icon: "+", to: "/admin/clinics/create" },
];

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title = "Admin Panel" }: AdminLayoutProps) {
  useAdminStyles();
  const navigate = useNavigate();
  const state = useRouterState();
  const pathname = state.location.pathname;

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!adminTokenStore.exists()) {
      navigate({ to: "/admin/login" });
      return;
    }
    adminApi
      .me()
      .then(setAdmin)
      .catch(() => {
        adminTokenStore.clear();
        navigate({ to: "/admin/login" });
      })
      .finally(() => setChecking(false));
  }, []);

  const handleLogout = async () => {
    await adminApi.logout();
    window.location.href = "/admin/login";
  };

  if (checking) {
    return (
      <div className="adm" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0d1520" }}>
        <span className="adm-spinner" />
      </div>
    );
  }

  const initials = admin?.name
    ? admin.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <div className="adm adm-layout">
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-logo-area">
          <div className="adm-logo">treatly<span>online</span></div>
          <div className="adm-logo-sub">Admin Panel</div>
        </div>

        <nav className="adm-nav">
          <div className="adm-nav-label">Navigation</div>
          {NAV.map((item) => {
            const active =
              item.to === "/admin/dashboard"
                ? pathname === "/admin/dashboard" || pathname === "/admin"
                : pathname === item.to || (item.to !== "/admin/clinics/create" && pathname.startsWith(item.to + "/"));
            return (
              <Link
                key={item.to}
                to={item.to as "/admin/dashboard"}
                className={`adm-nav-link${active ? " active" : ""}`}
              >
                <span style={{ fontSize: 14, opacity: 0.8, width: 16, textAlign: "center" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="adm-sidebar-footer">
          {admin && (
            <div className="adm-user-chip">
              <div className="adm-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="adm-user-name">{admin.name}</div>
                <div className="adm-user-role">Super Admin</div>
              </div>
            </div>
          )}
          <button className="adm-logout-btn" onClick={handleLogout}>
            ↩ Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        <header className="adm-topbar">
          <div style={{ flex: 1, fontSize: 18, fontWeight: 600 }}>{title}</div>
          <div className="adm-live-badge">
            <span className="adm-pulse" />
            Live
          </div>
        </header>
        <div className="adm-content">{children}</div>
      </main>
    </div>
  );
}
