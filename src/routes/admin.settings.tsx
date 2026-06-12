import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SystemSettings } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <AdminLayout title="System Settings">
      <SystemSettings />
    </AdminLayout>
  );
}
