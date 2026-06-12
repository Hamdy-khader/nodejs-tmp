import { createRef, useMemo, useState } from "react";
import {
  Globe,
  DollarSign,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Table as TableIcon,
  Puzzle,
  LayoutGrid,
  Square,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  STATUS_META,
  type TreatmentItem,
  type TreatmentPlan,
  type TreatmentRow,
  type ToothState,
} from "@/lib/patients-store";
import { TeethChart, ToothIllustration } from "@/components/TeethChart";
import { toast } from "sonner";

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

function buildSection(sectionId: DocSectionId, templates: ClinicTemplate[], order: string[]): DocRow[] {
  let rows: DocRow[] = [];
  if (sectionId === "clinic") {
    rows = [
      { id: "fixed:clinic:demo", title: "Demo Dentist", body: getDocumentBody("fixed:clinic:demo", templates) },
      { id: "fixed:clinic:note", title: "Custom note", body: getDocumentBody("fixed:clinic:note", templates) },
    ];
  } else if (sectionId === "diagnosis") {
    rows = [
      { id: "fixed:diagnosis:note", title: "Custom note", body: getDocumentBody("fixed:diagnosis:note", templates) },
      ...templates
        .filter((t) => t.category === "diagnosis")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
    ];
  } else if (sectionId === "treatments") {
    rows = [
      { id: "fixed:treatments:note", title: "Custom note", body: getDocumentBody("fixed:treatments:note", templates) },
      ...templates
        .filter((t) => t.category === "treatments")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
    ];
  } else if (sectionId === "other") {
    rows = [
      { id: "fixed:other:guarantee", title: "Guarantee and Brief Info", body: getDocumentBody("fixed:other:guarantee", templates) },
      { id: "fixed:other:ourclinic", title: "Our Clinic", body: getDocumentBody("fixed:other:ourclinic", templates) },
      ...templates
        .filter((t) => t.category === "other" || t.category === "dentists")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, body: getDocumentBody(t.id, templates) })),
      { id: "fixed:other:note", title: "Custom note", body: getDocumentBody("fixed:other:note", templates) },
    ];
  }

  if (order.length === 0) return rows;
  const map = new Map(rows.map((r) => [r.id, r]));
  const ordered: DocRow[] = [];
  for (const id of order) if (map.has(id)) ordered.push(map.get(id)!);
  for (const row of rows) if (!order.includes(row.id)) ordered.push(row);
  return ordered;
}

function buildPdfPages(selectedDocs: DocRow[]): TreatmentPlanPdfPage[] {
  return [
    { kind: "cover", title: "Cover" },
    { kind: "status", title: "Your current dental status" },
    { kind: "suggested", title: "Your suggested treatment" },
    ...selectedDocs.map((doc) => ({
      kind: "document" as const,
      title: doc.title,
      body: doc.body,
    })),
    { kind: "back", title: "Back cover" },
  ];
}

function getTreatmentCounts(plan: TreatmentPlan) {
  const counts: Record<number, number> = {};
  for (const row of plan.treatments ?? []) {
    if (row.kind !== "visit") continue;
    for (const item of row.items) {
      if (item.toothNumber == null) continue;
      counts[item.toothNumber] = (counts[item.toothNumber] ?? 0) + 1;
    }
  }
  return counts;
}

