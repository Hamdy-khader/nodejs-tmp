import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Save, Trash2, RotateCcw, Pencil, Undo2, Redo2,
  ScanLine, Pin, ChevronRight, Plus, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { patientsStore, usePatient, usePlan, usePlansFor, type TreatmentRow } from "@/lib/patients-store";
import { tabsStore } from "@/lib/tabs-store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { XrayPanel, type XrayPanelHandle } from "@/components/XrayPanel";
import { GeneralStatusDialog } from "@/components/GeneralStatusDialog";
import { TreatmentsView } from "@/components/TreatmentsView";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { OverviewPanel } from "@/components/OverviewPanel";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { DiagnosisButtons } from "@/components/diagnosis/DiagnosisButtons";
import { DiagnosisRows } from "@/components/diagnosis/DiagnosisRows";
import { DiagnosisDetailsPanel } from "@/components/diagnosis/DiagnosisDetailsPanel";
import { useDiagnosisEditor } from "@/components/diagnosis/useDiagnosisEditor";
import type { DiagnosisButtonItem } from "@/lib/dental/states";
import { planEntries } from "@/lib/dental/plan-diagnosis";
import { autocorrect, rootlessTeeth } from "@/lib/dental/treatment-engine";
import { treatmentHistory, useTreatmentHistory } from "@/lib/dental/treatment-history";
import { pricelistStore } from "@/lib/pricelist-store";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}


const STEPS = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "treatments", label: "Treatments" },
  { id: "documents", label: "Documents" },
  { id: "overview", label: "Overview" },
] as const;

