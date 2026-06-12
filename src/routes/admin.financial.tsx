import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { FinancialManagement } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/financial")({
  component: AdminFinancialPage,
});

function AdminFinancialPage() {
  return (
    <AdminLayout title="Financial Management">
      <FinancialManagement />
    </AdminLayout>
  );
}
