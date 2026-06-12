import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SubscriptionManagement } from "@/components/admin/SuperAdminSections";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  return (
    <AdminLayout title="Subscriptions">
      <SubscriptionManagement />
    </AdminLayout>
  );
}
