import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Btn, ConfirmDialog, Empty, Spinner, StatusBadge, toast } from "@/components/admin/ui";
import { adminApi, type Clinic } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/clinics/")({
  component: AdminClinicsPage,
});

function subscriptionStatusFor(clinic: Clinic) {
  if (clinic.status === "suspended") return "cancelled";
  if (clinic.status === "trial") return "pending";
  if (clinic.status === "inactive") return "expired";
  return "active";
}

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
      .then((res) => {
        setClinics(res.data);
        setTotal(res.meta.total);
      })
      .catch(() => toast("Failed to load clinics", "error"))
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const doSuspend = async () => {
    if (!suspendTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.suspend(suspendTarget.id);
      toast(`"${suspendTarget.name}" suspended`);
      setSuspendTarget(null);
      load();
    } catch {
      toast("Failed to suspend clinic", "error");
    } finally {
      setActing(false);
    }
  };

  const doActivate = async () => {
    if (!activateTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.activate(activateTarget.id);
      toast(`"${activateTarget.name}" activated`);
      setActivateTarget(null);
      load();
    } catch {
      toast("Failed to activate clinic", "error");
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setActing(true);
    try {
      await adminApi.clinics.delete(deleteTarget.id);
      toast(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      load();
    } catch {
      toast("Failed to delete clinic", "error");
    } finally {
      setActing(false);
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <AdminLayout title="Clinics">
      <div className="adm-page-hdr">
        <div>
          <div className="adm-page-title">Clinics Management</div>
          <div className="adm-page-sub">{total} clinics registered</div>
        </div>
        <a href="/admin/clinics/create" className="adm-btn primary">
          + Add Clinic
        </a>
      </div>

      <div className="adm-filters">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">S</span>
          <input
            className="adm-search"
            placeholder="Search by clinic name, owner, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="adm-filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading clinics..." />
      ) : clinics.length === 0 ? (
        <Empty
          message="No clinics found."
          action={
            <a href="/admin/clinics/create" className="adm-btn primary">
              Add first clinic
            </a>
          }
        />
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clinic Name</th>
                  <th>Owner Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Country</th>
                  <th>City</th>
                  <th>Registration Date</th>
                  <th>Clinic Status</th>
                  <th>Subscription Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((clinic) => (
                  <tr key={clinic.id}>
                    <td style={{ fontWeight: 600 }}>{clinic.name}</td>
                    <td>{clinic.contact_person_name || "Not assigned"}</td>
                    <td>{clinic.email}</td>
                    <td>{clinic.phone || "Not set"}</td>
                    <td>{clinic.country || "Not set"}</td>
                    <td>{clinic.city || "Not set"}</td>
                    <td>{new Date(clinic.created_at).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={clinic.status} />
                    </td>
                    <td>
                      <StatusBadge status={subscriptionStatusFor(clinic)} />
                    </td>
                    <td>
                      <div className="adm-actions">
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/admin/clinics/$id",
                              params: { id: String(clinic.id) },
                            })
                          }
                        >
                          View
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/admin/clinics/$id/edit",
                              params: { id: String(clinic.id) },
                            })
                          }
                        >
                          Edit
                        </Btn>
                        {clinic.status === "active" ? (
                          <Btn variant="danger" size="sm" onClick={() => setSuspendTarget(clinic)}>
                            Suspend
                          </Btn>
                        ) : (
                          <Btn variant="teal" size="sm" onClick={() => setActivateTarget(clinic)}>
                            Activate
                          </Btn>
                        )}
                        <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(clinic)}>
                          Delete
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adm-pagination">
              <Btn
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Btn>
              {Array.from({ length: totalPages }, (_, i) => (
                <Btn
                  key={i}
                  variant={page === i + 1 ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </Btn>
              ))}
              <Btn
                variant="ghost"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Btn>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title="Suspend Clinic"
        message={`Suspend "${suspendTarget?.name}"? The clinic account will lose access immediately.`}
        confirmLabel="Suspend"
        type="danger"
        loading={acting}
        onConfirm={doSuspend}
        onCancel={() => setSuspendTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate Clinic"
        message={`Activate "${activateTarget?.name}"? The clinic account will regain access.`}
        confirmLabel="Activate"
        type="warn"
        loading={acting}
        onConfirm={doActivate}
        onCancel={() => setActivateTarget(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Clinic"
        message={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete permanently"
        type="danger"
        loading={acting}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
