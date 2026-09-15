import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClinicUsersPanel } from "@/components/admin/ClinicUsersPanel";

export const Route = createFileRoute("/admin/clinics/$id/users")({
  component: AdminClinicUsersPage,
});

function AdminClinicUsersPage() {
  const { id } = Route.useParams();
  return (
    <AdminLayout title="Clinic Users">
      <a href={`/admin/clinics/${id}`} className="adm-btn ghost sm">← Back to clinic</a>
      <ClinicUsersPanel key={id} clinicId={Number(id)} />
    </AdminLayout>
  );
}
