import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ClinicUsersPanel } from "@/components/admin/ClinicUsersPanel";

export const Route = createFileRoute("/admin/clinics/$id/users")({
  component: AdminClinicUsersPage,
});

function AdminClinicUsersPage() {
  const { id } = Route.useParams();
  return (
    <AdminLayout title="Clinic Users">
      <Link to="/admin/clinics/$id" params={{ id: String(id) }} className="adm-btn ghost sm">← Back to clinic</Link>
      <ClinicUsersPanel key={id} clinicId={Number(id)} />
    </AdminLayout>
  );
}
