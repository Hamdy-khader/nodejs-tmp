import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Save, Trash2, RotateCcw, Pencil, Undo2, Redo2,
  Globe, DollarSign, ScanLine, Pin, Check, ChevronDown, ChevronRight, ChevronUp, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  patientsStore, usePatient, usePlan, usePlansFor, defaultTeeth,
  STATUS_META, UPPER_TEETH, LOWER_TEETH, type ToothStatus, type TreatmentPlan,
} from "@/lib/patients-store";
import { tabsStore } from "@/lib/tabs-store";
import { useHydrated } from "@/lib/use-hydrated";
import { TeethChart } from "@/components/TeethChart";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { XrayPanel } from "@/components/XrayPanel";
import { FilledDiagnosisPanel } from "@/components/FilledDiagnosisPanel";
import { SeverityDiagnosisPanel } from "@/components/SeverityDiagnosisPanel";
import { ImplantDiagnosisPanel } from "@/components/ImplantDiagnosisPanel";
import { BridgeDiagnosisPanel } from "@/components/BridgeDiagnosisPanel";
import { MalocclusionDiagnosisPanel } from "@/components/MalocclusionDiagnosisPanel";
import { FacialDisproportionsPanel } from "@/components/FacialDisproportionsPanel";
import { GeneralStatusDialog } from "@/components/GeneralStatusDialog";
import { TreatmentsView } from "@/components/TreatmentsView";
import { X } from "lucide-react";
import { usePlanSettings } from "@/lib/plan-settings-store";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const FILLED_VARIANTS = ["Filled (composite)", "Filled (amalgam)", "Inlay"];
const SEVERITY_VARIANTS = ["Worn", "Fractured"];
const IMPLANT_VARIANTS = ["Implant + abutment", "Implant"];
const BRIDGE_VARIANTS = ["Bridge"];
const MALOCCLUSION_VARIANTS = ["Malocclusion"];
const FACIAL_VARIANTS = ["Facial disproportions"];
const GENERAL_SEVERITY_VARIANTS = [
  "Bruxism signs",
  "Gingivitis",
  "Periodontitis",
  "Gingival recession",
];

export const Route = createFileRoute("/patients/$patientId/plans/$planId")({
  component: PlanPage,
  notFoundComponent: () => <div className="p-8">Plan not found</div>,
});

const STEPS = [
  { id: "diagnosis", label: "Diagnosis" },
  { id: "treatments", label: "Treatments" },
] as const;

type StatusGroupId = ToothStatus | "general" | "other";

const STATUS_GROUPS: {
  id: StatusGroupId;
  label: string;
  items: string[];
}[] = [
  { id: "missing", label: "Missing", items: ["Missing"] },
  {
    id: "intact",
    label: "Intact",
    items: [
      "Intact", "Discolored", "Worn", "Fractured", "Fractured root",
      "Radix", "Root resorption", "Mobility", "Necrosis",
    ],
  },
  {
    id: "filled",
    label: "Filled (amalgam)",
    items: ["Filled (composite)", "Inlay", "Filled (amalgam)"],
  },
  { id: "caries", label: "Caries", items: ["Caries"] },
  {
    id: "root-treated",
    label: "Root treated",
    items: ["Root treated", "Post", "Parapulpal pin"],
  },
  {
    id: "implant",
    label: "Implant + abutment",
    items: ["Implant + abutment", "Implant"],
  },
  { id: "crown", label: "Crown", items: ["Crown", "Veneer"] },
  { id: "bridge", label: "Bridge", items: ["Bridge", "Dentures"] },
  {
    id: "general",
    label: "General",
    items: [
      "General", "Malocclusion", "Bruxism signs", "Facial disproportions",
      "Plaque", "Gingivitis", "Periodontitis", "Bone loss",
      "Gingival overgrowth", "Gingival recession", "Gummy smile",
      "TMJ disorder", "Muscle disorder", "Large maxillary sinus",
    ],
  },
  {
    id: "other",
    label: "Other...",
    items: [
      "Other...", "Drifted (front)", "Drifted (back)",
      "Apical lesion", "Cyst", "Granuloma", "Impacted",
    ],
  },
];