function getTotals(rows: TreatmentRow[]) {
  let subtotal = 0;
  for (const row of rows) {
    if (row.kind === "visit") {
      for (const item of row.items) subtotal += item.amount * item.unitPrice;
    }
  }
  let discount = 0;
  for (const row of rows) {
    if (row.kind === "discount") {
      discount += row.mode === "percent" ? (subtotal * row.value) / 100 : row.value;
    }
  }
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

function getBaseLabel(tooth: ToothState) {
  return tooth.note || (tooth.status !== "intact" ? STATUS_META[tooth.status].label : "");
}

function getAffectedTeeth(plan: TreatmentPlan) {
  return Object.values(plan.teeth)
    .filter((tooth) => tooth.status !== "intact" || (tooth.diagnosis?.length ?? 0) > 0 || tooth.note)
    .sort((a, b) => a.number - b.number);
}

export function OverviewPanel({ plan }: { plan: TreatmentPlan }) {
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const { canUndo, canRedo } = useDocsHistoryState();
  const settings = usePlanSettings();
  const [layout, setLayout] = useState<"grid" | "single">("grid");
  const [downloading, setDownloading] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedDocs = useMemo(() => {
    const out: DocRow[] = [];
    (["clinic", "diagnosis", "treatments", "other"] as DocSectionId[]).forEach((section) => {
      buildSection(section, templates, order[section]).forEach((doc) => {
        if (selectedSet.has(doc.id)) out.push(doc);
      });
    });
    return out;
  }, [templates, order, selectedSet]);

  const allPages = useMemo(() => buildPdfPages(selectedDocs), [selectedDocs]);
  const pageRefs = useMemo(() => allPages.map(() => createRef<HTMLDivElement>()), [allPages]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const safePlanName = (plan.name || "treatment-plan").replace(/[\\/:*?"<>|]+/g, "-");
      await saveTreatmentPlanPdf({
        fileName: `${safePlanName}.pdf`,
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
              className={cn("grid size-9 place-items-center", layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setLayout("single")}
              className={cn("grid size-9 place-items-center border-l border-border", layout === "single" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
            >
              <Square className="size-4" />
            </button>
          </div>
        </div>

        <div className={cn("grid gap-4", layout === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "mx-auto max-w-xl grid-cols-1")}>
          {allPages.map((page, index) => (
            <PageCard
              key={`${page.kind}-${page.title}-${index}`}
              pageRef={pageRefs[index]}
              page={page}
              index={index + 1}
              total={allPages.length}
              settings={settings}
              plan={plan}
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

const PageCard = ({
  page,
  index,
  total,
  settings,
  plan,
  pageRef,
}: {
  page: TreatmentPlanPdfPage;
  index: number;
  total: number;
  settings: ReturnType<typeof usePlanSettings>;
  plan: TreatmentPlan;
  pageRef: React.RefObject<HTMLDivElement | null>;
}) => {
  return (
    <article
      ref={pageRef}
      className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {page.kind !== "cover" && (
        <header className="flex items-center justify-between border-b border-border/70 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">{sectionHeader(page)}</span>
          <Pencil className="size-3 text-muted-foreground" />
        </header>
      )}
      <div className="flex-1 overflow-hidden px-4 py-3">
        {page.kind === "cover" && <CoverContent settings={settings} />}
        {page.kind === "status" && <StatusContent plan={plan} />}
        {page.kind === "suggested" && <SuggestedContent plan={plan} settings={settings} />}
        {page.kind === "document" && <DocumentContent title={page.title} body={page.body} />}
        {page.kind === "back" && <BackCoverContent settings={settings} />}
      </div>
      {page.kind !== "cover" && page.kind !== "back" && settings.pageDesign.innerPages.showFooter && (
        <footer className="flex items-center justify-between border-t border-border/50 px-4 py-1.5 text-[9px] text-muted-foreground">
          <span>{settings.pageDesign.innerPages.footerLeft}</span>
          <span>{index} / {total}</span>
          <span>{settings.pageDesign.innerPages.footerRight}</span>
        </footer>
      )}
    </article>
  );
};

function sectionHeader(page: TreatmentPlanPdfPage) {
  switch (page.kind) {
    case "status":
      return "Your current dental status";
    case "suggested":
      return "Your suggested treatment";
    case "document":
      return "Descriptions and Declarations";
    default:
      return page.title;
  }
}

function CoverContent({ settings }: { settings: ReturnType<typeof usePlanSettings> }) {
  const { frontCover } = settings.pageDesign;
  return (
    <div className="flex h-full flex-col items-center justify-between bg-[oklch(0.18_0.04_60)] text-white">
      <div className="w-full bg-[oklch(0.15_0.04_60)] px-6 py-4 text-center">
        <p className="font-serif text-2xl italic text-[oklch(0.85_0.08_85)]">{frontCover.clinicName}</p>
      </div>
      <div className="grid w-full flex-1 place-items-center bg-[oklch(0.85_0.02_60)]">
        <div className="text-center text-[oklch(0.3_0.04_60)]">
          <p className="text-[10px] tracking-[0.3em]">{frontCover.title}</p>
          <p className="mt-1 font-serif text-base italic">{frontCover.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function StatusContent({ plan }: { plan: TreatmentPlan }) {
  const affected = getAffectedTeeth(plan);
  const treatmentCounts = getTreatmentCounts(plan);

  return (
    <div className="space-y-3 text-[8px]">
      <div className="rounded-xl border border-border/60 bg-slate-50 p-2">
        <TeethChart teeth={plan.teeth} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground/80">Problem teeth</p>
          <span className="text-[8px] text-muted-foreground">{affected.length} teeth</span>
        </div>
        {affected.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center italic text-muted-foreground">
            No diagnosis added yet.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {affected.slice(0, 8).map((tooth) => {
              const meta = STATUS_META[tooth.status];
              return (
                <div key={tooth.number} className="rounded-lg border border-border/60 bg-white p-1.5 text-center">
                  <ToothIllustration number={tooth.number} status={tooth.status} note={tooth.note} className="mx-auto max-w-[26px]" />
                  <p className="mt-1 text-[8px] font-bold">{tooth.number}</p>
                  <p className="truncate text-[7px]" style={{ color: meta.ring }}>{getBaseLabel(tooth)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CompactJawGrid teeth={Object.values(plan.teeth)} treatmentCounts={treatmentCounts} />
    </div>
  );
}

function SuggestedContent({
  plan,
  settings,
}: {
  plan: TreatmentPlan;
  settings: ReturnType<typeof usePlanSettings>;
}) {
  const rows = plan.treatments ?? [];
  const totals = getTotals(rows);
  const treatmentCounts = getTreatmentCounts(plan);
  const treatedTeeth = Object.values(plan.teeth)
    .filter((tooth) => (treatmentCounts[tooth.number] ?? 0) > 0)
    .sort((a, b) => a.number - b.number);
  const { showPrices, showSubtotal, showTotal, showInsurance, currency } = settings.pricePage;
  const sym = currency === "USD" ? "$" : currency;

  return (
    <div className="space-y-3 text-[8px]">
      <div className="rounded-xl border border-border/60 bg-slate-50 p-2">
        <TeethChart teeth={plan.teeth} />
      </div>

      <div className="rounded-lg border border-border/60 bg-white p-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-foreground/80">Teeth with treatment</p>
          <span className="text-[8px] text-muted-foreground">{treatedTeeth.length} teeth</span>
        </div>
        {treatedTeeth.length === 0 ? (
          <p className="text-center italic text-muted-foreground">No treatments added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {treatedTeeth.map((tooth) => (
              <span
                key={tooth.number}
                className="rounded-full bg-[oklch(0.62_0.18_150)]/15 px-2 py-0.5 text-[7px] font-semibold text-[oklch(0.35_0.12_150)]"
              >
                Tooth {tooth.number} · Tx x{treatmentCounts[tooth.number]}
              </span>
            ))}
          </div>
        )}
      </div>

      <CompactTreatmentRows rows={rows} sym={sym} showPrices={showPrices} />

      {showPrices && (
        <div className="rounded-lg border border-border/60 bg-slate-50 p-2 text-[8px]">
          {showSubtotal && (
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{sym} {totals.subtotal.toFixed(0)}</span>
            </div>
          )}
          {totals.discount > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <span>Discount</span>
              <span>- {sym} {totals.discount.toFixed(0)}</span>
            </div>
          )}
          {showTotal && (
            <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1 text-[9px] font-bold">
              <span>Total</span>
              <span>{sym} {totals.total.toFixed(0)}</span>
            </div>
          )}
          {showInsurance && plan.billingMode === "insurance" && plan.insurance && (
            <div className="mt-1 border-t border-border/60 pt-1 text-[7px] text-muted-foreground">
              Estimated insurance view enabled
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CompactJawGrid({
  teeth,
  treatmentCounts,
}: {
  teeth: ToothState[];
  treatmentCounts: Record<number, number>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[teeth.slice(0, 16), teeth.slice(16)].map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-1.5">
          {group.map((tooth) => {
            const meta = STATUS_META[tooth.status];
            const hasStatus = tooth.status !== "intact" || Boolean(tooth.note) || (tooth.diagnosis?.length ?? 0) > 0;
            const label = getBaseLabel(tooth);
            const txCount = treatmentCounts[tooth.number] ?? 0;
            return (
              <div
                key={tooth.number}
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-2 py-1.5",
                  hasStatus ? "border-border/60 bg-card" : "border-border/40 bg-muted/25",
                )}
              >
                <div
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-lg text-center text-[10px] font-bold leading-6"
                  style={hasStatus ? { background: meta.bg, color: meta.ring } : undefined}
                >
                  {tooth.number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[8px] font-semibold", !hasStatus && "text-muted-foreground")}>
                    {label || "Intact - no diagnosis"}
                  </p>
                  {(tooth.diagnosis?.length ?? 0) > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {tooth.diagnosis!.slice(0, 3).map((item) => (
                        <span
                          key={item}
                          className="rounded-full px-1.5 py-0.5 text-[7px] font-medium"
                          style={{ background: meta.bg, color: meta.ring }}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {txCount > 0 && (
                  <span className="rounded-full bg-[#EBF1FB] px-1.5 py-0.5 text-[7px] font-bold text-[#1E4890]">
                    Tx {txCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CompactTreatmentRows({
  rows,
  sym,
  showPrices,
}: {
  rows: TreatmentRow[];
  sym: string;
  showPrices: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_40px_54px_54px] gap-2 px-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Treatment</span>
        <span className="text-right">Amt</span>
        <span className="text-right">Unit</span>
        <span className="text-right">Price</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-center italic text-muted-foreground">
          No treatments added yet.
        </div>
      ) : (
        rows.slice(0, 8).map((row) => (
          <CompactTreatmentRow key={row.id} row={row} sym={sym} showPrices={showPrices} />
        ))
      )}
    </div>
  );
}

function CompactTreatmentRow({
  row,
  sym,
  showPrices,
}: {
  row: TreatmentRow;
  sym: string;
  showPrices: boolean;
}) {
  if (row.kind === "healing") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-[8px]">
        Healing period: {row.days ?? 0} days
      </div>
    );
  }

  if (row.kind === "discount") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 px-2 py-2 text-[8px]">
        Discount: {row.mode === "percent" ? `${row.value}%` : `${sym} ${row.value.toFixed(0)}`}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-white p-2">
      <div className="mb-1 text-[8px] font-bold text-primary">Visit</div>
      <div className="space-y-1">
        {row.items.slice(0, 4).map((item) => (
          <CompactItemRow key={item.id} item={item} sym={sym} showPrices={showPrices} />
        ))}
      </div>
    </div>
  );
}

function CompactItemRow({
  item,
  sym,
  showPrices,
}: {
  item: TreatmentItem;
  sym: string;
  showPrices: boolean;
}) {
  const price = item.amount * item.unitPrice;
  return (
    <div className="grid grid-cols-[1fr_40px_54px_54px] gap-2 text-[7px]">
      <div className="min-w-0">
        <span className="truncate font-medium">
          {item.toothNumber != null ? `#${item.toothNumber} ` : ""}
          {item.name}
        </span>
      </div>
      <span className="text-right">{item.amount}</span>
      <span className="text-right">{showPrices ? `${sym} ${item.unitPrice.toFixed(0)}` : "-"}</span>
      <span className="text-right font-semibold">{showPrices ? `${sym} ${price.toFixed(0)}` : "-"}</span>
    </div>
  );
}

function BackCoverContent({ settings }: { settings: ReturnType<typeof usePlanSettings> }) {
  const { backCover } = settings.pageDesign;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/70">{backCover.title}</p>
      <p className="max-w-[80%] text-[9px] leading-relaxed text-muted-foreground">{backCover.note || "Back cover"}</p>
    </div>
  );
}

function DocumentContent({ title, body }: { title: string; body?: string }) {
  const previewLines = (body || "No content available for preview.")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 14);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-foreground">{title}</p>
      <div className="space-y-1 text-[7px] leading-relaxed text-foreground/75">
        {previewLines.map((line, i) => (
          <p key={`${title}-${i}`} className="line-clamp-2">{line}</p>
        ))}
      </div>
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
  const setPrice = (patch: Partial<typeof price>) =>
    planSettingsStore.update({ pricePage: { ...price, ...patch } });

  return (
    <aside className="self-start space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <Globe className="size-4 text-muted-foreground" /><span>English</span>
        </button>
        <button className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <DollarSign className="mt-0.5 size-4 text-muted-foreground" />
          <span className="text-left leading-tight">USD<br /><span className="text-[11px] text-muted-foreground">United States</span></span>
        </button>
        <div className="my-2 h-px bg-border/60" />
        <button disabled={!canUndo} onClick={() => documentsStore.undo()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40">
          <Undo2 className="size-4 text-muted-foreground" /><span>Undo</span>
        </button>
        <button disabled={!canRedo} onClick={() => documentsStore.redo()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40">
          <Redo2 className="size-4 text-muted-foreground" /><span>Redo</span>
        </button>
        <button onClick={() => { if (confirm("Reset?")) documentsStore.reset(); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <RotateCcw className="size-4 text-muted-foreground" /><span>Reset</span>
        </button>
      </div>
      <button
        onClick={() => void onDownload()}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[oklch(0.23_0.06_240)] py-3 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-4" />
        {downloading ? "Downloading..." : "Download"}
      </button>
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="mb-3 text-xs text-muted-foreground">{selectedDocs.length} document pages selected</div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
              <TableIcon className="size-4 text-muted-foreground" /><span>Price table</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-72 p-4">
            <h4 className="mb-3 text-sm font-semibold">Price table options</h4>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox checked={price.showPrices} onCheckedChange={(v) => setPrice({ showPrices: !!v })} />
                <span className="font-medium">Show prices in PDF</span>
              </label>
              <div className="space-y-2 border-t border-border/60 pt-3 pl-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Line items</p>
                <CheckRow label="Subtotal" checked={price.showSubtotal} disabled={!price.showPrices} onChange={(v) => setPrice({ showSubtotal: v })} />
                <CheckRow label="Discount" checked={price.showDiscount} disabled={!price.showPrices} onChange={(v) => setPrice({ showDiscount: v })} />
                <CheckRow label="Tax" checked={price.showTax} disabled={!price.showPrices} onChange={(v) => setPrice({ showTax: v })} />
                <CheckRow label="Total" checked={price.showTotal} disabled={!price.showPrices} onChange={(v) => setPrice({ showTotal: v })} />
                <CheckRow label="Insurance coverage" checked={price.showInsurance} disabled={!price.showPrices} onChange={(v) => setPrice({ showInsurance: v })} />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <Puzzle className="size-4 text-muted-foreground" /><span>Modules</span>
        </button>
      </div>
    </aside>
  );
}

function CheckRow({ label, checked, disabled, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn("flex items-center gap-3 text-sm", disabled && "opacity-40")}>
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(!!v)} />
      <span>{label}</span>
    </label>
  );
}
