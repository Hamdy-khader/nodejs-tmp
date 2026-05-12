import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/patients/$patientId")({
  component: () => <Outlet />,
});
