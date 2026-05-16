import { useMemo, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  GripVertical,
  Youtube,
  Globe,
  DollarSign,
  Undo2,
  Redo2,
  RotateCcw,
  Check,
  Stethoscope,
  Activity,
  FileText,
  Sparkles,
  ScrollText,
  Pencil,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  documentsStore,
  useSelectedIds,
  useSectionOrder,
  useDocsHistoryState,
  type DocSectionId,
} from "@/lib/documents-store";
import { useTemplates, type ClinicTemplate } from "@/lib/templates-store";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents — BrightPlans" },
      { name: "description", content: "Choose documents included in the treatment plan PDF." },
    ],
  }),
  component: DocumentsPage,
});

const STEPS = [
  { id: "diagnosis", label: "Diagnosis", icon: Stethoscope },
  { id: "treatments", label: "Treatments", icon: Activity },
  { id: "animation", label: "Animation", icon: Sparkles },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "overview", label: "Overview", icon: ScrollText },
] as const;

/* ============== Item model ============== */

interface DocRow {
  id: string;
  title: string;
  hasVideo?: boolean;
  isCustomNote?: boolean;
  fromTemplate?: ClinicTemplate;
}

const VIDEO_HINT = /(crown|implant|bridge|veneer|inlay|onlay|maryland|zirconium|titanium)/i;

function buildSection(
  sectionId: DocSectionId,
  templates: ClinicTemplate[],
  order: string[],
): DocRow[] {
  let rows: DocRow[] = [];

  if (sectionId === "clinic") {
    rows = [
      { id: "fixed:clinic:demo", title: "Demo Dentist" },
      { id: "fixed:clinic:note", title: "Custom note", isCustomNote: true },
    ];
  } else if (sectionId === "diagnosis") {
    rows = [
      { id: "fixed:diagnosis:note", title: "Custom note", isCustomNote: true },
      ...templates
        .filter((t) => t.category === "diagnosis")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, fromTemplate: t })),
    ];
  } else if (sectionId === "treatments") {
    rows = [
      { id: "fixed:treatments:note", title: "Custom note", isCustomNote: true },
      ...templates
        .filter((t) => t.category === "treatments")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({
          id: t.id,
          title: t.title,
          hasVideo: VIDEO_HINT.test(t.title),
          fromTemplate: t,
        })),
    ];
  } else if (sectionId === "other") {
    rows = [
      { id: "fixed:other:guarantee", title: "Guarantee and Brief Info" },
      { id: "fixed:other:ourclinic", title: "Our Clinic" },
      ...templates
        .filter((t) => t.category === "other" || t.category === "dentists")
        .sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, fromTemplate: t })),
      { id: "fixed:other:note", title: "Custom note", isCustomNote: true },
    ];
  }

  if (order.length === 0) return rows;
  const map = new Map(rows.map((r) => [r.id, r]));
  const ordered: DocRow[] = [];
  for (const id of order) if (map.has(id)) ordered.push(map.get(id)!);
  for (const r of rows) if (!order.includes(r.id)) ordered.push(r);
  return ordered;
}

/* ============== Page ============== */

function DocumentsPage() {
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const { canUndo, canRedo } = useDocsHistoryState();

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sections = useMemo(
    () => ({
      clinic: buildSection("clinic", templates, order.clinic),
      diagnosis: buildSection("diagnosis", templates, order.diagnosis),
      treatments: buildSection("treatments", templates, order.treatments),
      other: buildSection("other", templates, order.other),
    }),
    [templates, order],
  );

  // Preview docs in selection order, respecting section order
  const previewDocs = useMemo(() => {
    const out: DocRow[] = [];
    (["clinic", "diagnosis", "treatments", "other"] as DocSectionId[]).forEach((s) => {
      const list = sections[s as keyof typeof sections];
      list.forEach((r) => {
        if (selectedSet.has(r.id)) out.push(r);
      });
    });
    return out;
  }, [sections, selectedSet]);

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.005_160)]">
      {/* Top navbar */}
      <header className="bg-[oklch(0.23_0.06_240)] px-6 py-3">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-4 text-white">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              BrightPlans
            </Link>
            <span className="text-sm text-white/80">Elene</span>
            <div className="ml-4 flex items-center gap-1">
              <span className="flex items-center gap-2 rounded-t-md bg-white/10 px-3 py-1.5 text-xs">
                Your suggested treat…
                <button className="opacity-70 hover:opacity-100">×</button>
              </span>
              <button className="grid size-6 place-items-center rounded text-white/80 hover:bg-white/10">
                +
              </button>
            </div>
          </div>
          <button className="grid size-9 place-items-center rounded-md text-white/90 hover:bg-white/10">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      <StepProgress active="documents" />

      <div className="mx-auto grid max-w-[1600px] gap-5 px-6 py-6 lg:grid-cols-[300px_1fr_220px]">
        <PdfPreviewPanel documents={previewDocs} />

        <main className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <DocumentSection
            section={{ id: "clinic", label: "THE CLINIC" }}
            items={sections.clinic}
            selectedSet={selectedSet}
          />

          <OpgSection />

          <DocumentSection
            section={{ id: "diagnosis", label: "DIAGNOSIS DESCRIPTIONS", subtitle: "Based upon the patient's diagnosis" }}
            items={sections.diagnosis}
            selectedSet={selectedSet}
          />

          <DocumentSection
            section={{ id: "treatments", label: "TREATMENT DESCRIPTIONS", subtitle: "Based upon the added treatments" }}
            items={sections.treatments}
            selectedSet={selectedSet}
          />

          <DocumentSection
            section={{ id: "other", label: "OTHER DOCUMENTS" }}
            items={sections.other}
            selectedSet={selectedSet}
          />
        </main>

        <RightActionSidebar canUndo={canUndo} canRedo={canRedo} />
      </div>
    </div>
  );
}

