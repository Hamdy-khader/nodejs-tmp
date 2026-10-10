import { ClinicUsersPanel } from "@/components/admin/ClinicUsersPanel";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
        <Link to="/admin/clinics/$id" params={{ id: String(clinicId) }} className="adm-btn ghost">← Back</Link>
      </div>
      <ClinicForm
        clinicId={clinicId}
        onSuccess={() => navigate({ to: "/admin/clinics/$id", params: { id } })}
        onCancel={() => navigate({ to: "/admin/clinics/$id", params: { id } })}
      />
      <ClinicUsersPanel key={id} clinicId={clinicId} />
    </AdminLayout>
  );
}
