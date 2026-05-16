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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  documentsStore,
  useDocuments,
  useDocsHistoryState,
  type DocSectionId,
  type DocumentItem,
} from "@/lib/documents-store";

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

const SECTIONS: { id: DocSectionId; label: string }[] = [
  { id: "clinic", label: "THE CLINIC" },
  { id: "opg", label: "OPG X-RAYS" },
  { id: "diagnosis", label: "DIAGNOSIS DESCRIPTIONS" },
  { id: "treatments", label: "TREATMENT DESCRIPTIONS" },
  { id: "other", label: "OTHER DOCUMENTS" },
];

function DocumentsPage() {
  const items = useDocuments();
  const { canUndo, canRedo } = useDocsHistoryState();

  const selected = useMemo(
    () => items.filter((i) => i.selected).sort((a, b) => a.order - b.order),
    [items],
  );

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.005_160)]">
      {/* Top navbar */}
      <header className="bg-[oklch(0.23_0.06_240)] px-6 py-4">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-6 text-white">
            <Link to="/" className="text-lg font-semibold tracking-tight">BrightPlans</Link>
            <span className="text-sm text-white/80">Elene</span>
          </div>
          <button className="grid size-9 place-items-center rounded-md text-white/90 hover:bg-white/10">
            <span className="block h-0.5 w-5 bg-current shadow-[0_-6px_0_currentColor,0_6px_0_currentColor]" />
          </button>
        </div>
      </header>

      {/* Step progress */}
      <StepProgress active="documents" />

      <div className="mx-auto grid max-w-[1500px] gap-5 px-6 py-6 lg:grid-cols-[280px_1fr_220px]">
        {/* PDF Preview */}
        <PdfPreviewPanel documents={selected} />

        {/* Main */}
        <main className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {SECTIONS.map((s) => (
            <DocumentSection
              key={s.id}
              section={s}
              items={items.filter((i) => i.section === s.id).sort((a, b) => a.order - b.order)}
            />
          ))}
        </main>

        {/* Right action sidebar */}
        <RightActionSidebar canUndo={canUndo} canRedo={canRedo} />
      </div>
    </div>
  );
}

/* ---------- StepProgress ---------- */

function StepProgress({ active }: { active: string }) {
  return (
    <nav className="border-b border-border/60 bg-white">
      <div className="mx-auto flex max-w-[1500px] items-stretch">
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

function PdfPreviewPanel({ documents }: { documents: DocumentItem[] }) {
  return (
    <aside className="self-start rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          PDF Preview
        </span>
        <span className="text-[11px] text-muted-foreground">{documents.length} pages</span>
      </div>
      <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "70vh" }}>
        {documents.length === 0 && (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No documents selected.
          </p>
        )}
        {documents.map((d, i) => (
          <div
            key={d.id}
            className="group relative flex aspect-[1/1.3] flex-col rounded-md border border-border bg-white p-2 shadow-sm transition hover:shadow-md"
          >
            <div className="border-b border-border/60 pb-1 text-[8px] font-semibold uppercase tracking-wider text-foreground/70">
              {d.title}
            </div>
            <div className="flex-1 space-y-1 pt-2">
              {Array.from({ length: 8 }).map((_, k) => (
                <div
                  key={k}
                  className="h-0.5 rounded bg-muted"
                  style={{ width: `${50 + Math.random() * 50}%` }}
                />
              ))}
            </div>
            <div className="text-right text-[7px] text-muted-foreground">{i + 1}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ---------- DocumentSection ---------- */

function DocumentSection({
  section,
  items,
}: {
  section: { id: DocSectionId; label: string };
  items: DocumentItem[];
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
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {section.label}
      </h3>
      <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
        {items.map((it) => (
          <DocumentRow
            key={it.id}
            item={it}
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
  onDragStart,
  onDrop,
}: {
  item: DocumentItem;
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
        className={cn(
          "grid size-5 place-items-center rounded border transition",
          item.selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-white hover:border-primary",
        )}
      >
        {item.selected && <Check className="size-3.5" />}
      </button>
      <FileText className="size-4 text-muted-foreground/80" />
      <span
        className={cn(
          "flex-1 text-sm",
          item.selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {item.title}
      </span>
      {item.hasVideo && (
        <span className="grid size-6 place-items-center rounded-full bg-destructive/10 text-destructive">
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
        <span>Language</span>
      </button>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
        <DollarSign className="size-4 text-muted-foreground" />
        <span>Currency</span>
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
