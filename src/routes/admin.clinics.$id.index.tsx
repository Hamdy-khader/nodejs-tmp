import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Btn, ConfirmDialog, Empty, Spinner, StatusBadge, toast } from "@/components/admin/ui";
import { adminApi, type Clinic } from "@/lib/admin/api";

export const Route = createFileRoute("/admin/clinics/$id/")({
  component: AdminClinicDetailPage,
});

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: "1px solid var(--adm-border)",
        fontSize: 13,
        gap: 16,
      }}
    >
      <span style={{ color: "var(--adm-muted)" }}>{label}</span>
      <span style={{ color: "var(--adm-text)", textAlign: "right", maxWidth: "60%" }}>
        {value || "Not set"}
      </span>
    </div>
  );
}

function subscriptionStatusFor(clinic: Clinic) {
  if (clinic.status === "suspended") return "cancelled";
  if (clinic.status === "trial") return "pending";
  if (clinic.status === "inactive") return "expired";
  return "active";
}

function AdminClinicDetailPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const clinicId = Number(id);

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<"delete" | "suspend" | "activate" | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.clinics
      .get(clinicId)
      .then(setClinic)
      .catch(() => toast("Failed to load clinic", "error"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const doAction = async () => {
    if (!clinic || !confirm) return;
    setActing(true);
    try {
      if (confirm === "delete") {
        await adminApi.clinics.delete(clinic.id);
        toast(`"${clinic.name}" deleted`);
        navigate({ to: "/admin/clinics" });
        return;
      }
      if (confirm === "suspend") await adminApi.clinics.suspend(clinic.id);
      else await adminApi.clinics.activate(clinic.id);
      toast(`Clinic ${confirm === "suspend" ? "suspended" : "activated"}`);
      setConfirm(null);
      load();
    } catch {
      toast("Action failed", "error");
    } finally {
      setActing(false);
    }
  };

  if (loading)
    return (
      <AdminLayout title="Loading">
        <Spinner />
      </AdminLayout>
    );
  if (!clinic)
    return (
      <AdminLayout title="Not found">
        <Empty message="Clinic not found." />
      </AdminLayout>
    );

  return (
    <AdminLayout title={clinic.name}>
      <div className="adm-page-hdr">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/admin/clinics" className="adm-btn ghost sm">
            Back
          </a>
          <div>
            <div
              className="adm-page-title"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {clinic.name}
              <StatusBadge status={clinic.status} />
            </div>
            <div className="adm-page-sub">
              Business profile only. Patient records and clinic internal data are not shown.
            </div>
          </div>
        </div>
        <div className="adm-actions">
          <a href={`/admin/clinics/${clinicId}/edit`} className="adm-btn primary sm">
            Edit
          </a>
          {clinic.status === "active" ? (
            <Btn variant="danger" size="sm" onClick={() => setConfirm("suspend")}>
              Suspend
            </Btn>
          ) : (
            <Btn variant="teal" size="sm" onClick={() => setConfirm("activate")}>
              Activate
            </Btn>
          )}
          <Btn variant="danger" size="sm" onClick={() => setConfirm("delete")}>
            Delete
          </Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="adm-card">
          <div className="adm-section-title">Clinic Information</div>
          <InfoRow label="Clinic Name" value={clinic.name} />
          <InfoRow label="Owner Name" value={clinic.contact_person_name} />
          <InfoRow label="Email" value={clinic.email} />
          <InfoRow label="Phone Number" value={clinic.phone} />
          <InfoRow label="Country" value={clinic.country} />
          <InfoRow label="City" value={clinic.city} />
          <InfoRow
            label="Registration Date"
            value={new Date(clinic.created_at).toLocaleDateString()}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="adm-card">
            <div className="adm-section-title">Subscription</div>
            <InfoRow label="Subscription Plan" value="Professional" />
            <InfoRow label="Billing" value="Yearly" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "9px 0",
                borderBottom: "1px solid var(--adm-border)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--adm-muted)" }}>Subscription Status</span>
              <StatusBadge status={subscriptionStatusFor(clinic)} />
            </div>
          </div>
          <div className="adm-card">
            <div className="adm-section-title">Company Contact</div>
            <InfoRow label="Contact Phone" value={clinic.contact_person_phone} />
            <InfoRow label="Website" value={clinic.website_url} />
            <InfoRow label="Address" value={clinic.address} />
          </div>
          {clinic.notes && (
            <div className="adm-card">
              <div className="adm-section-title">Business Notes</div>
              <p style={{ fontSize: 13, color: "var(--adm-muted)", lineHeight: 1.65 }}>
                {clinic.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete Clinic"
        message={`Permanently delete "${clinic.name}"? This cannot be undone.`}
        confirmLabel="Delete permanently"
        type="danger"
        loading={acting}
        onConfirm={doAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "suspend"}
        title="Suspend Clinic"
        message={`Suspend "${clinic.name}"? The clinic account will lose access immediately.`}
        confirmLabel="Suspend"
        type="danger"
        loading={acting}
        onConfirm={doAction}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "activate"}
        title="Activate Clinic"
        message={`Activate "${clinic.name}"? The clinic account will regain access.`}
        confirmLabel="Activate"
        type="warn"
        loading={acting}
        onConfirm={doAction}
        onCancel={() => setConfirm(null)}
      />
    </AdminLayout>
  );
}