export function TreatmentPlanWorkspace({ patientId, planId, initialStep = "diagnosis" }: {
  patientId: string;
  planId: string;
  initialStep?: (typeof STEPS)[number]["id"];
}) {
  const patient = usePatient(patientId);
  usePlansFor(patientId);
  const plan = usePlan(planId, patientId);
  const navigate = useNavigate();
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>(initialStep);
  const diagnosis = useDiagnosisEditor(plan);
  const treatmentSteps = useTreatmentHistory(plan?.id);
  const clearSelection = useRef(diagnosis.setSelectedTeeth);
  clearSelection.current = diagnosis.setSelectedTeeth;
  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('[data-diagnosis-selection], [data-tooth-number], [role="menu"], [role="dialog"]')) return;
      clearSelection.current([]);
    };
    if (step === "diagnosis") document.addEventListener("pointerdown", clear);
    return () => document.removeEventListener("pointerdown", clear);
  }, [step]);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(plan?.name ?? "");
  const [resetOpen, setResetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [xrayOpen, setXrayOpen] = useState(false);
  const xrayEditor = useRef<XrayPanelHandle>(null);
  // Teeth the free-text General / Other dialog applies to; [] is the whole mouth.
  const [customTeeth, setCustomTeeth] = useState<number[] | null>(null);
  const [lastButton, setLastButton] = useState<string>();
  const [saving, setSaving] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    if (patient && plan) {
      tabsStore.open({
        patientId: patient.id,
        name: patient.name,
        planId: plan.id,
        planName: plan.name,
      });
    }
  }, [patient?.id, patient?.name, plan?.id, plan?.name]);

  if (!hydrated) return <div className="p-8" />;
  if (!patient || !plan) {
    return (
      <div className="p-8">
        <p role="status" className="text-muted-foreground">Loading patient and saved plan…</p>
        <Link to="/patients" className="mt-4 inline-block text-primary underline">← Back</Link>
      </div>
    );
  }

  const showRightRail = step === "diagnosis" || step === "treatments";

  const applyButton = (item: DiagnosisButtonItem, group: string) => {
    if (item.custom) {
      setCustomTeeth([...diagnosis.selectedTeeth]);
      return;
    }
    setLastButton(group);
    // "Cyst" and "Granuloma" are custom findings with a fixed title.
    diagnosis.apply(item.stateIds, item.stateIds[0] === 208 ? item.label : undefined);
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      if (xrayEditor.current && !await xrayEditor.current.save()) return;
      await patientsStore.savePlan(plan.id);
      toast.success("Plan saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save plan");
    } finally {
      setSaving(false);
    }
  };

  const rows = plan.treatments ?? [];
  const changeTreatments = (next: TreatmentRow[], label: string) =>
    treatmentHistory.commit(plan.id, rows, next, label);

  const addRow = (row: TreatmentRow, label: string) => changeTreatments([...rows, row], label);

  const handleAutocorrect = () => {
    const rootless = rootlessTeeth(planEntries(plan.teeth, plan.generalStatuses));
    changeTreatments(autocorrect(rows, pricelistStore.get(), rootless, uid), "autocorrect");
  };

  const undo = step === "diagnosis"
    ? diagnosis.undo
    : { available: treatmentSteps.canUndo, label: treatmentSteps.undoLabel, run: () => treatmentHistory.undo(plan.id, rows) };
  const redo = step === "diagnosis"
    ? diagnosis.redo
    : { available: treatmentSteps.canRedo, label: treatmentSteps.redoLabel, run: () => treatmentHistory.redo(plan.id, rows) };

  // Reset clears the current step only: the diagnosis or the treatments.
  const handleResetPlan = () => {
    if (step === "diagnosis") {
      diagnosis.reset();
      toast.success("Diagnosis reset");
    } else {
      patientsStore.updatePlan(plan.id, { treatmentNote: undefined });
      changeTreatments([], "reset");
      toast.success("Treatments reset");
    }
    setResetOpen(false);
  };

  return (
    <div className="flex w-full min-w-0 flex-col overflow-x-hidden bg-muted/30">
      {/* Wizard steps */}
      <div className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-[1600px] items-stretch">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            return (
              <button
                key={s.id}
                onClick={async () => {
                  if (xrayEditor.current && !await xrayEditor.current.save()) return;
                  setStep(s.id);
                }}
                className={cn(
                  "relative flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide transition-all sm:px-5 sm:py-4 sm:text-sm",
                  active
                    ? "bg-[#fff191] text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {s.label}
                {i < STEPS.length - 1 && (
                  <ChevronRight className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 text-border" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "mx-auto grid w-full max-w-[1600px] min-w-0 grid-cols-1 gap-4 p-3 sm:p-5",
          showRightRail && "xl:grid-cols-[minmax(0,1fr)_280px]",
        )}
      >
        {/* Main column */}
        <div className="space-y-5">
          {/* Plan header (back + name) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/patients"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All patients
            </Link>
            <div className="flex items-center gap-2">
              {editName ? (
                <>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs text-sm" />
                  <Button size="sm" onClick={() => {
                    if (name.trim()) {
                      patientsStore.updatePlan(plan.id, { name: name.trim() });
                      toast.success("Renamed");
                    }
                    setEditName(false);
                  }}>
                    <Save className="h-4 w-4" /> Save
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">{patient.name} ·</span>
                  <h1 className="text-base font-bold tracking-tight">{plan.name}</h1>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setName(plan.name); setEditName(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {step === "treatments" ? (
            <TreatmentsView
              plan={plan}
              currency={patient.currency ?? "USD"}
              afterChart={xrayOpen && <XrayPanel ref={xrayEditor} planId={plan.id} xrays={plan.xrays ?? []} />}
            />
          ) : step === "documents" ? (
            <DocumentsPanel />
          ) : step === "overview" ? (
            <OverviewPanel plan={plan} />
          ) : step !== "diagnosis" ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center shadow-[var(--shadow-soft)]">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{STEPS.find((s) => s.id === step)?.label}</span> step coming soon.
              </p>
            </div>
          ) : (
            <>
              {/* Chart + diagnosis buttons */}
              <div
                className={cn(
                  "grid grid-cols-1 gap-5 rounded-md bg-card p-4 shadow-[var(--shadow-soft)] lg:grid-cols-[minmax(0,1.75fr)_minmax(240px,1fr)]",
                  pinned && "lg:sticky lg:top-0 lg:z-30",
                )}
              >
                <div>
                  <Odontogram
                    entries={diagnosis.entries}
                    mode="diagnosis"
                    selected={diagnosis.selectedTeeth}
                    onSelectionChange={diagnosis.setSelectedTeeth}
                  />
                  <div className="-mb-7 mt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setPinned((p) => !p)}
                      aria-label={pinned ? "Unpin chart" : "Pin chart"}
                      className="grid h-7 w-7 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm hover:bg-muted"
                    >
                      <Pin className={cn("h-3.5 w-3.5", pinned ? "" : "rotate-45")} />
                    </button>
                  </div>
                </div>
                <div className="self-center">
                  <DiagnosisButtons onApply={applyButton} activeLabel={lastButton} />
                </div>
              </div>

              {xrayOpen && <XrayPanel ref={xrayEditor} planId={plan.id} xrays={plan.xrays ?? []} />}

              <DiagnosisRows
                entries={diagnosis.entries}
                activeChip={diagnosis.activeChip}
                onEdit={diagnosis.editChip}
                onRemove={diagnosis.remove}
                onAdd={(tooth) => setCustomTeeth(tooth ? [tooth] : [])}
              />
            </>
          )}
        </div>

        {/* Right rail */}
         {showRightRail && (
        <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-[var(--shadow-soft)]">
            <RailButton
              icon={<Save className="h-4 w-4" />}
              label={saving ? "Saving..." : "Save"}
              onClick={handleSavePlan}
              disabled={saving}
              active={saving}
            />
            <div className="my-2 h-px bg-border" />
            <RailButton
              icon={<Undo2 className="h-4 w-4" />}
              label="Undo"
              sub={undo.available && undo.label ? `(${undo.label})` : undefined}
              onClick={undo.run}
              disabled={!undo.available}
            />
            <RailButton
              icon={<Redo2 className="h-4 w-4" />}
              label="Redo"
              sub={redo.available && redo.label ? `(${redo.label})` : undefined}
              onClick={redo.run}
              disabled={!redo.available}
            />
            <RailButton icon={<RotateCcw className="h-4 w-4" />} label="Reset" onClick={() => setResetOpen(true)} />
            <div className="my-2 h-px bg-border" />
            <RailButton icon={<ScanLine className="h-4 w-4" />} label="X-ray" onClick={async () => {
              if (xrayEditor.current && !await xrayEditor.current.save()) return;
              setXrayOpen((o) => !o);
            }} active={xrayOpen} />
            {step === "treatments" && (
              <>
                <div className="my-2 h-px bg-border" />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Visit"
                  onClick={() => addRow({ id: uid(), kind: "visit", items: [] }, "visit")}
                />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Healing period"
                  onClick={() => addRow({ id: uid(), kind: "healing" }, "healing period")}
                />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Discount"
                  onClick={() => addRow({ id: uid(), kind: "discount", mode: "amount", value: 0 }, "discount")}
                />
                <RailButton
                  icon={<Wand2 className="h-4 w-4" />}
                  label="Autocorrect"
                  onClick={handleAutocorrect}
                  disabled={!rows.length}
                />
              </>
            )}
            <div className="my-2 h-px bg-border" />
            <RailButton
              icon={<Trash2 className="h-4 w-4" />}
              label="Delete plan"
              onClick={() => setDelOpen(true)}
              danger
            />
          </div>

          {step === "diagnosis" && (
            <DiagnosisDetailsPanel
              details={diagnosis.details}
              onToggle={diagnosis.toggleDetail}
              onConfirm={diagnosis.confirmDetails}
            />
          )}
        </aside>
         )}
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{step === "diagnosis" ? "Reset diagnosis?" : "Reset treatments?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {step === "diagnosis"
                ? "Every tooth will be marked intact and all diagnoses removed. Treatments are kept."
                : "All treatments, visits and discounts will be removed. The diagnosis is kept."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPlan}>Reset</AlertDialogAction>
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
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GeneralStatusDialog
        open={customTeeth !== null}
        teeth={customTeeth ?? []}
        onClose={() => setCustomTeeth(null)}
        onSubmit={(status) => diagnosis.applyCustom(customTeeth ?? [], status)}
      />
    </div>
  );
}

function RailRow({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="truncate font-medium">{label}</div>
        {sub && <div className="truncate text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function RailButton({
  icon, label, sub, onClick, disabled, danger, active,
}: {
  icon: React.ReactNode;
  label: string;
  /** Second line, e.g. what undo will revert. */
  sub?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : active
          ? "bg-primary/10 text-primary"
          : danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <span className={cn(disabled ? "opacity-50" : "")}>{icon}</span>
      <span className="flex flex-col items-start leading-tight">
        {label}
        {sub && <span className="text-[11px] font-normal text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

function NoteRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (editing) {
    return (
      <div className="flex items-stretch gap-2">
        <Textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onChange(draft);
            setEditing(false);
          }}
          placeholder="Add a general note…"
          className="flex-1 bg-muted/40"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex h-12 w-full items-center justify-between rounded-md bg-muted/50 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
    >
      <span className="truncate">{value || ""}</span>
      <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
