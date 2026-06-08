import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  GripVertical,
  X,
  Pencil,
  Plus,
  Globe,
  Stethoscope,
  ClipboardList,
  UserRound,
  MoreHorizontal,
  Youtube,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Columns2,
  Columns3,
  Columns4,
  Image as ImageIcon,
  UserCog,
  Code2,
  Save,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  templatesStore,
  useTemplates,
  type ClinicTemplate,
  type TemplateCategory,
} from "@/lib/templates-store";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Templates — BrightPlans" },
      { name: "description", content: "Manage your clinic document templates." },
    ],
  }),
  component: TemplatesPage,
});

const SIDE_ITEMS: { id: TemplateCategory; label: string; icon: typeof FileText }[] = [
  { id: "diagnosis", label: "Diagnosis", icon: Stethoscope },
  { id: "treatments", label: "Treatments", icon: ClipboardList },
  { id: "dentists", label: "Dentists", icon: UserRound },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

function TemplatesPage() {
  const all = useTemplates();
  const [active, setActive] = useState<TemplateCategory>("treatments");
  const [editing, setEditing] = useState<ClinicTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const dragId = useRef<string | null>(null);

  const items = useMemo(
    () => all.filter((t) => t.category === active).sort((a, b) => a.order - b.order),
    [all, active],
  );

  const onDrop = (targetId: string) => {
    if (!dragId.current || dragId.current === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId.current);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    templatesStore.reorder(active, ids);
    dragId.current = null;
  };

  const openNew = () => {
    setEditing({
      id: "",
      title: "",
      category: active,
      language: "English",
      body: "",
      order: 0,
      updatedAt: Date.now(),
    });
    setOpen(true);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.005_160)] px-6 py-8">
      <div className="mx-auto flex max-w-[1400px] gap-6">
        {/* Main panel */}
        <section className="flex-1 rounded-2xl border border-border/60 bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h1 className="text-xl font-semibold uppercase tracking-[0.18em] text-primary">
              Templates
            </h1>
            <button className="flex items-center gap-2 rounded-full bg-primary-deep px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary-deep/90">
              <span className="grid size-7 place-items-center rounded-full bg-destructive">
                <Youtube className="size-4 text-white" />
              </span>
              <span className="leading-tight text-left">
                Tutorial<br />Templates
              </span>
            </button>
          </header>

          <ul className="divide-y divide-border/50">
            {items.map((t) => (
              <li
                key={t.id}
                draggable
                onDragStart={() => (dragId.current = t.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(t.id)}
                className="group flex items-center gap-3 px-6 py-3 hover:bg-muted/40"
              >
                <GripVertical className="size-4 cursor-grab text-muted-foreground/60" />
                <FileText className="size-5 text-muted-foreground/80" />
                <button
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                  className="flex-1 text-left text-[15px] text-foreground hover:text-primary"
                >
                  {t.title}
                </button>
                <button
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                  className="opacity-0 transition group-hover:opacity-100"
                  title="Edit"
                >
                  <Pencil className="size-4 text-muted-foreground hover:text-primary" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${t.title}"?`)) templatesStore.remove(t.id);
                  }}
                  title="Delete"
                >
                  <X className="size-4 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                No templates yet. Click <span className="font-medium">New</span> to add one.
              </li>
            )}
          </ul>

          <footer className="border-t border-border/50 px-6 py-5 text-center text-sm text-muted-foreground">
            You can edit the descriptions for your custom treatments in the{" "}
            <a className="text-primary underline" href="/clinic-fees">
              pricelist
            </a>
          </footer>
        </section>

        {/* Right rail */}
        <aside className="w-64 shrink-0 self-start rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
            <Globe className="size-4 text-muted-foreground" />
            <span>English</span>
          </button>
          <div className="my-2 h-px bg-border/60" />
          {SIDE_ITEMS.map((it) => {
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-primary-soft text-primary-deep"
                    : "text-foreground hover:bg-muted/60",
                )}
              >
                <it.icon className="size-4" />
                <span>{it.label}</span>
              </button>
            );
          })}
          <div className="my-2 h-px bg-border/60" />
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/60">
            <Youtube className="size-4 text-destructive" />
            <span>Videos</span>
          </button>
          <div className="my-2 h-px bg-border/60" />
          <button
            onClick={openNew}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-primary-soft"
          >
            <Plus className="size-4" />
            <span>New</span>
          </button>
        </aside>
      </div>

      <TemplateEditorDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
      />
    </div>
  );
}

/* ============== Editor Dialog ============== */

type Align = "left" | "center" | "right" | "justify";

