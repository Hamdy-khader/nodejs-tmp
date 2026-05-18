import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClinicForm } from "@/components/admin/ClinicForm";

export const Route = createFileRoute("/admin/clinics/create")({
  component: AdminClinicCreatePage,
});

function AdminClinicCreatePage() {
  const navigate = useNavigate();
  return (
    <AdminLayout title="Add Clinic">
      <div className="adm-page-hdr" style={{ marginBottom: 24 }}>
        <div>
          <div className="adm-page-title">Add New Clinic</div>
          <div className="adm-page-sub">Register a new dental clinic on the platform</div>
        </div>
        <a href="/admin/clinics" className="adm-btn ghost">← Back to clinics</a>
      </div>
      <ClinicForm
        onSuccess={(id) => navigate({ to: "/admin/clinics/$id", params: { id: String(id) } })}
        onCancel={() => navigate({ to: "/admin/clinics" })}
      />
    </AdminLayout>
  );
}
