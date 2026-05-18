import { useState, useEffect } from "react";
import { Field, Btn, Alert, toast } from "./ui";
import { adminApi, type Clinic, ApiError } from "@/lib/admin/api";

interface ClinicFormProps {
  clinicId?: number;
  onSuccess: (id: number) => void;
  onCancel: () => void;
}

interface FormState {
  name: string; email: string; phone: string; country: string; city: string;
  address: string; website_url: string; contact_person_name: string;
  contact_person_phone: string; status: string; notes: string;
}

interface FirstUserState {
  full_name: string; email: string; phone: string; password: string;
  confirm_password: string; role: string; status: string;
}

const EMPTY_FORM: FormState = {
  name: "", email: "", phone: "", country: "", city: "", address: "",
  website_url: "", contact_person_name: "", contact_person_phone: "",
  status: "active", notes: "",
};

const EMPTY_USER: FirstUserState = {
  full_name: "", email: "", phone: "", password: "",
  confirm_password: "", role: "clinic_owner", status: "active",
};

export function ClinicForm({ clinicId, onSuccess, onCancel }: ClinicFormProps) {
  const isEdit = Boolean(clinicId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [firstUser, setFirstUser] = useState<FirstUserState>(EMPTY_USER);
  const [addUser, setAddUser] = useState(!isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setU = (k: keyof FirstUserState, v: string) => setFirstUser((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!clinicId) return;
    adminApi.clinics
      .get(clinicId)
      .then((c: Clinic) => {
        setForm({
          name: c.name, email: c.email, phone: c.phone ?? "", country: c.country ?? "",
          city: c.city ?? "", address: c.address ?? "", website_url: c.website_url ?? "",
          contact_person_name: c.contact_person_name ?? "", contact_person_phone: c.contact_person_phone ?? "",
          status: c.status, notes: c.notes ?? "",
        });
      })
      .catch(() => toast("Failed to load clinic data", "error"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Clinic name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (form.website_url && !/^https?:\/\//.test(form.website_url)) errs.website_url = "Must start with http:// or https://";
    if (addUser && !isEdit && firstUser.email) {
      if (!firstUser.full_name.trim()) errs["user.full_name"] = "Name is required";
      if (!firstUser.password) errs["user.password"] = "Password is required";
      if (firstUser.password && firstUser.password !== firstUser.confirm_password) errs["user.confirm_password"] = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;

    setSaving(true);
    try {
      let clinic: Clinic;
      const payload: Record<string, unknown> = { ...form };

      if (isEdit) {
        clinic = await adminApi.clinics.update(clinicId!, payload);
        toast("Clinic updated successfully");
      } else {
        clinic = await adminApi.clinics.create(payload);
        // Create first user if email provided
        if (addUser && firstUser.email.trim()) {
          try {
            await adminApi.clinicUsers.create(clinic.id, {
              full_name: firstUser.full_name,
              email: firstUser.email,
              phone: firstUser.phone || undefined,
              password: firstUser.password,
              confirm_password: firstUser.confirm_password,
              role: firstUser.role,
              status: firstUser.status,
            });
            toast("Clinic and first user created");
          } catch {
            toast("Clinic created but user creation failed", "error");
          }
        } else {
          toast("Clinic created successfully");
        }
      }
      onSuccess(clinic.id);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const flat: Record<string, string> = {};
        Object.entries(err.errors).forEach(([k, v]) => { flat[k] = v[0]; });
        setErrors(flat);
        setGlobalError("Please fix the errors below.");
      } else if (err instanceof ApiError) {
        setGlobalError(err.message);
      } else {
        setGlobalError("An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-loading"><span className="adm-spinner" /><span>Loading clinic…</span></div>;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {globalError && <Alert type="error" message={globalError} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Basic Info */}
          <div className="adm-card">
            <div className="adm-section-title">Basic Information</div>
            <div className="adm-form-grid">
              <Field label="Clinic Name" required error={errors.name}>
                <input className={`adm-input${errors.name ? " err" : ""}`} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Bright Smile Dental" />
              </Field>
              <Field label="Email" required error={errors.email}>
                <input className={`adm-input${errors.email ? " err" : ""}`} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@clinic.com" />
              </Field>
              <Field label="Phone">
                <input className="adm-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Website" error={errors.website_url}>
                <input className={`adm-input${errors.website_url ? " err" : ""}`} value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://clinic.com" />
              </Field>
              <Field label="Country">
                <input className="adm-input" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Turkey" />
              </Field>
              <Field label="City">
                <input className="adm-input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Istanbul" />
              </Field>
            </div>
            <Field label="Address">
              <textarea className="adm-textarea" style={{ height: 70 }} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Full street address…" />
            </Field>
            <div className="adm-form-grid">
              <Field label="Contact Person">
                <input className="adm-input" value={form.contact_person_name} onChange={(e) => set("contact_person_name", e.target.value)} placeholder="Dr. John Smith" />
              </Field>
              <Field label="Contact Phone">
                <input className="adm-input" value={form.contact_person_phone} onChange={(e) => set("contact_person_phone", e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="adm-textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Internal notes about this clinic…" />
            </Field>
          </div>

          {/* First User (create only) */}
          {!isEdit && (
            <div className="adm-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div className="adm-section-title" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>First Clinic User</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--adm-muted)", cursor: "pointer" }}>
                  <input type="checkbox" checked={addUser} onChange={(e) => setAddUser(e.target.checked)} style={{ accentColor: "var(--adm-teal)" }} />
                  Add first user
                </label>
              </div>
              {addUser && (
                <>
                  <div className="adm-form-grid">
                    <Field label="Full Name" error={errors["user.full_name"]}>
                      <input className={`adm-input${errors["user.full_name"] ? " err" : ""}`} value={firstUser.full_name} onChange={(e) => setU("full_name", e.target.value)} placeholder="Dr. Owner Name" />
                    </Field>
                    <Field label="Email">
                      <input className="adm-input" type="email" value={firstUser.email} onChange={(e) => setU("email", e.target.value)} placeholder="owner@clinic.com" />
                    </Field>
                    <Field label="Phone">
                      <input className="adm-input" value={firstUser.phone} onChange={(e) => setU("phone", e.target.value)} />
                    </Field>
                    <Field label="Role">
                      <select className="adm-select" value={firstUser.role} onChange={(e) => setU("role", e.target.value)}>
                        <option value="clinic_owner">Clinic Owner</option>
                        <option value="clinic_admin">Clinic Admin</option>
                        <option value="clinic_staff">Clinic Staff</option>
                      </select>
                    </Field>
                    <Field label="Password" error={errors["user.password"]}>
                      <input className={`adm-input${errors["user.password"] ? " err" : ""}`} type="password" value={firstUser.password} onChange={(e) => setU("password", e.target.value)} />
                    </Field>
                    <Field label="Confirm Password" error={errors["user.confirm_password"]}>
                      <input className={`adm-input${errors["user.confirm_password"] ? " err" : ""}`} type="password" value={firstUser.confirm_password} onChange={(e) => setU("confirm_password", e.target.value)} />
                    </Field>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="adm-card">
            <div className="adm-section-title">Clinic Status</div>
            <Field label="Status">
              <select className="adm-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </Field>
            <div style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 6, lineHeight: 1.6 }}>
              {form.status === "suspended"
                ? "⛔ Clinic users will not be able to login when suspended."
                : "✓ Clinic users can login and access the dashboard."}
            </div>
          </div>

          <div className="adm-card" style={{ padding: 16 }}>
            <Btn variant="primary" type="submit" loading={saving} full style={{ padding: "12px" }}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create clinic"}
            </Btn>
            <Btn variant="ghost" type="button" onClick={onCancel} full style={{ padding: "10px", marginTop: 10 }}>
              Cancel
            </Btn>
          </div>
        </div>
      </div>
    </form>
  );
}
