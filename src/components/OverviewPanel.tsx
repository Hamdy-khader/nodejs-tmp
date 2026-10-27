import type { PlanSettings } from "@/lib/plan-settings-store";
import { TreatmentReportPage as PageCard } from "./TreatmentReportPage";
import { buildTreatmentReportPages } from "@/lib/treatment-report-layout";
import { createRef, useMemo, useState, type ReactNode } from "react";
import {
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Table as TableIcon,
  Puzzle,
  LayoutGrid,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useSelectedIds,
  useSectionOrder,
  useDocsHistoryState,
  documentsStore,
  type DocSectionId,
} from "@/lib/documents-store";
import { useTemplates, type ClinicTemplate } from "@/lib/templates-store";
import { planSettingsStore, usePlanSettings } from "@/lib/plan-settings-store";
import { saveTreatmentPlanPdf, type TreatmentPlanPdfPage } from "@/lib/treatment-plan-pdf";
import {
  type TreatmentPlan,
  usePatient,
} from "@/lib/patients-store";
import { toast } from "sonner";
import { useClinicSession } from "@/lib/clinic-session-store";
import {
  buildPdfExportContext,
} from "@/lib/pdf-export-context";

interface DocRow {
  id: string;
  title: string;
  body?: string;
}

const FIXED_DOCUMENT_BODIES: Record<string, string> = {
  "fixed:clinic:demo":
    "Demo dentist profile. This page can include the clinic introduction, responsible dentist details, and a short message that presents the treatment plan in a patient-friendly format.",
  "fixed:clinic:note":
    "Custom clinic note. Update this text source later from settings or backend data when clinic-specific notes are available.",
  "fixed:diagnosis:note":
    "Custom diagnosis note. Update this text source later with the diagnosis-specific note configured for the patient or clinic.",
  "fixed:treatments:note":
    "Custom treatment note. Update this text source later with the treatment note configured for the patient or clinic.",
  "fixed:other:guarantee":
    "Guarantee and brief information. This page can explain guarantee terms, expected follow-up, aftercare responsibilities, and important patient guidance.",
  "fixed:other:ourclinic":
    "Our clinic. This page can present the clinic story, team experience, technologies, and contact information.",
  "fixed:other:note":
    "Custom note. Update this text source later from the final note content configured in your workflow.",
};

