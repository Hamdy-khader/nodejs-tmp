import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
        <Link to="/admin/clinics" className="adm-btn ghost">← Back to clinics</Link>
      </div>
      <ClinicForm
        onSuccess={(id) => navigate({ to: "/admin/clinics/$id", params: { id: String(id) } })}
        onCancel={() => navigate({ to: "/admin/clinics" })}
      />
    </AdminLayout>
  );
}
