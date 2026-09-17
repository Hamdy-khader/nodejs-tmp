import { useMemo } from "react";
import {
  Undo2, Redo2, RotateCcw, Pencil,
} from "lucide-react";
import { DocumentSection } from "./DocumentSection";
import {
  documentsStore, useSelectedIds, useSectionOrder, useDocsHistoryState, type DocSectionId,
} from "@/lib/documents-store";
import { useTemplates, type ClinicTemplate } from "@/lib/templates-store";

interface DocRow {
  id: string;
  title: string;
  hasVideo?: boolean;
  isCustomNote?: boolean;
  fromTemplate?: ClinicTemplate;
}

const VIDEO_HINT = /(crown|implant|bridge|veneer|inlay|onlay|maryland|zirconium|titanium)/i;

function buildSection(sectionId: DocSectionId, templates: ClinicTemplate[], order: string[]): DocRow[] {
  let rows: DocRow[] = [];
  if (sectionId === "clinic") {
    rows = [
      { id: "fixed:clinic:demo", title: "Demo Dentist" },
      { id: "fixed:clinic:note", title: "Custom note", isCustomNote: true },
    ];
  } else if (sectionId === "diagnosis") {
    rows = [
      { id: "fixed:diagnosis:note", title: "Custom note", isCustomNote: true },
      ...templates.filter((t) => t.category === "diagnosis").sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, fromTemplate: t })),
    ];
  } else if (sectionId === "treatments") {
    rows = [
      { id: "fixed:treatments:note", title: "Custom note", isCustomNote: true },
      ...templates.filter((t) => t.category === "treatments").sort((a, b) => a.order - b.order)
        .map((t) => ({ id: t.id, title: t.title, hasVideo: VIDEO_HINT.test(t.title), fromTemplate: t })),
    ];
  } else if (sectionId === "other") {
    rows = [
      { id: "fixed:other:guarantee", title: "Guarantee and Brief Info" },
      { id: "fixed:other:ourclinic", title: "Our Clinic" },
      ...templates.filter((t) => t.category === "other" || t.category === "dentists").sort((a, b) => a.order - b.order)
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

const LINE_WIDTHS = [92, 78, 88, 70, 95, 82, 65, 90, 74, 86];

export function DocumentsPanel() {
  const templates = useTemplates();
  const selectedIds = useSelectedIds();
  const order = useSectionOrder();
  const { canUndo, canRedo } = useDocsHistoryState();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sections = useMemo(() => ({
    clinic: buildSection("clinic", templates, order.clinic),
    diagnosis: buildSection("diagnosis", templates, order.diagnosis),
    treatments: buildSection("treatments", templates, order.treatments),
    other: buildSection("other", templates, order.other),
  }), [templates, order]);

  const previewDocs = useMemo(() => {
    const out: DocRow[] = [];
    (["clinic", "diagnosis", "treatments", "other"] as const).forEach((s) => {
      sections[s].forEach((r: DocRow) => { if (selectedSet.has(r.id)) out.push(r); });
    });
    return out;
  }, [sections, selectedSet]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_200px]">
      <PdfPreviewPanel documents={previewDocs} />
      <main className="space-y-6 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <DocumentSection section={{ id: "clinic", label: "THE CLINIC" }} items={sections.clinic} selectedSet={selectedSet} />
        <OpgSection />
        <DocumentSection section={{ id: "diagnosis", label: "DIAGNOSIS DESCRIPTIONS", subtitle: "Based upon the patient's diagnosis" }} items={sections.diagnosis} selectedSet={selectedSet} />
        <DocumentSection section={{ id: "treatments", label: "TREATMENT DESCRIPTIONS", subtitle: "Based upon the added treatments" }} items={sections.treatments} selectedSet={selectedSet} />
        <DocumentSection section={{ id: "other", label: "OTHER DOCUMENTS" }} items={sections.other} selectedSet={selectedSet} />
      </main>
      <RightActionSidebar canUndo={canUndo} canRedo={canRedo} />
    </div>
  );
}

function PdfPreviewPanel({ documents }: { documents: DocRow[] }) {
  return (
    <aside className="self-start rounded-2xl border border-border/60 bg-[#e5e8eb] p-3 shadow-inner" style={{ maxHeight: "calc(100vh - 200px)" }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">PDF Preview</span>
        <span className="text-[11px] text-muted-foreground">{documents.length} pages</span>
      </div>
      <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {documents.length === 0 && (
          <p className="rounded-md border border-dashed border-border bg-white p-4 text-center text-xs text-muted-foreground">No documents selected.</p>
        )}
        {documents.map((d, i) => (
          <div key={d.id} className="group relative rounded-md border border-border bg-white shadow-sm" style={{ aspectRatio: "1 / 1.35" }}>
            <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md bg-[#0076d2] px-2 py-0.5 text-[9px] font-medium text-white shadow-sm">
              <span className="max-w-[120px] truncate">{d.title}</span>
              <Pencil className="size-2.5 opacity-80" />
            </div>
            <div className="flex h-full flex-col gap-1 px-3 pb-2 pt-8">
              {LINE_WIDTHS.map((w, k) => (
                <div key={k} className="h-[3px] rounded bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground">{i + 1}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function OpgSection() {
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">OPG X-RAYS</h3>
      <p className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">Upload an OPG X-ray in the diagnosis tab</p>
    </section>
  );
}

function RightActionSidebar({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) {
  return (
    <aside className="self-start rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <button disabled={!canUndo} onClick={() => documentsStore.undo()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40">
        <Undo2 className="size-4 text-muted-foreground" /><span>Undo</span>
      </button>
      <button disabled={!canRedo} onClick={() => documentsStore.redo()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60 disabled:opacity-40">
        <Redo2 className="size-4 text-muted-foreground" /><span>Redo</span>
      </button>
      <div className="my-2 h-px bg-border/60" />
      <button onClick={() => { if (confirm("Reset documents to defaults?")) documentsStore.reset(); }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10">
        <RotateCcw className="size-4" /><span>Reset</span>
      </button>
    </aside>
  );
}


