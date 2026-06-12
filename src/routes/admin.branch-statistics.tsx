import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BranchStatistics } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/branch-statistics")({
  component: AdminBranchStatisticsPage,
});

function AdminBranchStatisticsPage() {
  return (
    <AdminLayout title="Branch Statistics">
      <BranchStatistics />
    </AdminLayout>
  );
}
