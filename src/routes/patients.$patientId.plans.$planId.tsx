import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save, Trash2, RotateCcw, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  patientsStore,
  usePatient,
  usePlan,
  defaultTeeth,
  STATUS_META,
  type ToothStatus,
} from "@/lib/patients-store";
import { TeethChart } from "@/components/TeethChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/patients/$patientId/plans/$planId")({
  component: PlanPage,
  notFoundComponent: () => <div className="p-8">Plan not found</div>,
});

const STATUSES: ToothStatus[] = [
  "intact",
  "missing",
  "caries",
  "filled",
  "crown",
  "root-treated",
  "implant",
  "bridge",
];

function PlanPage() {
  const { patientId, planId } = useParams({ from: "/patients/$patientId/plans/$planId" });
  const patient = usePatient(patientId);
  const plan = usePlan(planId);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(plan?.name ?? "");
  const [resetOpen, setResetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  if (!patient || !plan) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Plan not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-primary underline">← Back</Link>
      </div>
    );
  }

  const selectedTooth = selected != null ? plan.teeth[selected] : null;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/patients/$patientId"
          params={{ patientId }}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {patient.name}
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDelOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete plan
          </Button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {editName ? (
          <div className="flex flex-1 items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md text-lg font-semibold" />
            <Button
              size="sm"
              onClick={() => {
                if (name.trim()) {
                  patientsStore.updatePlan(plan.id, { name: name.trim() });
                  toast.success("Plan renamed");
                }
                setEditName(false);
              }}
            >
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{plan.name}</h1>
            <Button size="icon" variant="ghost" onClick={() => { setName(plan.name); setEditName(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <TeethChart teeth={plan.teeth} selected={selected} onSelect={setSelected} />

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Legend</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
                  <span
                    className="h-3 w-3 rounded-full ring-1"
                    style={{ background: STATUS_META[s].color, boxShadow: `inset 0 0 0 1px ${STATUS_META[s].ring}` }}
                  />
                  <span className="text-xs">{STATUS_META[s].label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <Label htmlFor="notes">Plan notes</Label>
            <Textarea
              id="notes"
              rows={4}
              defaultValue={plan.notes}
              onBlur={(e) => {
                if (e.target.value !== plan.notes) {
                  patientsStore.updatePlan(plan.id, { notes: e.target.value });
                }
              }}
              placeholder="General observations, follow-ups, recommendations…"
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Tooth {selected ?? "—"}
            </h3>
            {selectedTooth ? (
              <>
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STATUSES.map((s) => {
                      const active = selectedTooth.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => patientsStore.setTooth(plan.id, { ...selectedTooth, status: s })}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:bg-muted",
                          )}
                        >
                          <span
                            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                            style={{ background: STATUS_META[s].color }}
                          />
                          {STATUS_META[s].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="toothNote" className="text-xs">Note</Label>
                  <Textarea
                    id="toothNote"
                    key={selected}
                    rows={3}
                    defaultValue={selectedTooth.note ?? ""}
                    onBlur={(e) =>
                      patientsStore.setTooth(plan.id, { ...selectedTooth, note: e.target.value || undefined })
                    }
                    placeholder="Tooth-specific note"
                  />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Select a tooth on the chart to edit its status.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {STATUSES.filter((s) => s !== "intact").map((s) => {
                const count = Object.values(plan.teeth).filter((t) => t.status === s).length;
                if (!count) return null;
                return (
                  <li key={s} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: STATUS_META[s].color }}
                      />
                      {STATUS_META[s].label}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </li>
                );
              })}
              {Object.values(plan.teeth).every((t) => t.status === "intact") && (
                <li className="text-xs text-muted-foreground">All teeth intact.</li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all teeth?</AlertDialogTitle>
            <AlertDialogDescription>This will mark every tooth as intact.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                patientsStore.updatePlan(plan.id, { teeth: defaultTeeth() });
                toast.success("Teeth reset");
                setResetOpen(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                patientsStore.deletePlan(plan.id);
                toast.success("Plan deleted");
                navigate({ to: "/patients/$patientId", params: { patientId } });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
