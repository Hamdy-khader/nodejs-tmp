import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SupportCenter } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/support-center")({
  component: AdminSupportCenterPage,
});

function AdminSupportCenterPage() {
  return (
    <AdminLayout title="Support Center">
      <SupportCenter />
    </AdminLayout>
  );
}
