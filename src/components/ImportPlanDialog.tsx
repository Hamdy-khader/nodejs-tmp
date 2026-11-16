import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError, clinicApi } from "@/lib/admin/api";
import { patientsStore } from "@/lib/patients-store";

interface Preview {
  teeth: { tooth_number: number; status: string }[];
  rows: { kind: string; label: string; note: string; items: { name: string; tooth_number?: number; amount: number; unit_price: number; price_mode: string }[] }[];
  total: number;
  currency_symbol: string;
  warnings: string[];
}

export function ImportPlanDialog({ patientId, patientName, onImported }: {
  patientId: string; patientName: string; onImported: (planId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("Imported treatment plan");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);

  async function run(save: boolean) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      if (save) {
        const plan = await patientsStore.importPdf(patientId, file, name.trim());
        setOpen(false);
        onImported(plan.id);
      } else {
        const result = await clinicApi.plans.importPdf(patientId, file, true);
        setPreview(result as unknown as Preview);
      }
    } catch (e) {
      setError(e instanceof ApiError ? Object.values(e.errors ?? {}).flat().join(" ") || e.message : e instanceof Error ? e.message : "Could not import this PDF. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button variant="outline" onClick={() => { setFile(null); setPreview(null); setError(""); setReviewed(false); setName("Imported treatment plan"); setOpen(true); }}><Upload className="h-4 w-4" /> Import PDF</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Import treatment plan</DialogTitle>
          <DialogDescription>Extract the recorded diagnosis and treatments into a new plan for {patientName}. Supports text-based BrightPlans reports up to 10 MB.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-1" aria-busy={busy}>
          <div className="space-y-2">
            <Label htmlFor="import-pdf">Treatment report (PDF)</Label>
            <Input id="import-pdf" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              setPreview(null); setReviewed(false); setError(""); setFile(null);
              if (selected && (!selected.name.toLowerCase().endsWith(".pdf") || selected.size > 10 * 1024 * 1024)) {
                setError("Choose a PDF file no larger than 10 MB."); return;
              }
              setFile(selected);
            }} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {busy && <p role="status" className="text-sm text-muted-foreground">{preview ? "Saving the plan and original PDF…" : "Reading diagnoses and checking treatment totals…"}</p>}
          {preview && <>
            <div className="space-y-2"><Label htmlFor="import-name">Plan name</Label><Input id="import-name" value={name} maxLength={255} disabled={busy} onChange={(e) => setName(e.target.value)} /></div>
            <section className="space-y-2" aria-label="Extracted diagnosis">
              <h3 className="font-semibold">Diagnosis · {preview.teeth.length} teeth</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                {preview.teeth.map((tooth) => <div key={tooth.tooth_number} className="flex gap-2"><dt className="font-medium">{tooth.tooth_number}</dt><dd>{tooth.status}</dd></div>)}
              </dl>
            </section>
            <section className="space-y-4" aria-label="Extracted treatments">
              <h3 className="font-semibold">Treatments · {preview.currency_symbol} {preview.total.toLocaleString()}</h3>
              {preview.rows.map((row, i) => <div key={i}>
                <h4 className="text-sm font-semibold">{row.label} {row.note && `— ${row.note}`}</h4>
                <ul className="mt-2 divide-y text-sm">{row.items.map((item, j) => <li key={j} className="flex justify-between gap-4 py-2">
                  <span>{item.name}{item.tooth_number ? ` · Tooth ${item.tooth_number}` : ""}<span className="block text-xs text-muted-foreground">{item.price_mode === "unit" ? `${item.amount} × ${preview.currency_symbol} ${item.unit_price}` : item.price_mode === "free" ? "Free" : "In package"}</span></span>
                  <span className="shrink-0 tabular-nums">{preview.currency_symbol} {(item.amount * item.unit_price).toLocaleString()}</span>
                </li>)}</ul>
              </div>)}
            </section>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={reviewed} disabled={busy} onChange={(e) => setReviewed(e.target.checked)} />I checked the source PDF, patient ({patientName}), diagnoses and currency. Save as a new draft plan.</label>
          </>}
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={busy || !file || (!!preview && (!reviewed || !name.trim()))} onClick={() => void run(!!preview)}>{preview ? "Save and open plan" : "Analyze PDF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
