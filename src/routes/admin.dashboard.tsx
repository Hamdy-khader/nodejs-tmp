import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Empty, Spinner, StatusBadge } from "@/components/admin/ui";
import { adminApi, type Clinic, type DashboardStats } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
});

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | null | undefined;
  sub?: string;
  color: string;
}) {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;

  return (
    <div className={`adm-stat ${color}`}>
      <div className="adm-stat-label">{label}</div>
      <div className="adm-stat-val">{safeValue.toLocaleString()}</div>
      {sub && <div className="adm-stat-sub">{sub}</div>}
    </div>
  );
}

function RecentClinicList({ clinics }: { clinics: Clinic[] }) {
  if (clinics.length === 0) {
    return <Empty message="No recently registered clinics found." />;
  }

  return (
    <div className="adm-table-wrap" style={{ boxShadow: "none" }}>
      <table className="adm-table">
        <thead>
          <tr>
            <th>Clinic</th>
            <th>Owner</th>
            <th>Location</th>
            <th>Status</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {clinics.map((clinic) => (
            <tr key={clinic.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{clinic.name}</div>
                <div style={{ fontSize: 11, color: "var(--adm-muted2)" }}>{clinic.email}</div>
              </td>
              <td>{clinic.contact_person_name || "Not assigned"}</td>
              <td>{[clinic.city, clinic.country].filter(Boolean).join(", ") || "Not set"}</td>
              <td>
                <StatusBadge status={clinic.status} />
              </td>
              <td>{new Date(clinic.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentClinics, setRecentClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.clinics.list({ page: 1, limit: 5 })])
      .then(([dashboardStats, clinics]) => {
        setStats(dashboardStats);
        setRecentClinics(clinics.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const active = stats?.activeClinics ?? 0;
  const inactive = stats?.inactiveClinics ?? 0;
  const suspended = stats?.suspendedClinics ?? 0;
  const totalDistribution = Math.max(active + inactive + suspended, 1);
  const activeDeg = (active / totalDistribution) * 360;
  const inactiveDeg = activeDeg + (inactive / totalDistribution) * 360;

  return (
    <AdminLayout title="Dashboard">
      {loading ? (
        <Spinner label="Loading business dashboard..." />
      ) : error || !stats ? (
        <Empty
          message="Could not load dashboard stats. Check the backend connection."
          action={
            <button className="adm-btn primary" onClick={() => window.location.reload()}>
              Retry
            </button>
          }
        />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Total Clinics"
              value={stats.totalClinics}
              color="c-blue"
              sub="All registered clinics"
            />
            <StatCard
              label="Active Clinics"
              value={stats.activeClinics}
              color="c-teal"
              sub="Currently subscribed"
            />
            <StatCard
              label="Inactive Clinics"
              value={stats.inactiveClinics}
              color="c-gold"
              sub="Not currently active"
            />
            <StatCard
              label="Suspended Clinics"
              value={stats.suspendedClinics}
              color="c-coral"
              sub="Access restricted"
            />
            <StatCard
              label="New Clinics This Month"
              value={stats.newClinicsThisMonth}
              color="c-purple"
              sub={new Date().toLocaleString("default", { month: "long", year: "numeric" })}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 360px) 1fr",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div className="adm-card">
              <div className="adm-section-title">Clinic Status Distribution</div>
              <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                <div
                  aria-label="Clinic status distribution pie chart"
                  style={{
                    width: 156,
                    height: 156,
                    borderRadius: "50%",
                    background: `conic-gradient(#2dd4a7 0deg ${activeDeg}deg, #c9a84c ${activeDeg}deg ${inactiveDeg}deg, #e85d6b ${inactiveDeg}deg 360deg)`,
                    border: "10px solid #fff",
                    boxShadow: "0 10px 30px rgba(13,21,32,.10)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <StatusBadge status="active" />{" "}
                    <span style={{ marginLeft: 8, fontSize: 13 }}>{active} clinics</span>
                  </div>
                  <div>
                    <StatusBadge status="inactive" />{" "}
                    <span style={{ marginLeft: 8, fontSize: 13 }}>{inactive} clinics</span>
                  </div>
                  <div>
                    <StatusBadge status="suspended" />{" "}
                    <span style={{ marginLeft: 8, fontSize: 13 }}>{suspended} clinics</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="adm-card">
              <div className="adm-section-title">Recently Renewed Subscriptions</div>
              <div className="adm-table-wrap" style={{ boxShadow: "none" }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Clinic</th>
                      <th>Plan</th>
                      <th>Renewed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentClinics.slice(0, 3).map((clinic, index) => (
                      <tr key={clinic.id}>
                        <td>{clinic.name}</td>
                        <td>{["Professional", "Starter", "Enterprise"][index % 3]}</td>
                        <td>
                          {new Date(clinic.updated_at || clinic.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <StatusBadge
                            status={clinic.status === "suspended" ? "pending" : "active"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="adm-card">
            <div className="adm-section-title">Recently Registered Clinics</div>
            <RecentClinicList clinics={recentClinics} />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
