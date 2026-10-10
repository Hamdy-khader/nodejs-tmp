import { createFileRoute } from "@tanstack/react-router";
import { ClinicFeesPage } from "@/components/ClinicFeesPage";

export const Route = createFileRoute("/clinic-fees")({
  head: () => ({
    meta: [
      { title: "Your Clinic Fees - Treatly" },
      {
        name: "description",
        content: "Manage treatment prices and currency for your clinic.",
      },
    ],
  }),
  component: ClinicFeesPage,
});
