import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { jsPDF } from "jspdf";
import {
  Globe,
  DollarSign,
  Undo2,
  Redo2,
  RotateCcw,
  Download,
  Table as TableIcon,
  Puzzle,
  Menu,
  LayoutGrid,
  Square,
  Stethoscope,
  Activity,
  FileText,
  Sparkles,
  ScrollText,
  Smartphone,
  QrCode,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useSelectedIds,
  useSectionOrder,
  useDocsHistoryState,
  documentsStore,
  type DocSectionId,
} from "@/lib/documents-store";
import { useTemplates, type ClinicTemplate } from "@/lib/templates-store";
import { planSettingsStore, usePlanSettings } from "@/lib/plan-settings-store";
import { useTabs } from "@/lib/tabs-store";
import { toast } from "sonner";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Overview — Treatly" },
      { name: "description", content: "Preview the final treatment plan PDF before download." },
    ],
  }),
  component: OverviewPage,
});

const STEPS = [
  { id: "diagnosis", label: "Diagnosis", icon: Stethoscope },
  { id: "treatments", label: "Treatments", icon: Activity },
  { id: "animation", label: "Animation", icon: Sparkles },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "overview", label: "Overview", icon: ScrollText },
] as const;

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
  for (const r of rows) if (!order.includes(r.id)) ordered.push(r);
  return ordered;
}

function OverviewPage() {
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const { canUndo, canRedo } = useDocsHistoryState();
  const settings = usePlanSettings();
  const [layout, setLayout] = useState<"grid" | "single">("grid");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedDocs = useMemo(() => {
    const out: DocRow[] = [];
    (["clinic", "diagnosis", "treatments", "other"] as DocSectionId[]).forEach((s) => {
      buildSection(s, templates, order[s]).forEach((r) => {
        if (selectedSet.has(r.id)) out.push(r);
      });
    });
    return out;
  }, [templates, order, selectedSet]);

  // System pages
  const systemPages: { id: string; kind: PageKind; title: string }[] = [
    { id: "cover", kind: "cover", title: "Cover" },
    { id: "status", kind: "status", title: "Your current dental status" },
    { id: "suggested", kind: "suggested", title: "Your suggested treatment" },
    { id: "animation", kind: "animation", title: "Your 3D treatment animation" },
  ];

  const docPages = selectedDocs.map((d) => ({
    id: d.id,
    kind: "document" as const,
    title: d.title,
    body: d.body,
  }));

  const allPages = [...systemPages, ...docPages];

  return (
    <div className="min-h-screen bg-[oklch(0.93_0.005_240)]">
      <header className="bg-[oklch(0.23_0.06_240)] px-6 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-4 text-white">
            <Link to="/clinic" className="text-lg font-semibold tracking-tight">Treatly</Link>
            <span className="text-sm text-white/80">Elene</span>
            <div className="ml-4 flex items-center gap-1">
              <span className="flex items-center gap-2 rounded-t-md bg-white/10 px-3 py-1.5 text-xs">
                Your suggested treat…
                <button className="opacity-70 hover:opacity-100">×</button>
              </span>
              <button className="grid size-6 place-items-center rounded text-white/80 hover:bg-white/10">+</button>
            </div>
          </div>
          <button className="grid size-9 place-items-center rounded-md text-white/90 hover:bg-white/10">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <StepProgress active="overview" />

      <div className="mx-auto grid max-w-[1600px] gap-5 px-6 py-6 lg:grid-cols-[1fr_240px]">
        {/* Main: pages grid */}
        <main>
          <div className="mb-4 flex justify-end">
            <div className="inline-flex overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <button
                onClick={() => setLayout("grid")}
                className={cn(
                  "grid size-9 place-items-center",
                  layout === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                )}
                title="Grid"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setLayout("single")}
                className={cn(
                  "grid size-9 place-items-center border-l border-border",
                  layout === "single" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50",
                )}
                title="Single"
              >
                <Square className="size-4" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              "grid gap-5",
              layout === "grid" ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 max-w-xl mx-auto",
            )}
          >
            {allPages.map((p, i) => (
              <PageCard
                key={p.id}
                page={p}
                index={i + 1}
                total={allPages.length}
                settings={settings}
              />
            ))}
          </div>
        </main>

        {/* Right sidebar */}
        <RightSidebar canUndo={canUndo} canRedo={canRedo} />
      </div>
    </div>
  );
}

