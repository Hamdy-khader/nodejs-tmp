import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clinicApi } from "@/lib/admin/api";
import type { TreatmentPlan } from "@/lib/patients-store";

export function ImportedPlanSource({ plan }: { plan: TreatmentPlan }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!plan.pdfImport) return null;
  return <aside className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 text-sm">
    <div className="min-w-0">
      <p className="break-words font-medium">Imported from {plan.pdfImport.filename}</p>
      <p className="text-muted-foreground">Source currency: {plan.pdfImport.currency_symbol}. Review the original report before using this plan.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
    <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try {
        const blob = await clinicApi.plans.downloadImportedPdf(plan.id);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = plan.pdfImport!.filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) { setError(e instanceof Error ? e.message : "Could not download the PDF. Please retry."); }
      finally { setBusy(false); }
    }}>{busy ? "Downloading…" : "Download original PDF"}</Button>
  </aside>;
}