function stripHtml(input: string) {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getDocumentBody(id: string, templates: ClinicTemplate[]) {
  const template = templates.find((item) => item.id === id);
  if (template) return stripHtml(template.body);
  return FIXED_DOCUMENT_BODIES[id] ?? "No content available for this document yet.";
}

function buildSection(
  sectionId: DocSectionId,
  templates: ClinicTemplate[],
  order: string[],
): DocRow[] {
  let rows: DocRow[] = [];
  if (sectionId === "clinic") {
    rows = [
      {
        id: "fixed:clinic:demo",
        title: "Demo Dentist",
        body: getDocumentBody("fixed:clinic:demo", templates),
      },
      {
        id: "fixed:clinic:note",
        title: "Custom note",
        body: getDocumentBody("fixed:clinic:note", templates),
      },
    ];
  } else if (sectionId === "diagnosis") {
    rows = [
      {
        id: "fixed:diagnosis:note",
        title: "Custom note",
        body: getDocumentBody("fixed:diagnosis:note", templates),
      },
      ...templates
        .filter((t) => t.category === "diagnosis")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
    ];
  } else if (sectionId === "treatments") {
    rows = [
      {
        id: "fixed:treatments:note",
        title: "Custom note",
        body: getDocumentBody("fixed:treatments:note", templates),
      },
      ...templates
        .filter((t) => t.category === "treatments")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
    ];
  } else if (sectionId === "other") {
    rows = [
      {
        id: "fixed:other:guarantee",
        title: "Guarantee and Brief Info",
        body: getDocumentBody("fixed:other:guarantee", templates),
      },
      {
        id: "fixed:other:ourclinic",
        title: "Our Clinic",
        body: getDocumentBody("fixed:other:ourclinic", templates),
      },
      ...templates
        .filter((t) => t.category === "other" || t.category === "dentists")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
      {
        id: "fixed:other:note",
        title: "Custom note",
        body: getDocumentBody("fixed:other:note", templates),
      },
    ];
  }

  if (order.length === 0) return rows;
  const map = new Map(rows.map((r) => [r.id, r]));
  const ordered: DocRow[] = [];
  for (const id of order) if (map.has(id)) ordered.push(map.get(id)!);
  for (const row of rows) if (!order.includes(row.id)) ordered.push(row);
  return ordered;
}

function buildPdfPages(selectedDocs: DocRow[], plan: TreatmentPlan, settings: PlanSettings): TreatmentPlanPdfPage[] {
  return [
    { kind: "cover", title: "Cover" },
    ...(settings.planSections.showDiagnosis
      ? [{ kind: "status" as const, title: "Your current dental status" }]
      : []),
    ...buildTreatmentReportPages(plan, settings, selectedDocs.map(({ title, body }) => ({ title, body }))),
    // An uploaded back cover closes the PDF as a full page.
    ...(settings.pageDesign.backCover.backImage ? [{ kind: "back" as const, title: "Back cover" }] : []),

  ];
}

export function OverviewPanel({ plan }: { plan: TreatmentPlan }) {
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const { canUndo, canRedo } = useDocsHistoryState();
  const settings = usePlanSettings();
  const { clinic } = useClinicSession();
  const patient = usePatient(plan.patientId);
  const [layout, setLayout] = useState<"grid" | "single">("grid");
  const [downloading, setDownloading] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const exportContext = useMemo(
    () =>
      buildPdfExportContext({
        clinic,
        patientName: patient?.name,
        plan,
        settings,
      }),
    [clinic, patient?.name, plan, settings],
  );

  const selectedDocs = useMemo(() => {
    const out: DocRow[] = [];
    (["clinic", "diagnosis", "treatments", "other"] as DocSectionId[]).forEach((section) => {
      buildSection(section, templates, order[section]).forEach((doc) => {
        if (selectedSet.has(doc.id)) out.push(doc);
      });
    });
    return out;
  }, [templates, order, selectedSet]);

  const allPages = useMemo(() => buildPdfPages(selectedDocs, plan, settings), [selectedDocs, plan, settings]);
  const pageRefs = useMemo(() => allPages.map(() => createRef<HTMLDivElement>()), [allPages]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const safePatientName = (exportContext.patientName || "patient").replace(
        /[\\/:*?"<>|]+/g,
        "-",
      );
      const safeTreatmentNumber = (exportContext.treatmentNumber || "plan").replace(
        /[\\/:*?"<>|]+/g,
        "-",
      );
      await saveTreatmentPlanPdf({
        fileName: `${safePatientName}-${safeTreatmentNumber}.pdf`,
        pageElements: pageRefs.map((ref) => ref.current),
        settings,
      });
      toast.success("Treatment plan downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download treatment plan.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <main>
        <div className="mb-3 flex justify-end">
          <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <button
              onClick={() => setLayout("grid")}
              className={cn(
                "grid size-9 place-items-center",
                layout === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setLayout("single")}
              className={cn(
                "grid size-9 place-items-center border-l border-border",
                layout === "single"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Square className="size-4" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-4",
            layout === "grid"
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              : "mx-auto max-w-xl grid-cols-1",
          )}
        >
          {allPages.map((page, index) => (
            <PageCard
              key={`${page.kind}-${page.title}-${index}`}
              pageRef={pageRefs[index]}
              page={page}
              index={index + 1}
              total={allPages.length}
              settings={settings}
              plan={plan}
              exportContext={exportContext}
            />
          ))}
        </div>
      </main>

      <RightSidebar
        canUndo={canUndo}
        canRedo={canRedo}
        selectedDocs={selectedDocs}
        settings={settings}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </div>
  );
}

function RightSidebar({
  canUndo,
  canRedo,
  selectedDocs,
  settings,
  onDownload,
  downloading,
}: {
  canUndo: boolean;
  canRedo: boolean;
  selectedDocs: DocRow[];
  settings: ReturnType<typeof usePlanSettings>;
  onDownload: () => Promise<void>;
  downloading: boolean;
}) {
  const price = settings.pricePage;
  const sections = settings.planSections;
  const setPrice = (patch: Partial<typeof price>) =>
    planSettingsStore.update({ pricePage: { ...price, ...patch } });
  const setSections = (patch: Partial<typeof sections>) =>
    planSettingsStore.update({ planSections: { ...sections, ...patch } });
  const [open, setOpen] = useState<"price" | "modules" | null>(null);
  const toggle = (panel: "price" | "modules") => setOpen((current) => (current === panel ? null : panel));

  return (
    <aside className="self-start space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <button
          disabled={!canUndo}
          onClick={() => documentsStore.undo()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40"
        >
          <Undo2 className="size-4 text-muted-foreground" />
          <span>Undo</span>
        </button>
        <button
          disabled={!canRedo}
          onClick={() => documentsStore.redo()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40"
        >
          <Redo2 className="size-4 text-muted-foreground" />
          <span>Redo</span>
        </button>
        <button
          onClick={() => {
            if (confirm("Reset?")) documentsStore.reset();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60"
        >
          <RotateCcw className="size-4 text-muted-foreground" />
          <span>Reset</span>
        </button>
      </div>
      <button
        onClick={() => void onDownload()}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#002036] py-3 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-4" />
        {downloading ? "Downloading..." : "Download"}
      </button>
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="mb-2 px-3 text-xs text-muted-foreground">
          {selectedDocs.length} document pages selected
        </div>
        <PanelButton
          icon={<TableIcon className="size-4 text-muted-foreground" />}
          label="Price table"
          open={open === "price"}
          onClick={() => toggle("price")}
        />
        {open === "price" && (
          <div className="space-y-0.5 pb-2" role="group" aria-label="Price table">
            <CheckRow label="Prices / jaws" checked={price.showJaws} onChange={(v) => setPrice({ showJaws: v })} />
            <CheckRow label="Procedure" checked={price.showVisits} onChange={(v) => setPrice({ showVisits: v })} />
            <CheckRow label="Amount" checked={price.showAmount} onChange={(v) => setPrice({ showAmount: v })} />
            <CheckRow label="Unit price" checked={price.showUnitPrice} onChange={(v) => setPrice({ showUnitPrice: v })} />
            <CheckRow label="Price" checked={price.showPrice} onChange={(v) => setPrice({ showPrice: v })} />
            <CheckRow label="Total" checked={price.showTotal} onChange={(v) => setPrice({ showTotal: v })} />
            <CheckRow label="Fit to page" checked={price.fitToPage} onChange={(v) => setPrice({ fitToPage: v })} />
          </div>
        )}
        <div className="my-2 h-px bg-border" />
        <PanelButton
          icon={<Puzzle className="size-4 text-muted-foreground" />}
          label="Modules"
          open={open === "modules"}
          onClick={() => toggle("modules")}
        />
        {open === "modules" && (
          <div className="space-y-0.5 pb-2" role="group" aria-label="Modules">
            <CheckRow label="Charts" checked={sections.showPlanChart} onChange={(v) => setSections({ showPlanChart: v })} />
            <CheckRow label="Diagnosis" checked={sections.showDiagnosis} onChange={(v) => setSections({ showDiagnosis: v })} />
            <CheckRow label="Page breaks" checked={sections.pageBreaks} onChange={(v) => setSections({ pageBreaks: v })} />
          </div>
        )}
      </div>
    </aside>
  );
}

function PanelButton({
  icon,
  label,
  open,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm hover:bg-muted/60",
        open && "bg-muted",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>{label}</span>
    </label>
  );
}
