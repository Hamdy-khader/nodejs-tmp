import { ChevronDown, ChevronUp, CircleX, Plus } from "lucide-react";
import { useState } from "react";
import type { StatusEntry } from "@/lib/dental/diagnosis-engine";
import { STATE, statusLabel } from "@/lib/dental/states";
import { cn } from "@/lib/utils";

interface Props {
  entries: StatusEntry[];
  activeChip: StatusEntry | null;
  onEdit: (entry: StatusEntry) => void;
  onRemove: (entry: StatusEntry) => void;
  /** Opens the free-text dialog for a tooth, or for the whole mouth with 0. */
  onAdd: (tooth: number) => void;
}

function Chip({
  entry,
  active,
  onEdit,
  onRemove,
}: {
  entry: StatusEntry;
  active: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-[13px] transition-colors",
        active
          ? "bg-[#2f8fd8] text-white"
          : "bg-white text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04)]",
      )}
      data-chip={entry.stateId}
    >
      <button type="button" onClick={onEdit} className="min-w-0 truncate text-left">
        {entry.title || statusLabel(entry.stateId)}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title || statusLabel(entry.stateId)}`}
        className={cn(
          "shrink-0 rounded-full",
          active ? "text-white/90" : "text-[#757575] hover:text-foreground",
        )}
      >
        <CircleX className="h-4 w-4" />
      </button>
    </span>
  );
}

function ToothRow({
  tooth,
  entries,
  ...props
}: Omit<Props, "entries"> & { tooth: number; entries: StatusEntry[] }) {
  // Intact is the absence of findings, not a chip.
  const chips = entries.filter(
    (entry) => entry.toothId === tooth && entry.stateId !== STATE.intact,
  );
  return (
    <div
      className="flex min-h-[38px] items-center gap-2 border-b border-white/70 py-1 last:border-b-0"
      data-tooth-row={tooth}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-[11px] tabular-nums text-[#9aa0a6]">
        {tooth}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {chips.map((entry, index) => (
          <Chip
            key={`${entry.stateId}-${entry.ts ?? index}`}
            entry={entry}
            active={props.activeChip === entry}
            onEdit={() => props.onEdit(entry)}
            onRemove={() => props.onRemove(entry)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => props.onAdd(tooth)}
        aria-label={`Add status to tooth ${tooth}`}
        className="shrink-0 rounded p-1 text-[#616161] hover:bg-white"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-md bg-card px-5 py-4 shadow-[var(--shadow-soft)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="font-sans text-[15px] font-medium uppercase tracking-wide text-[#1f6fb5]">
          {title}
        </h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[#1f6fb5]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#1f6fb5]" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

const JAWS = {
  upper: [
    [11, 12, 13, 14, 15, 16, 17, 18],
    [21, 22, 23, 24, 25, 26, 27, 28],
  ],
  lower: [
    [41, 42, 43, 44, 45, 46, 47, 48],
    [31, 32, 33, 34, 35, 36, 37, 38],
  ],
};

/** The GENERAL, UPPER JAW and LOWER JAW lists under the chart. */
export function DiagnosisRows(props: Props) {
  const general = props.entries.filter((entry) => entry.toothId === 0);
  return (
    <div className="space-y-4" data-diagnosis-selection>
      <Section title="General">
        <div className="flex min-h-[48px] items-center gap-2 rounded-md bg-[#eef0f2] px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {general.map((entry, index) => (
              <Chip
                key={`${entry.stateId}-${entry.ts ?? index}`}
                entry={entry}
                active={props.activeChip === entry}
                onEdit={() => props.onEdit(entry)}
                onRemove={() => props.onRemove(entry)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => props.onAdd(0)}
            aria-label="Add general status"
            className="shrink-0 rounded p-1 text-[#616161] hover:bg-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </Section>
      {(["upper", "lower"] as const).map((jaw) => (
        <Section key={jaw} title={jaw === "upper" ? "Upper jaw" : "Lower jaw"}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {JAWS[jaw].map((column) => (
              <div key={column[0]} className="rounded-md bg-[#eef0f2] px-3 py-1">
                {column.map((tooth) => (
                  <ToothRow key={tooth} tooth={tooth} {...props} />
                ))}
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