/* ---------- StepProgress ---------- */

function StepProgress({ active }: { active: string }) {
  return (
    <nav className="border-b border-border/60 bg-white">
      <div className="mx-auto flex max-w-[1600px] items-stretch">
        {STEPS.map((s, i) => {
          const isActive = s.id === active;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <div
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition",
                  isActive
                    ? "bg-amber-300 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs",
                    isActive ? "bg-foreground text-amber-300" : "bg-muted text-foreground/70",
                  )}
                >
                  {i + 1}
                </span>
                <s.icon className="size-4" />
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-6 w-px bg-border/60" />}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- PdfPreviewPanel ---------- */

// Deterministic widths so SSR === client (no Math.random)
const LINE_WIDTHS = [92, 78, 88, 70, 95, 82, 65, 90, 74, 86];

function PdfPreviewPanel({ documents }: { documents: DocRow[] }) {
  return (
    <aside
      className="self-start rounded-2xl border border-border/60 bg-[oklch(0.93_0.005_240)] p-4 shadow-inner"
      style={{ maxHeight: "calc(100vh - 180px)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          PDF Preview
        </span>
        <span className="text-[11px] text-muted-foreground">{documents.length} pages</span>
      </div>
      <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {documents.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-white p-4 text-center text-xs text-muted-foreground">
            No documents selected.
          </p>
        )}
        {documents.map((d, i) => (
          <div
            key={d.id}
            className="group relative rounded-md border border-border bg-white shadow-sm transition hover:shadow-md"
            style={{ aspectRatio: "1 / 1.35" }}
          >
            {/* Page title chip */}
            <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-[oklch(0.55_0.18_245)] px-2 py-0.5 text-[9px] font-medium text-white shadow-sm">
              <span className="max-w-[140px] truncate">{d.title}</span>
              <Pencil className="size-2.5 opacity-80" />
            </div>

            {/* fake page lines */}
            <div className="flex h-full flex-col gap-1 px-3 pb-2 pt-8">
              {LINE_WIDTHS.map((w, k) => (
                <div
                  key={k}
                  className="h-[3px] rounded bg-muted"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>

            <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground">
              {i + 1}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ---------- OPG (read-only info) ---------- */

function OpgSection() {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        OPG X-RAYS
      </h3>
      <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Upload an OPG X-ray in the diagnosis tab
      </p>
    </section>
  );
}

/* ---------- DocumentSection ---------- */

function DocumentSection({
  section,
  items,
  selectedSet,
}: {
  section: { id: DocSectionId; label: string; subtitle?: string };
  items: DocRow[];
  selectedSet: Set<string>;
}) {
  const dragId = useRef<string | null>(null);

  const onDrop = (targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId.current);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    documentsStore.reorder(section.id, ids);
    dragId.current = null;
  };

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {section.label}
      </h3>
      {section.subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{section.subtitle}</p>
      )}
      <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
        {items.map((it) => (
          <DocumentRow
            key={it.id}
            item={it}
            selected={selectedSet.has(it.id)}
            onDragStart={() => (dragId.current = it.id)}
            onDrop={() => onDrop(it.id)}
          />
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-muted-foreground">
            No items in this section.
          </li>
        )}
      </ul>
    </section>
  );
}

/* ---------- DocumentRow ---------- */

function DocumentRow({
  item,
  selected,
  onDragStart,
  onDrop,
}: {
  item: DocRow;
  selected: boolean;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40"
    >
      <GripVertical className="size-4 cursor-grab text-muted-foreground/60" />
      <button
        onClick={() => documentsStore.toggle(item.id)}
        aria-pressed={selected}
        className={cn(
          "grid size-5 place-items-center rounded border transition",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-white hover:border-primary",
        )}
      >
        {selected && <Check className="size-3.5" />}
      </button>
      <span
        className={cn(
          "flex-1 text-sm",
          selected ? "text-foreground" : "text-muted-foreground",
          item.isCustomNote && "italic",
        )}
      >
        {item.title}
      </span>
      {item.hasVideo && (
        <span className="grid size-6 place-items-center rounded bg-muted text-muted-foreground">
          <Youtube className="size-3.5" />
        </span>
      )}
    </li>
  );
}

/* ---------- RightActionSidebar ---------- */

function RightActionSidebar({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) {
  return (
    <aside className="self-start rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
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
      <div className="my-2 h-px bg-border/60" />
      <button
        onClick={() => {
          if (confirm("Reset documents to defaults?")) documentsStore.reset();
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
      >
        <RotateCcw className="size-4" />
        <span>Reset</span>
      </button>
    </aside>
  );
}
