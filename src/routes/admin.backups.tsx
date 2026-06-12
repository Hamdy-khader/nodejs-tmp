import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BackupManagement } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/backups")({
  component: AdminBackupsPage,
});

function AdminBackupsPage() {
  return (
    <AdminLayout title="Backup Management">
      <BackupManagement />
    </AdminLayout>
  );
}