function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  template: ClinicTemplate | null;
}) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [touched, setTouched] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sync when opening a different template
  useMemo(() => {
    setTitle(template?.title ?? "");
    setBody(template?.body ?? "");
    setTouched(false);
    queueMicrotask(() => {
      if (editorRef.current) editorRef.current.innerHTML = template?.body ?? "";
    });
  }, [template?.id, open]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    if (editorRef.current) setBody(editorRef.current.innerHTML);
  };

  const insertHTML = (html: string) => {
    document.execCommand("insertHTML", false, html);
    if (editorRef.current) setBody(editorRef.current.innerHTML);
  };

  const insertColumns = (n: number) => {
    const cells = Array.from({ length: n })
      .map(() => `<td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">&nbsp;</td>`)
      .join("");
    insertHTML(
      `<table style="width:100%;border-collapse:collapse;margin:8px 0;"><tbody><tr>${cells}</tr></tbody></table><p></p>`,
    );
  };

  const insertImage = () => {
    const url = window.prompt("Image URL");
    if (url) insertHTML(`<img src="${url}" style="max-width:100%;" />`);
  };

  const insertPatientData = () => {
    const choice = window.prompt(
      "Insert patient field (name | phone | email | dob)",
      "name",
    );
    if (!choice) return;
    insertHTML(`<span data-patient="${choice}" style="background:#e0f2fe;padding:0 4px;border-radius:3px;">{{patient.${choice}}}</span>&nbsp;`);
  };

  const editSource = () => {
    const next = window.prompt("Edit HTML source", body);
    if (next != null) {
      setBody(next);
      if (editorRef.current) editorRef.current.innerHTML = next;
    }
  };

  const save = () => {
    setTouched(true);
    if (!title.trim()) return;
    templatesStore.upsert({
      id: template?.id || undefined,
      title: title.trim(),
      category: template?.category ?? "treatments",
      language: template?.language ?? "English",
      body,
    });
    onOpenChange(false);
  };

  const isNew = !template?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-[1100px] flex-col gap-0 overflow-hidden p-0">
        {/* Fixed header */}
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/40 px-6 py-4">
          <DialogTitle className="text-base font-medium">
            {isNew ? "New template" : `Edit template: ${template?.title ?? ""}`}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Template title"
              className={cn(
                "h-11 rounded-none border-0 border-b px-0 text-lg shadow-none focus-visible:ring-0",
                touched && !title.trim() && "border-destructive",
              )}
            />
            {touched && !title.trim() && (
              <p className="mt-1 text-xs text-destructive">Required field</p>
            )}
          </div>

          <div className="grid grid-cols-[260px_1fr] gap-5 p-6">
            {/* Tools */}
            <div className="space-y-5">
              <ToolGroup label="Format">
                <ToolBtn icon={Bold} label="Bold" onClick={() => exec("bold")} />
                <ToolBtn icon={Italic} label="Italic" onClick={() => exec("italic")} />
                <ToolBtn icon={Underline} label="Underline" onClick={() => exec("underline")} />
              </ToolGroup>

              <ToolGroup label="Alignments">
                <ToolBtn icon={AlignLeft} label="Left" onClick={() => exec("justifyLeft")} />
                <ToolBtn icon={AlignCenter} label="Center" onClick={() => exec("justifyCenter")} />
                <ToolBtn icon={AlignRight} label="Right" onClick={() => exec("justifyRight")} />
                <ToolBtn icon={AlignJustify} label="Justify" onClick={() => exec("justifyFull")} />
              </ToolGroup>

              <ToolGroup label="Layouts">
                <ToolBtn icon={Columns2} label="2 Columns" onClick={() => insertColumns(2)} />
                <ToolBtn icon={Columns3} label="3 Columns" onClick={() => insertColumns(3)} />
                <ToolBtn icon={Columns4} label="4 Columns" onClick={() => insertColumns(4)} />
              </ToolGroup>

              <ToolGroup label="Media">
                <ToolBtn icon={ImageIcon} label="Image" onClick={insertImage} />
              </ToolGroup>

              <ToolGroup label="Advanced">
                <ToolBtn icon={UserCog} label="Patient data" onClick={insertPatientData} />
                <ToolBtn icon={Code2} label="Source" onClick={editSource} />
              </ToolGroup>
            </div>

            {/* Canvas */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setBody((e.target as HTMLDivElement).innerHTML)}
              className="min-h-[460px] rounded-md border border-border bg-white p-5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40 [&_table]:w-full [&_td]:p-2"
            />
          </div>
        </div>

        {/* Fixed footer */}
        <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/30 px-6 py-3">
          <Button onClick={save} className="gap-2">
            <Save className="size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-border bg-card p-2 text-[11px] font-medium text-foreground transition hover:border-primary hover:bg-primary-soft hover:text-primary-deep"
    >
      <Icon className="size-4" />
      <span className="leading-none">{label}</span>
    </button>
  );
}
