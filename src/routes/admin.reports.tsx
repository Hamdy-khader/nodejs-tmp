import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BusinessReports } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsPage,
});

function AdminReportsPage() {
  return (
    <AdminLayout title="Reports">
      <BusinessReports />
    </AdminLayout>
  );
}
