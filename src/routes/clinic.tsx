import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/clinic")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Treatly — Dental Clinic Dashboard" },
      {
        name: "description",
        content:
          "Manage patients, treatment plans, fees, and templates for your dental clinic with Treatly.",
      },
    ],
  }),
});
