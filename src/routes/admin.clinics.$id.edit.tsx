import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClinicForm } from "@/components/admin/ClinicForm";

export const Route = createFileRoute("/admin/clinics/$id/edit")({
  component: AdminClinicEditPage,
});

function AdminClinicEditPage() {
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const clinicId = Number(id);

  return (
    <AdminLayout title="Edit Clinic">
      <div className="adm-page-hdr" style={{ marginBottom: 24 }}>
        <div>
          <div className="adm-page-title">Edit Clinic</div>
          <div className="adm-page-sub">Update clinic information</div>
        </div>
        <a href={`/admin/clinics/${clinicId}`} className="adm-btn ghost">← Back</a>
      </div>
      <ClinicForm
        clinicId={clinicId}
        onSuccess={() => navigate({ to: "/admin/clinics/$id", params: { id } })}
        onCancel={() => navigate({ to: "/admin/clinics/$id", params: { id } })}
      />
    </AdminLayout>
  );
}
