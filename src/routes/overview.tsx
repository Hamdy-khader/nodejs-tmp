import { createFileRoute } from "@tanstack/react-router";
import { StandaloneOverview } from "@/components/StandaloneOverview";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Treatly" },
      { name: "description", content: "Preview the final treatment plan PDF before download." },
    ],
  }),
  component: StandaloneOverview,
});
