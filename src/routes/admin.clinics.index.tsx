import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge, Btn, ConfirmDialog, Spinner, Empty, toast } from "@/components/admin/ui";
import { adminApi, type Clinic } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/clinics/")({
  component: AdminClinicsPage,
});

function AdminClinicsPage() {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [suspendTarget, setSuspendTarget] = useState<Clinic | null>(null);
  const [activateTarget, setActivateTarget] = useState<Clinic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.clinics
      .list({ q: search || undefined, status: statusFilter || undefined, page, limit: 15 })
      .then((res) => { setClinics(res.data); setTotal(res.meta.total); })
      .catch(() => toast("Failed to load clinics", "error"))
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const doSuspend = async () => {
    if (!suspendTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.suspend(suspendTarget.id);
      toast(`"${suspendTarget.name}" suspended`);
      setSuspendTarget(null);
      load();
    } catch { toast("Failed to suspend clinic", "error"); }
    finally { setActing(false); }
  };

  const doActivate = async () => {
    if (!activateTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.activate(activateTarget.id);
      toast(`"${activateTarget.name}" activated`);
      setActivateTarget(null);
      load();
    } catch { toast("Failed to activate clinic", "error"); }
    finally { setActing(false); }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.delete(deleteTarget.id);
      toast(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      load();
    } catch { toast("Failed to delete clinic", "error"); }
    finally { setActing(false); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <AdminLayout title="Clinics">
      <div className="adm-page-hdr">
        <div>
          <div className="adm-page-title">All Clinics</div>
          <div className="adm-page-sub">{total} clinics registered</div>
        </div>
        <a href="/admin/clinics/create" className="adm-btn primary">+ Add Clinic</a>
      </div>

      {/* Filters */}
      <div className="adm-filters">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">🔍</span>
          <input
            className="adm-search"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="adm-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner label="Loading clinics…" />
      ) : clinics.length === 0 ? (
        <Empty
          icon="🏥"
          message="No clinics found."
          action={<a href="/admin/clinics/create" className="adm-btn primary">Add first clinic</a>}
        />
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#1a9e7e)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 13, color: "white", flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "var(--adm-muted2)" }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                      {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                      {c.contact_person_name || c.phone || "—"}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--adm-muted2)", fontVariantNumeric: "tabular-nums" }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <Btn variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/clinics/$id", params: { id: String(c.id) } })}>View</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/clinics/$id/edit", params: { id: String(c.id) } })}>Edit</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => navigate({ to: "/admin/clinics/$id/users", params: { id: String(c.id) } })}>Users</Btn>
                        {c.status === "active"
                          ? <Btn variant="danger" size="sm" onClick={() => setSuspendTarget(c)}>Suspend</Btn>
                          : <Btn variant="teal" size="sm" onClick={() => setActivateTarget(c)}>Activate</Btn>}
                        <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(c)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="adm-pagination">
              <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</Btn>
              {Array.from({ length: totalPages }, (_, i) => (
                <Btn key={i} variant={page === i + 1 ? "primary" : "ghost"} size="sm" onClick={() => setPage(i + 1)}>{i + 1}</Btn>
              ))}
              <Btn variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Btn>
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={Boolean(suspendTarget)} title="Suspend Clinic" message={`Suspend "${suspendTarget?.name}"? Users will lose access immediately.`} confirmLabel="Suspend" type="danger" loading={acting} onConfirm={doSuspend} onCancel={() => setSuspendTarget(null)} />
      <ConfirmDialog open={Boolean(activateTarget)} title="Activate Clinic" message={`Activate "${activateTarget?.name}"? Users will regain access.`} confirmLabel="Activate" type="warn" loading={acting} onConfirm={doActivate} onCancel={() => setActivateTarget(null)} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete Clinic" message={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete permanently" type="danger" loading={acting} onConfirm={doDelete} onCancel={() => setDeleteTarget(null)} />
    </AdminLayout>
  );
}
