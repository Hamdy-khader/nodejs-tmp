import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { HighLevelUsersManagement } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  return (
    <AdminLayout title="Clinic Accounts">
      <HighLevelUsersManagement />
    </AdminLayout>
  );
}
