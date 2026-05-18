import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatusBadge, Btn, Modal, Field, ConfirmDialog, Spinner, Empty, Alert, toast } from "@/components/admin/ui";
import { adminApi, type ClinicUser, type Clinic, ApiError } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/clinics/$id/users")({
  component: AdminClinicUsersPage,
});

interface UserFormState {
  full_name: string; email: string; phone: string;
  password: string; confirm_password: string;
  role: string; status: string;
}

const EMPTY_USER_FORM: UserFormState = {
  full_name: "", email: "", phone: "", password: "", confirm_password: "",
  role: "clinic_staff", status: "active",
};

function AdminClinicUsersPage() {
  const { id } = Route.useParams();
  const clinicId = Number(id);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal state
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editUser, setEditUser] = useState<ClinicUser | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ClinicUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setF = (k: keyof UserFormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Load clinic info
  useEffect(() => {
    adminApi.clinics.get(clinicId).then(setClinic).catch(() => null);
  }, [clinicId]);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.clinicUsers
      .list(clinicId, { q: search || undefined, page, limit: 20 })
      .then((res) => { setUsers(res.data); setTotal(res.meta.total); })
      .catch(() => toast("Failed to load users", "error"))
      .finally(() => setLoading(false));
  }, [clinicId, search, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const openAdd = () => {
    setEditUser(null);
    setForm(EMPTY_USER_FORM);
    setFormErrors({});
    setFormError("");
    setModal("add");
  };

  const openEdit = (u: ClinicUser) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, phone: u.phone ?? "", password: "", confirm_password: "", role: u.role, status: u.status });
    setFormErrors({});
    setFormError("");
    setModal("edit");
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!editUser && !form.password) errs.password = "Password is required";
    if (form.password && form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match";
    if (form.password && form.password.length < 8) errs.password = "Password must be at least 8 characters";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    setFormError("");
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name, email: form.email,
        phone: form.phone || undefined, role: form.role, status: form.status,
      };
      if (form.password) {
        payload.password = form.password;
        payload.confirm_password = form.confirm_password;
      }

      if (editUser) {
        await adminApi.clinicUsers.update(editUser.id, payload);
        toast("User updated");
      } else {
        await adminApi.clinicUsers.create(clinicId, { ...payload, password: form.password, confirm_password: form.confirm_password });
        toast("User added");
      }
      setModal(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const flat: Record<string, string> = {};
        Object.entries(err.errors).forEach(([k, v]) => { flat[k] = v[0]; });
        setFormErrors(flat);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      }
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (u: ClinicUser) => {
    try {
      if (u.status === "active") await adminApi.clinicUsers.deactivate(u.id);
      else await adminApi.clinicUsers.activate(u.id);
      toast(`User ${u.status === "active" ? "deactivated" : "activated"}`);
      load();
    } catch { toast("Failed to update status", "error"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.clinicUsers.delete(deleteTarget.id);
      toast("User deleted");
      setDeleteTarget(null);
      load();
    } catch { toast("Failed to delete user", "error"); }
    finally { setDeleting(false); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout title={clinic ? `${clinic.name} — Users` : "Clinic Users"}>
      <div className="adm-page-hdr">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href={`/admin/clinics/${clinicId}`} className="adm-btn ghost sm">← Back</a>
            <div className="adm-page-title">{clinic?.name ?? "Clinic"} — Users</div>
          </div>
          <div className="adm-page-sub">{total} users in this clinic</div>
        </div>
        <Btn variant="primary" onClick={openAdd}>+ Add User</Btn>
      </div>

      {/* Search */}
      <div className="adm-filters">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">🔍</span>
          <input className="adm-search" placeholder="Search by name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner label="Loading users…" />
      ) : users.length === 0 ? (
        <Empty icon="👤" message="No users found." action={<Btn variant="primary" onClick={openAdd}>Add first user</Btn>} />
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: "var(--adm-muted2)" }}>{u.email}</div>
                      {u.phone && <div style={{ fontSize: 11, color: "var(--adm-muted2)" }}>{u.phone}</div>}
                    </td>
                    <td><StatusBadge status={u.role} /></td>
                    <td><StatusBadge status={u.status} /></td>
                    <td style={{ fontSize: 11, color: "var(--adm-muted2)" }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--adm-muted2)" }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <Btn variant="ghost" size="sm" onClick={() => openEdit(u)}>Edit</Btn>
                        <Btn variant={u.status === "active" ? "danger" : "teal"} size="sm" onClick={() => handleToggleStatus(u)}>
                          {u.status === "active" ? "Deactivate" : "Activate"}
                        </Btn>
                        <Btn variant="danger" size="sm" onClick={() => setDeleteTarget(u)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {/* Add/Edit Modal */}
      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === "add" ? "Add Clinic User" : "Edit User"}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} loading={saving}>
              {modal === "add" ? "Add user" : "Save changes"}
            </Btn>
          </>
        }
      >
        {formError && <Alert type="error" message={formError} />}

        <div className="adm-form-grid">
          <Field label="Full Name" required error={formErrors.full_name}>
            <input className={`adm-input${formErrors.full_name ? " err" : ""}`} value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} />
          </Field>
          <Field label="Email" required error={formErrors.email}>
            <input className={`adm-input${formErrors.email ? " err" : ""}`} type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="adm-input" value={form.phone} onChange={(e) => setF("phone", e.target.value)} />
          </Field>
          <Field label="Role">
            <select className="adm-select" value={form.role} onChange={(e) => setF("role", e.target.value)}>
              <option value="clinic_owner">Clinic Owner</option>
              <option value="clinic_admin">Clinic Admin</option>
              <option value="clinic_staff">Clinic Staff</option>
            </select>
          </Field>
          <Field label={editUser ? "Password (leave blank to keep)" : "Password"} error={formErrors.password}>
            <input className={`adm-input${formErrors.password ? " err" : ""}`} type="password" value={form.password} onChange={(e) => setF("password", e.target.value)} />
          </Field>
          <Field label="Confirm Password" error={formErrors.confirm_password}>
            <input className={`adm-input${formErrors.confirm_password ? " err" : ""}`} type="password" value={form.confirm_password} onChange={(e) => setF("confirm_password", e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <select className="adm-select" value={form.status} onChange={(e) => setF("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User"
        message={`Delete "${deleteTarget?.full_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