function PlanPage() {
  const { patientId, planId } = useParams({ from: "/patients/$patientId/plans/$planId" });
  const patient = usePatient(patientId);
  usePlansFor(patientId);
  const plan = usePlan(planId, patientId);
  const accountSettings = usePlanSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>("diagnosis");
  const [selected, setSelected] = useState<number | null>(null);
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(plan?.name ?? "");
  const [resetOpen, setResetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [xrayOpen, setXrayOpen] = useState(false);
  const [filledPanelOpen, setFilledPanelOpen] = useState(false);
  const [severityPanelOpen, setSeverityPanelOpen] = useState(false);
  const [implantPanelOpen, setImplantPanelOpen] = useState(false);
  const [bridgePanelOpen, setBridgePanelOpen] = useState(false);
  const [malocclusionPanelOpen, setMalocclusionPanelOpen] = useState(false);
  const [facialPanelOpen, setFacialPanelOpen] = useState(false);
  const [generalDialogOpen, setGeneralDialogOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [open, setOpen] = useState({ general: true, upper: true, lower: true });
  const [saving, setSaving] = useState(false);

  const closeAllPanels = () => {
    setFilledPanelOpen(false);
    setSeverityPanelOpen(false);
    setImplantPanelOpen(false);
    setBridgePanelOpen(false);
    setMalocclusionPanelOpen(false);
    setFacialPanelOpen(false);
  };

  const openDiagnosisPanelForTooth = (n: number) => {
    const t = plan?.teeth[n];
    if (!t || !t.note) return;
    setSelected(n);
    closeAllPanels();
    if (t.status === "filled" && FILLED_VARIANTS.includes(t.note)) setFilledPanelOpen(true);
    else if (t.status === "intact" && SEVERITY_VARIANTS.includes(t.note)) setSeverityPanelOpen(true);
    else if (GENERAL_SEVERITY_VARIANTS.includes(t.note)) setSeverityPanelOpen(true);
    else if (t.status === "implant" && IMPLANT_VARIANTS.includes(t.note)) setImplantPanelOpen(true);
    else if (t.status === "bridge" && BRIDGE_VARIANTS.includes(t.note)) setBridgePanelOpen(true);
    else if (MALOCCLUSION_VARIANTS.includes(t.note)) setMalocclusionPanelOpen(true);
    else if (FACIAL_VARIANTS.includes(t.note)) setFacialPanelOpen(true);
    setPanelKey((k) => k + 1);
  };
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
        <p className="text-muted-foreground">Plan not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-primary underline">← Back</Link>
      </div>
    );
  }

  const selectedTooth = selected != null ? plan.teeth[selected] : null;
  const canSelectStatus = selectedTooth != null;

  const setStatus = (s: ToothStatus) => {
    if (!selectedTooth) return;
    patientsStore.setTooth(plan.id, { ...selectedTooth, status: s });
  };

  const handleSavePlan = async () => {
    setSaving(true);
    try {
      await patientsStore.savePlan(plan.id);
      toast.success("Plan saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save plan");
    } finally {
      setSaving(false);
    }
  };

  const summary = (Object.keys(STATUS_META) as ToothStatus[])
    .filter((s) => s !== "intact")
    .map((s) => ({ s, count: Object.values(plan.teeth).filter((t) => t.status === s).length }))
    .filter((x) => x.count > 0);

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
                onClick={() => setStep(s.id)}
                className={cn(
                  "relative flex flex-1 min-w-0 items-center justify-center gap-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-wide transition-all sm:px-5 sm:py-4 sm:text-sm",
                  active
                    ? "bg-[oklch(0.96_0.12_95)] text-foreground"
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

      <div className="mx-auto grid w-full max-w-[1600px] min-w-0 grid-cols-1 gap-4 p-3 sm:p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
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

          {xrayOpen && step === "treatments" && (
            <XrayPanel
              planId={plan.id}
              xrays={plan.xrays ?? []}
              onClose={() => setXrayOpen(false)}
            />
          )}

          {step === "treatments" ? (
            <TreatmentsView plan={plan} />
          ) : step !== "diagnosis" ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center shadow-[var(--shadow-soft)]">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{STEPS.find((s) => s.id === step)?.label}</span> step coming soon.
              </p>
            </div>
          ) : (
            <>
              {/* Teeth chart + status grid (no heavy card chrome) */}
              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <TeethChart teeth={plan.teeth} selected={selected} onSelect={setSelected} />
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setPinned((p) => !p)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 transition-colors hover:bg-muted"
                    >
                      <Pin className={cn("h-3 w-3", pinned ? "rotate-45 text-accent" : "text-muted-foreground")} />
                      {pinned ? "Pinned chart" : "Unpinned"}
                    </button>
                  </div>
                </div>

                {/* Status pseudo-dropdown grid */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tooth status
                    </h3>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      canSelectStatus ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}>
                      {canSelectStatus ? `Tooth ${selected}` : "Pick a tooth"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {STATUS_GROUPS.map((group) => {
                      const isToothStatus = group.id !== "general" && group.id !== "other";
                      const statusActive =
                        canSelectStatus &&
                        isToothStatus &&
                        selectedTooth?.status === group.id &&
                        !!selectedTooth?.note &&
                        group.items.includes(selectedTooth.note);
                      const noteActive =
                        canSelectStatus &&
                        !isToothStatus &&
                        !!selectedTooth?.note &&
                        group.items.includes(selectedTooth.note);
                      const active = statusActive || noteActive;
                      const disabled = !canSelectStatus && isToothStatus;
                      const currentLabel =
                        active && selectedTooth?.note && group.items.includes(selectedTooth.note)
                          ? selectedTooth.note
                          : group.label;
                      const isSingle = group.items.length <= 1;
                      const triggerClass = cn(
                        "group flex h-10 items-center justify-between gap-2 rounded-md px-3 text-left text-xs font-semibold transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : disabled
                          ? "cursor-not-allowed bg-[oklch(0.78_0.01_240)] text-white/95"
                          : "bg-[oklch(0.62_0.02_240)] text-white hover:bg-[oklch(0.55_0.04_240)]",
                      );
                      const triggerInner = (
                        <>
                          <span className="flex min-w-0 items-center gap-2">
                            {isToothStatus && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/40"
                                style={{ background: STATUS_META[group.id as ToothStatus].color }}
                              />
                            )}
                            <span className="truncate">{currentLabel}</span>
                          </span>
                          {active ? (
                            <Check className="h-3.5 w-3.5 shrink-0" />
                          ) : !isSingle ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          ) : null}
                        </>
                      );

                      const applySelection = (item: string) => {
                        closeAllPanels();
                        if (isToothStatus) {
                          if (!selectedTooth) return;
                          patientsStore.setTooth(plan.id, {
                            ...selectedTooth,
                            status: group.id as ToothStatus,
                            note: item,
                          });
                          if (group.id === "filled" && FILLED_VARIANTS.includes(item)) {
                            setFilledPanelOpen(true);
                          }
                          if (group.id === "intact" && SEVERITY_VARIANTS.includes(item)) {
                            setSeverityPanelOpen(true);
                          }
                          if (group.id === "implant" && IMPLANT_VARIANTS.includes(item)) {
                            setImplantPanelOpen(true);
                          }
                          if (group.id === "bridge" && BRIDGE_VARIANTS.includes(item)) {
                            setBridgePanelOpen(true);
                          }
                        } else {
                          // General / Other... — open dialog for free text
                          if (
                            (group.id === "general" && item === "General") ||
                            (group.id === "other" && item === "Other...")
                          ) {
                            setGeneralDialogOpen(true);
                          } else if (selectedTooth) {
                            // Tooth selected — attach as note on that tooth (shows in jaw row)
                            patientsStore.setTooth(plan.id, {
                              ...selectedTooth,
                              note: item,
                            });
                            if (MALOCCLUSION_VARIANTS.includes(item)) setMalocclusionPanelOpen(true);
                            else if (FACIAL_VARIANTS.includes(item)) setFacialPanelOpen(true);
                            else if (GENERAL_SEVERITY_VARIANTS.includes(item)) setSeverityPanelOpen(true);
                          } else {
                            // No tooth selected — add as a tag in General box
                            const next = [...(plan.generalStatuses ?? []), item];
                            patientsStore.updatePlan(plan.id, { generalStatuses: next });
                          }
                        }
                        setPanelKey((k) => k + 1);
                      };

                      if (isSingle) {
                        return (
                          <button
                            key={group.id}
                            disabled={disabled}
                            onClick={() => applySelection(group.items[0])}
                            className={triggerClass}
                          >
                            {triggerInner}
                          </button>
                        );
                      }


                      return (
                        <DropdownMenu key={group.id}>
                          <DropdownMenuTrigger asChild disabled={disabled}>
                            <button disabled={disabled} className={triggerClass}>
                              {triggerInner}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="min-w-[200px]">
                            {group.items.map((item) => {
                              const isActive = active && currentLabel === item;
                              return (
                                <DropdownMenuItem
                                  key={item}
                                  onSelect={() => applySelection(item)}
                                  className={cn(
                                    "flex items-center justify-between gap-2 text-xs font-medium",
                                    isActive && "bg-accent",
                                  )}
                                >
                                  <span className="truncate">{item}</span>
                                  {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })}
                  </div>
                  {!canSelectStatus && (
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                      Click a tooth on the chart to enable selection.
                    </p>
                  )}
                </div>
              </div>

              {xrayOpen && (
                <XrayPanel
                  planId={plan.id}
                  xrays={plan.xrays ?? []}
                  onClose={() => setXrayOpen(false)}
                />
              )}

              {/* General section */}
              <Section
                title="General"
                open={open.general}
                onToggle={() => setOpen((o) => ({ ...o, general: !o.general }))}
              >
                <div className="flex h-12 w-full items-center gap-2 rounded-md bg-muted/50 px-3">
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {(plan.generalStatuses ?? []).map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => {
                            const next = (plan.generalStatuses ?? []).filter(
                              (_, idx) => idx !== i,
                            );
                            patientsStore.updatePlan(plan.id, { generalStatuses: next });
                          }}
                          className="rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                          aria-label={`Remove ${s}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneralDialogOpen(true)}
                    className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Add general status"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </Section>

              {/* Upper jaw */}
              <Section
                title="Upper jaw"
                open={open.upper}
                onToggle={() => setOpen((o) => ({ ...o, upper: !o.upper }))}
              >
                <JawGrid numbers={UPPER_TEETH} plan={plan} selected={selected} onSelect={setSelected} onEditDiagnosis={openDiagnosisPanelForTooth} />
              </Section>

              {/* Lower jaw */}
              <Section
                title="Lower jaw"
                open={open.lower}
                onToggle={() => setOpen((o) => ({ ...o, lower: !o.lower }))}
              >
                <JawGrid numbers={LOWER_TEETH} plan={plan} selected={selected} onSelect={setSelected} onEditDiagnosis={openDiagnosisPanelForTooth} />
              </Section>
            </>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-3 lg:sticky lg:top-3 lg:self-start">
          {filledPanelOpen &&
            selectedTooth &&
            selectedTooth.status === "filled" &&
            selectedTooth.note &&
            FILLED_VARIANTS.includes(selectedTooth.note) && (
              <FilledDiagnosisPanel
                key={`filled-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setFilledPanelOpen(false)}
              />
            )}

          {severityPanelOpen &&
            selectedTooth &&
            selectedTooth.note &&
            ((selectedTooth.status === "intact" && SEVERITY_VARIANTS.includes(selectedTooth.note)) ||
              GENERAL_SEVERITY_VARIANTS.includes(selectedTooth.note)) && (
              <SeverityDiagnosisPanel
                key={`severity-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setSeverityPanelOpen(false)}
              />
            )}

          {implantPanelOpen &&
            selectedTooth &&
            selectedTooth.status === "implant" &&
            selectedTooth.note &&
            IMPLANT_VARIANTS.includes(selectedTooth.note) && (
              <ImplantDiagnosisPanel
                key={`implant-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setImplantPanelOpen(false)}
              />
            )}

          {bridgePanelOpen &&
            selectedTooth &&
            selectedTooth.status === "bridge" &&
            selectedTooth.note &&
            BRIDGE_VARIANTS.includes(selectedTooth.note) && (
              <BridgeDiagnosisPanel
                key={`bridge-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setBridgePanelOpen(false)}
              />
            )}

          {malocclusionPanelOpen &&
            selectedTooth &&
            selectedTooth.note &&
            MALOCCLUSION_VARIANTS.includes(selectedTooth.note) && (
              <MalocclusionDiagnosisPanel
                key={`malocclusion-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setMalocclusionPanelOpen(false)}
              />
            )}

          {facialPanelOpen &&
            selectedTooth &&
            selectedTooth.note &&
            FACIAL_VARIANTS.includes(selectedTooth.note) && (
              <FacialDisproportionsPanel
                key={`facial-${panelKey}`}
                planId={plan.id}
                tooth={selectedTooth}
                variant={selectedTooth.note}
                onClose={() => setFacialPanelOpen(false)}
              />
            )}

          <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-[var(--shadow-soft)]">
            <RailRow icon={<Globe className="h-4 w-4" />} label={accountSettings.language} sub="Account default" />
            <RailRow icon={<DollarSign className="h-4 w-4" />} label={accountSettings.pricePage.currency} sub="Account default" />
            <div className="my-2 h-px bg-border" />
            <RailButton
              icon={<Save className="h-4 w-4" />}
              label={saving ? "Saving..." : "Save"}
              onClick={handleSavePlan}
              disabled={saving}
              active={saving}
            />
            <div className="my-2 h-px bg-border" />
            <RailButton icon={<Undo2 className="h-4 w-4" />} label="Undo" disabled />
            <RailButton icon={<Redo2 className="h-4 w-4" />} label="Redo" disabled />
            <RailButton icon={<RotateCcw className="h-4 w-4" />} label="Reset" onClick={() => setResetOpen(true)} />
            <div className="my-2 h-px bg-border" />
            <RailButton icon={<ScanLine className="h-4 w-4" />} label="X-ray" onClick={() => setXrayOpen((o) => !o)} active={xrayOpen} />
            {step === "treatments" && (
              <>
                <div className="my-2 h-px bg-border" />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Visit"
                  onClick={() =>
                    patientsStore.addTreatmentRow(plan.id, {
                      id: uid(),
                      kind: "visit",
                      items: [],
                    })
                  }
                />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Healing period"
                  onClick={() =>
                    patientsStore.addTreatmentRow(plan.id, {
                      id: uid(),
                      kind: "healing",
                    })
                  }
                />
                <RailButton
                  icon={<Plus className="h-4 w-4" />}
                  label="Discount"
                  onClick={() =>
                    patientsStore.addTreatmentRow(plan.id, {
                      id: uid(),
                      kind: "discount",
                      mode: "amount",
                      value: 0,
                    })
                  }
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

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Diagnosis:</h3>
            {summary.length === 0 ? (
              <p className="mt-2 text-xs italic text-muted-foreground">First select a status.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {summary.map(({ s, count }) => (
                  <li key={s} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />
                      {STATUS_META[s].label}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
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
            <AlertDialogAction onClick={() => {
              patientsStore.updatePlan(plan.id, { teeth: defaultTeeth() });
              toast.success("Teeth reset");
              setResetOpen(false);
            }}>Reset</AlertDialogAction>
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
        open={generalDialogOpen}
        toothNumber={selectedTooth?.number}
        onClose={() => setGeneralDialogOpen(false)}
        onSubmit={(status) => {
          if (selectedTooth) {
            patientsStore.setTooth(plan.id, { ...selectedTooth, note: status });
          } else {
            const next = [...(plan.generalStatuses ?? []), status];
            patientsStore.updatePlan(plan.id, { generalStatuses: next });
          }
        }}
      />
    </div>
  );
}

function Section({
  title, open, onToggle, children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">{title}</h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-primary" />
        )}
      </button>
      {open && <div className="border-t border-border/40 px-5 py-4">{children}</div>}
    </div>
  );
}

function JawGrid({
  numbers, plan, selected, onSelect, onEditDiagnosis,
}: {
  numbers: number[];
  plan: TreatmentPlan;
  selected: number | null;
  onSelect: (n: number) => void;
  onEditDiagnosis?: (n: number) => void;
}) {
  const left = numbers.slice(0, 8);
  const right = numbers.slice(8);

  // Count how many treatment items belong to each tooth
  const treatmentCounts: Record<number, number> = {};
  for (const row of plan.treatments ?? []) {
    if (row.kind === "visit") {
      for (const item of row.items) {
        if (item.toothNumber != null) {
          treatmentCounts[item.toothNumber] = (treatmentCounts[item.toothNumber] ?? 0) + 1;
        }
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
      {[left, right].map((col, i) => (
        <div key={i} className="space-y-1.5">
          {col.map((n) => {
            const t = plan.teeth[n];
            const isSel = selected === n;
            const status = t?.status ?? "intact";
            const hasStatus = status !== "intact";
            const meta = STATUS_META[status];
            const baseLabel = t?.note || (hasStatus ? meta.label : "");
            const dx = (t?.diagnosis ?? []).filter(Boolean);
            const txCount = treatmentCounts[n] ?? 0;

            return (
              <div
                key={n}
                className={cn(
                  "group relative flex w-full items-stretch overflow-hidden rounded-xl border text-left text-sm transition-all duration-150",
                  isSel
                    ? "border-primary/50 bg-primary/[0.04] shadow-sm ring-1 ring-primary/30"
                    : hasStatus
                      ? "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm"
                      : "border-border/40 bg-muted/30 hover:bg-muted/60 hover:border-border/60",
                )}
              >
                {/* Status accent bar */}
                <div
                  className="w-1 shrink-0 rounded-l-xl"
                  style={{ background: hasStatus ? meta.color : "transparent" }}
                />

                <div className="flex flex-1 items-center gap-2.5 px-2.5 py-2">
                  {/* Tooth number badge */}
                  <button
                    type="button"
                    onClick={() => onSelect(n)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums transition-colors",
                      isSel
                        ? "bg-primary text-primary-foreground"
                        : hasStatus
                          ? "text-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                    style={
                      hasStatus && !isSel
                        ? { background: meta.bg, color: meta.ring }
                        : undefined
                    }
                  >
                    {n}
                  </button>

                  {/* Content area */}
                  <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                    {/* Diagnosis chip */}
                    {baseLabel ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDiagnosis?.(n);
                        }}
                        className="flex items-center gap-1.5 text-left"
                      >
                        {/* Status dot */}
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: meta.color }}
                        />
                        <span className="truncate text-[12px] font-semibold text-foreground/90 hover:underline">
                          {baseLabel}
                        </span>
                      </button>
                    ) : (
                      <span className="text-[11px] italic text-muted-foreground/60">
                        Intact — no diagnosis
                      </span>
                    )}

                    {/* Diagnosis detail tags */}
                    {dx.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {dx.map((d) => (
                          <span
                            key={d}
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ background: meta.bg, color: meta.ring }}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Treatment badge */}
                  {txCount > 0 && (
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "#EBF1FB", color: "#1E4890" }}
                      title={`${txCount} treatment item${txCount > 1 ? "s" : ""}`}
                    >
                      Tx×{txCount}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onSelect(n)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Select tooth ${n}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {hasStatus && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          patientsStore.setTooth(plan.id, {
                            number: n,
                            status: "intact",
                            note: undefined,
                            diagnosis: undefined,
                          });
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Clear tooth ${n}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
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
  icon, label, onClick, disabled, danger, active,
}: {
  icon: React.ReactNode;
  label: string;
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
      {label}
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
