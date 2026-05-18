import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Spinner, Empty } from "@/components/admin/ui";
import { adminApi, type DashboardStats } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`adm-stat ${color}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-val">{value.toLocaleString()}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <Spinner label="Loading stats…" />
      ) : error || !stats ? (
        <Empty
          icon="📊"
          message="Could not load dashboard stats. Check the backend connection."
          action={
            <button className="adm-btn primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          }
        />
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Clinics"       value={stats.totalClinics}         color="c-blue"   sub="All time" />
            <StatCard label="Active Clinics"       value={stats.activeClinics}        color="c-teal"   sub="Running now" />
            <StatCard label="Suspended"            value={stats.suspendedClinics}     color="c-coral"  sub="Access blocked" />
            <StatCard label="Clinic Users"         value={stats.totalClinicUsers}     color="c-purple" sub="All users" />
            <StatCard
              label="New This Month"
              value={stats.newClinicsThisMonth}
              color="c-gold"
              sub={new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            />
          </div>

          {/* Quick actions */}
          <div className="adm-card">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--adm-muted)", marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: "flex", gap: 10 }}>
              <a href="/admin/clinics/create" className="adm-btn primary">
                + Add Clinic
              </a>
              <a href="/admin/clinics" className="adm-btn ghost">
                View all clinics →
              </a>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
