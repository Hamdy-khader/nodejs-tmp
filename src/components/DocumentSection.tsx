import { useRef, useState } from "react";
import { Check, GripVertical, Youtube } from "lucide-react";
import { documentsStore, type DocSectionId } from "@/lib/documents-store";
import { cn } from "@/lib/utils";

interface DocumentItem { id: string; title: string; isCustomNote?: boolean; hasVideo?: boolean }

export function DocumentSection({ section, items, selectedSet }: {
  section: { id: DocSectionId; label: string; subtitle?: string };
  items: DocumentItem[];
  selectedSet: Set<string>;
}) {
  const dragged = useRef<string | null>(null);
  const [marker, setMarker] = useState<{ id: string; before: boolean } | null>(null);
  const clear = () => { dragged.current = null; setMarker(null); };
  const move = (source: string, target: string, before: boolean) => {
    if (source === target || !items.some(i => i.id === source) || !items.some(i => i.id === target)) return;
    const ids = items.map(i => i.id).filter(id => id !== source);
    ids.splice(ids.indexOf(target) + (before ? 0 : 1), 0, source);
    if (ids.some((id, index) => id !== items[index].id)) documentsStore.reorder(section.id, ids);
  };
  return <section>
    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{section.label}</h3>
    {section.subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{section.subtitle}</p>}
    <ul className="mt-3 divide-y divide-border/50 rounded-lg border border-border/60">
      {items.map((item, index) => <li key={item.id} data-document-id={item.id}
        className={cn("group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40", marker?.id === item.id && (marker.before ? "border-t-2 border-t-primary" : "border-b-2 border-b-primary"))}
        onDragOver={event => {
          if (!dragged.current) return;
          event.preventDefault(); event.dataTransfer.dropEffect = "move";
          const box = event.currentTarget.getBoundingClientRect();
          setMarker({ id: item.id, before: event.clientY < box.top + box.height / 2 });
        }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMarker(null); }}
        onDrop={event => {
          if (!dragged.current) return;
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          move(dragged.current, item.id, event.clientY < box.top + box.height / 2);
          clear();
        }}>
        <button type="button" draggable aria-label={`Drag ${item.title}`}
          title="Drag to reorder, or use the up and down arrow keys"
          className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          onDragStart={event => {
            dragged.current = item.id;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id);
          }}
          onDragEnd={clear}
          onKeyDown={event => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
            event.preventDefault();
            const before = event.key === "ArrowUp";
            const target = items[index + (before ? -1 : 1)];
            if (target) move(item.id, target.id, before);
          }}><GripVertical className="size-4" /></button>
        <button type="button" onClick={() => documentsStore.toggle(item.id)} aria-label={`Include ${item.title}`} aria-pressed={selectedSet.has(item.id)}
          className={cn("grid size-5 place-items-center rounded border transition", selectedSet.has(item.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white hover:border-primary")}>
          {selectedSet.has(item.id) && <Check className="size-3.5" />}
        </button>
        <span className={cn("flex-1 text-sm", selectedSet.has(item.id) ? "text-foreground" : "text-muted-foreground", item.isCustomNote && "italic")}>{item.title}</span>
        {item.hasVideo && <span className="grid size-6 place-items-center rounded bg-muted text-muted-foreground"><Youtube className="size-3.5" /></span>}
      </li>)}
      {items.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No items.</li>}
    </ul>
  </section>;
}