/* ---------- Step Progress ---------- */
function StepProgress({ active }: { active: string }) {
  return (
    <nav className="border-b border-border/60 bg-white">
      <div className="mx-auto flex max-w-[1600px] items-stretch">
        {STEPS.map((s, i) => {
          const isActive = s.id === active;
          const target = s.id === "documents" ? "/documents" : s.id === "overview" ? "/overview" : "/documents";
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <Link
                to={target as any}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition",
                  isActive ? "bg-amber-300 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn(
                  "grid size-7 place-items-center rounded-full text-xs",
                  isActive ? "bg-foreground text-amber-300" : "bg-muted text-foreground/70",
                )}>{i + 1}</span>
                <s.icon className="size-4" />
                <span>{s.label}</span>
              </Link>
              {i < STEPS.length - 1 && <div className="h-6 w-px bg-border/60" />}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- Page Card ---------- */

type PageKind = "cover" | "status" | "suggested" | "animation" | "document";

function PageCard({
  page,
  index,
  total,
  settings,
}: {
  page: { id: string; kind: PageKind; title: string; body?: string };
  index: number;
  total: number;
  settings: ReturnType<typeof usePlanSettings>;
}) {
  return (
    <article
      className="relative flex flex-col rounded-lg border border-border bg-white shadow-sm transition hover:shadow-md"
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {page.kind !== "cover" && (
        <header className="flex items-center justify-between border-b border-border/70 px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
            {sectionHeader(page)}
          </span>
          <Pencil className="size-3 text-muted-foreground" />
        </header>
      )}

      <div className="flex-1 overflow-hidden px-4 py-3">
        {page.kind === "cover" && <CoverContent />}
        {page.kind === "status" && <StatusContent />}
        {page.kind === "suggested" && <SuggestedContent settings={settings} />}
        {page.kind === "animation" && <AnimationContent />}
        {page.kind === "document" && <DocumentContent title={page.title} body={page.body} />}
      </div>

      <footer className="flex items-center justify-center border-t border-border/50 py-1.5 text-[9px] text-muted-foreground">
        {index} / {total} · Made with Treatly
      </footer>
    </article>
  );
}

function sectionHeader(page: { kind: PageKind; title: string }) {
  switch (page.kind) {
    case "status": return "Your current dental status";
    case "suggested": return "Your suggested treatment";
    case "animation": return "Your 3D treatment animation";
    case "document": return "Descriptions and Declarations";
    default: return page.title;
  }
}

function CoverContent() {
  return (
    <div className="flex h-full flex-col items-center justify-between bg-[oklch(0.18_0.04_60)] text-white">
      <div className="w-full bg-[oklch(0.15_0.04_60)] px-6 py-4 text-center">
        <p className="font-serif text-2xl italic text-[oklch(0.85_0.08_85)]">Berge Dent</p>
        <p className="mt-1 text-[9px] tracking-[0.2em] text-[oklch(0.85_0.08_85)]/80">
          VADISTANBUL / ATAKÖY
        </p>
        <p className="mt-0.5 text-[8px] tracking-wider text-white/70">
          Esthetic Dentistry & Implantology
        </p>
      </div>
      <div className="grid flex-1 w-full place-items-center bg-[oklch(0.85_0.02_60)]">
        <div className="text-center text-[oklch(0.3_0.04_60)]">
          <p className="text-[10px] tracking-[0.3em]">TREATMENT PLAN</p>
          <p className="mt-1 font-serif text-base italic">Elene</p>
        </div>
      </div>
    </div>
  );
}

function StatusContent() {
  return (
    <div className="space-y-2 text-[8px]">
      <div className="flex items-end justify-center gap-0.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-6 w-2.5 rounded-sm border border-sky-300/70 bg-white" />
            <span className="mt-0.5 text-[6px] text-muted-foreground">{i + 11}</span>
          </div>
        ))}
      </div>
      <div className="flex items-start justify-center gap-0.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="mb-0.5 text-[6px] text-muted-foreground">{i + 41}</span>
            <div className="h-6 w-2.5 rounded-sm border border-sky-300/70 bg-white" />
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-0.5">
        <p className="text-[8px] font-semibold text-foreground/80">Diagnosis – Upper jaw</p>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 text-[7px] text-muted-foreground">
            <span>{11 + i}. Intact</span>
            <span>{21 + i}. Intact</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestedContent({ settings }: { settings: ReturnType<typeof usePlanSettings> }) {
  const { showPrices, showSubtotal, showTotal, showInsurance, currency } = settings.pricePage;
  return (
    <div className="space-y-2 text-[8px]">
      <div className="flex items-end justify-center gap-0.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const isTreated = i >= 4 && i <= 8;
          return (
            <div key={i} className="flex flex-col items-center">
              <div className={cn(
                "h-6 w-2.5 rounded-sm border",
                isTreated ? "border-emerald-500 bg-emerald-400" : "border-sky-300/70 bg-white",
              )} />
              <span className="mt-0.5 text-[6px] text-muted-foreground">{i + 11}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-start justify-center gap-0.5">
        {Array.from({ length: 16 }).map((_, i) => {
          const isTreated = i >= 5 && i <= 10;
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="mb-0.5 text-[6px] text-muted-foreground">{i + 41}</span>
              <div className={cn(
                "h-6 w-2.5 rounded-sm border",
                isTreated ? "border-emerald-500 bg-emerald-400" : "border-sky-300/70 bg-white",
              )} />
            </div>
          );
        })}
      </div>

      {showPrices ? (
        <div className="mt-2 space-y-1 rounded border border-border/60 p-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b border-border/50 pb-1 text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Treatment</span><span>Amount</span><span>Unit</span><span>Price</span>
          </div>
          <Row label="Bridge – Metal-ceramic (22-24)" amt="3" unit={`${currency === "USD" ? "$" : ""} 350`} price={`${currency === "USD" ? "$" : ""} 1,050`} />
          <Row label="Bridge – Metal-ceramic (42-47)" amt="6" unit={`${currency === "USD" ? "$" : ""} 400`} price={`${currency === "USD" ? "$" : ""} 2,400`} />
          {showSubtotal && (
            <div className="flex justify-between border-t border-border/50 pt-1 text-[8px] text-foreground/70">
              <span>Subtotal</span><span>$ 3,450</span>
            </div>
          )}
          {showTotal && (
            <div className="flex justify-between border-t border-border/50 pt-1 text-[9px] font-bold">
              <span>Total</span><span>$ 3,450</span>
            </div>
          )}
          {showInsurance && (
            <div className="mt-1 space-y-0.5 border-t border-border/50 pt-1 text-[7px] text-muted-foreground">
              <div className="flex justify-between"><span>Insurance coverage</span><span>$ 100</span></div>
              <div className="flex justify-between"><span>Out of pocket costs</span><span>$ 3,350</span></div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 rounded border border-dashed border-border p-3 text-center text-[8px] italic text-muted-foreground">
          Price information hidden
        </div>
      )}
    </div>
  );
}

function Row({ label, amt, unit, price }: { label: string; amt: string; unit: string; price: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[7px] text-foreground/80">
      <span className="truncate">{label}</span>
      <span>{amt}</span>
      <span>{unit}</span>
      <span>{price}</span>
    </div>
  );
}

function AnimationContent() {
  return (
    <div className="flex h-full flex-col items-center justify-between text-center">
      <div>
        <p className="text-[9px] font-bold tracking-wider text-foreground/80">WATCH YOUR OWN</p>
        <p className="text-[11px] font-bold text-foreground">3D TREATMENT ANIMATION!</p>
      </div>
      <div className="my-2 flex items-center gap-3">
        <Smartphone className="size-10 text-foreground/60" />
        <div className="grid size-14 place-items-center rounded border border-foreground/50">
          <QrCode className="size-10 text-foreground/70" />
        </div>
      </div>
      <p className="text-[8px] font-semibold uppercase tracking-wider">Or click here to view</p>
      <p className="text-[6px] italic text-muted-foreground">[link & QR generated on download]</p>
    </div>
  );
}

function DocumentContent({ title, body }: { title: string; body?: string }) {
  const previewLines = (body || "No content available for preview.")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-foreground">{title}</p>
      <div className="space-y-1 text-[7px] leading-relaxed text-foreground/75">
        {previewLines.map((line, i) => (
          <p key={`${title}-${i}`} className="line-clamp-2">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ---------- Right Sidebar ---------- */

function RightSidebar({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) {
  const settings = usePlanSettings();
  const price = settings.pricePage;
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const tabs = useTabs();
  const activePlanTab = [...tabs].reverse().find((tab) => tab.planId);
  const [downloading, setDownloading] = useState(false);

  const setPrice = (patch: Partial<typeof price>) =>
    planSettingsStore.update({ pricePage: { ...price, ...patch } });

  const handleDownload = async () => {
    const selectedSet = new Set(selectedIds);
    const selectedDocs: DocRow[] = [];

    (["clinic", "diagnosis", "treatments", "other"] as DocSectionId[]).forEach((section) => {
      buildSection(section, templates, order[section]).forEach((doc) => {
        if (selectedSet.has(doc.id)) selectedDocs.push(doc);
      });
    });

    if (selectedDocs.length === 0) {
      toast.error("Select at least one document before downloading.");
      return;
    }

    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 56;
      const contentWidth = pageWidth - margin * 2;

      selectedDocs.forEach((doc, index) => {
        if (index > 0) pdf.addPage();

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(20);
        pdf.text(doc.title, margin, 72);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);

        const paragraphs = (doc.body || "No content available for this document yet.")
          .split(/\n{2,}/)
          .map((item) => item.trim())
          .filter(Boolean);

        let y = 108;
        paragraphs.forEach((paragraph) => {
          const lines = pdf.splitTextToSize(paragraph, contentWidth);
          const neededHeight = lines.length * 16;

          if (y + neededHeight > pageHeight - margin) {
            pdf.addPage();
            y = 72;
          }

          pdf.text(lines, margin, y);
          y += neededHeight + 10;
        });
      });

      const safePlanName = (activePlanTab?.planName || "treatment-plan").replace(/[\\/:*?\"<>|]+/g, "-");
      pdf.save(`${safePlanName}.pdf`);
      toast.success("Treatment plan downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download treatment plan.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <aside className="self-start space-y-3">
      {/* English / Currency */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <Globe className="size-4 text-muted-foreground" />
          <span>English</span>
        </button>
        <button className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <DollarSign className="size-4 text-muted-foreground mt-0.5" />
          <span className="leading-tight text-left">
            USD
            <br />
            <span className="text-[11px] text-muted-foreground">United States do…</span>
          </span>
        </button>
        <div className="my-2 h-px bg-border/60" />
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
          onClick={() => { if (confirm("Reset?")) documentsStore.reset(); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60"
        >
          <RotateCcw className="size-4 text-muted-foreground" />
          <span>Reset</span>
        </button>
      </div>

      {/* Download */}
      <button
        onClick={() => void handleDownload()}
        disabled={downloading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[oklch(0.23_0.06_240)] py-3 text-sm font-medium text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-4" />
        {downloading ? "Downloading..." : "Download"}
      </button>

      {/* Price table popover */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
              <TableIcon className="size-4 text-muted-foreground" />
              <span>Price table</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-72 p-4">
            <h4 className="mb-3 text-sm font-semibold">Price table options</h4>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <Checkbox
                  checked={price.showPrices}
                  onCheckedChange={(v) => setPrice({ showPrices: !!v })}
                />
                <span className="font-medium">Show prices in PDF</span>
              </label>
              <div className="space-y-2 border-t border-border/60 pt-3 pl-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Line items
                </p>
                <CheckRow
                  label="Subtotal"
                  checked={price.showSubtotal}
                  disabled={!price.showPrices}
                  onChange={(v) => setPrice({ showSubtotal: v })}
                />
                <CheckRow
                  label="Discount"
                  checked={price.showDiscount}
                  disabled={!price.showPrices}
                  onChange={(v) => setPrice({ showDiscount: v })}
                />
                <CheckRow
                  label="Tax"
                  checked={price.showTax}
                  disabled={!price.showPrices}
                  onChange={(v) => setPrice({ showTax: v })}
                />
                <CheckRow
                  label="Total"
                  checked={price.showTotal}
                  disabled={!price.showPrices}
                  onChange={(v) => setPrice({ showTotal: v })}
                />
                <CheckRow
                  label="Insurance coverage"
                  checked={price.showInsurance}
                  disabled={!price.showPrices}
                  onChange={(v) => setPrice({ showInsurance: v })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
          <Puzzle className="size-4 text-muted-foreground" />
          <span>Modules</span>
        </button>
      </div>
    </aside>
  );
}

function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn("flex items-center gap-3 text-sm", disabled && "opacity-40")}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => onChange(!!v)}
      />
      <span>{label}</span>
    </label>
  );
}
