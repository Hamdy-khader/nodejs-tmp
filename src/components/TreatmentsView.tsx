import { useState } from "react";
import { Check, ChevronDown, GripVertical, StickyNote, X } from "lucide-react";
import {
  patientsStore,
  type TreatmentPlan,
  type TreatmentRow,
  type TreatmentItem,
  UPPER_TEETH,
  LOWER_TEETH,
} from "@/lib/patients-store";
import { pricelistStore, usePricelist } from "@/lib/pricelist-store";
import { TeethChart, type ToothAnnotation } from "@/components/TeethChart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getToothStatusForTreatment } from "@/lib/treatment-catalog";
import { cn } from "@/lib/utils";

interface TreatmentMenuItem {
  label: string;
  value: string;
  itemId?: string;
  itemKey?: string;
  sectionKey?: string;
  groupKey?: string;
  unitPrice?: number;
}

interface TreatmentGroup {
  id: string;
  label: string;
  items: TreatmentMenuItem[];
}

const TREATMENT_VISUALS: Record<
  string,
  { shortLabel: string; color: string; background: string; border: string }
> = {
  extraction: {
    shortLabel: "EXT",
    color: "#9f2f28",
    background: "rgba(201, 73, 59, 0.14)",
    border: "rgba(201, 73, 59, 0.34)",
  },
  filling: {
    shortLabel: "FIL",
    color: "#1f5fa8",
    background: "rgba(66, 133, 244, 0.14)",
    border: "rgba(66, 133, 244, 0.34)",
  },
  "root-canal-treatment": {
    shortLabel: "RCT",
    color: "#b54d19",
    background: "rgba(229, 115, 35, 0.14)",
    border: "rgba(229, 115, 35, 0.34)",
  },
  implant: {
    shortLabel: "IMP",
    color: "#38567d",
    background: "rgba(90, 122, 167, 0.14)",
    border: "rgba(90, 122, 167, 0.34)",
  },
  crown: {
    shortLabel: "CRN",
    color: "#8c6512",
    background: "rgba(224, 184, 64, 0.16)",
    border: "rgba(200, 152, 12, 0.34)",
  },
  veneer: {
    shortLabel: "VNR",
    color: "#7b4bb3",
    background: "rgba(177, 122, 255, 0.14)",
    border: "rgba(177, 122, 255, 0.34)",
  },
  bridge: {
    shortLabel: "BRG",
    color: "#6a2ec0",
    background: "rgba(128, 64, 200, 0.14)",
    border: "rgba(128, 64, 200, 0.34)",
  },
  dentures: {
    shortLabel: "DNS",
    color: "#0d766e",
    background: "rgba(20, 184, 166, 0.14)",
    border: "rgba(20, 184, 166, 0.34)",
  },
  general: {
    shortLabel: "GEN",
    color: "#475467",
    background: "rgba(71, 84, 103, 0.10)",
    border: "rgba(71, 84, 103, 0.26)",
  },
  other: {
    shortLabel: "AUX",
    color: "#475467",
    background: "rgba(71, 84, 103, 0.10)",
    border: "rgba(71, 84, 103, 0.26)",
  },
};

/** Ordered FDI map across both jaws for finding "between" teeth. */
const JAW_ORDER: number[][] = [UPPER_TEETH, LOWER_TEETH];

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function teethBetween(a: number, b: number): number[] {
  for (const row of JAW_ORDER) {
    const ia = row.indexOf(a);
    const ib = row.indexOf(b);
    if (ia !== -1 && ib !== -1) {
      const [lo, hi] = ia < ib ? [ia, ib] : [ib, ia];
      return row.slice(lo + 1, hi);
    }
  }
  return [];
}

function buildTreatmentLookup(groups: TreatmentGroup[]) {
  const lookup = new Map<string, string>();
  groups.forEach((group) => {
    group.items.forEach((item) => {
      if (!item.value.startsWith("__")) {
        lookup.set(norm(item.value), group.id);
      }
    });
  });
  return lookup;
}

function buildToothAnnotations(
  rows: TreatmentRow[],
  treatmentLookup: Map<string, string>,
): Record<number, ToothAnnotation[]> {
  const perTooth = new Map<number, Map<string, ToothAnnotation & { count: number }>>();

  rows.forEach((row) => {
    if (row.kind !== "visit") return;

    row.items.forEach((item) => {
      if (item.toothNumber == null) return;

      const sectionId = treatmentLookup.get(norm(item.name)) ?? "general";
      const visual = TREATMENT_VISUALS[sectionId] ?? TREATMENT_VISUALS.general;
      const toothBucket = perTooth.get(item.toothNumber) ?? new Map();
      const key = `${sectionId}:${item.name}`;
      const current = toothBucket.get(key);

      if (current) {
        current.count += Math.max(1, item.amount);
      } else {
        toothBucket.set(key, {
          id: key,
          label: item.name,
          shortLabel: visual.shortLabel,
          color: visual.color,
          background: visual.background,
          border: visual.border,
          count: Math.max(1, item.amount),
        });
      }

      perTooth.set(item.toothNumber, toothBucket);
    });
  });

  return Object.fromEntries(
    [...perTooth.entries()].map(([toothNumber, bucket]) => [
      toothNumber,
      [...bucket.values()]
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .map(({ count, ...annotation }) => ({
          ...annotation,
          shortLabel: count > 1 ? `${annotation.shortLabel}${count}` : annotation.shortLabel,
        })),
    ]),
  );
}

export function TreatmentsView({ plan }: { plan: TreatmentPlan }) {
  // Ensure the clinic's pricelist is loaded so picked treatments resolve their price.
  const pricelistSections = usePricelist();
  const [selected, setSelected] = useState<number | null>(null);
  const [bridgeMode, setBridgeMode] = useState(false);
  const [bridgeSel, setBridgeSel] = useState<number[]>([]);
  const [insOpen, setInsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const rows = plan.treatments ?? [];
  const billingMode = plan.billingMode ?? "insurance";
  const treatmentGroups: TreatmentGroup[] = pricelistSections.map((section) => {
    const items: TreatmentMenuItem[] = [];
    if (section.label === "Bridge") {
      items.push({
        label: "Bridge Span...",
        value: "__bridge_span__",
      });
    }
    section.groups.forEach((group) => {
      group.items.forEach((item) => {
        items.push({
          label: `${group.title}: ${item.name}`,
          value: item.name,
          itemId: item.id,
          itemKey: item.key,
          sectionKey: section.key,
          groupKey: group.key,
          unitPrice: item.price,
        });
      });
    });
    return {
      id: section.key,
      label: section.label,
      items,
    };
  });
  const treatmentLookup = buildTreatmentLookup(treatmentGroups);
  const toothAnnotations = buildToothAnnotations(rows, treatmentLookup);
  const defaultBridgeItem = treatmentGroups
    .find((group) => group.id === "bridge")
    ?.items.find((item) => item.itemId);

  const toggleBridgeTooth = (n: number) => {
    setBridgeSel((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  };

  const handlePick = (group: TreatmentGroup, item: TreatmentMenuItem) => {
    if (item.value === "__bridge_span__") {
      startBridge();
      return;
    }
    patientsStore.addTreatmentItemToLastVisit(plan.id, {
      name: item.value,
      toothNumber: selected ?? undefined,
      amount: 1,
      unitPrice: item.unitPrice ?? pricelistStore.getPriceFor(item.value),
      catalogSectionKey: item.sectionKey,
      catalogGroupKey: item.groupKey,
      catalogItemId: item.itemId,
      catalogItemKey: item.itemKey,
      priceSource: item.itemId ? "catalog" : undefined,
      manualPriceOverride: false,
    });
    if (selected != null) {
      const nextStatus = getToothStatusForTreatment(item.sectionKey ?? group.id, item.value);
      if (nextStatus) {
        const tooth = plan.teeth[selected];
        patientsStore.setTooth(plan.id, {
          ...(tooth ?? { number: selected, status: "intact" }),
          status: nextStatus,
        });
      }
    }
  };

  const startBridge = () => {
    setBridgeMode(true);
    setBridgeSel([]);
    setSelected(null);
  };

  const cancelBridge = () => {
    setBridgeMode(false);
    setBridgeSel([]);
  };

  const applyBridge = () => {
    if (bridgeSel.length < 2) return;
    // Sort selection along the jaw order
    const sorted = [...bridgeSel].sort((a, b) => {
      for (const row of JAW_ORDER) {
        const ia = row.indexOf(a);
        const ib = row.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
      }
      return a - b;
    });
    // Selected teeth become abutments; teeth between them become pontics.
    // Both render as "bridge" so the connector is one continuous span.
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const between = teethBetween(lo, hi);
    const span = [...sorted, ...between];
    for (const n of span) {
      const t = plan.teeth[n];
      patientsStore.setTooth(plan.id, {
        ...(t ?? { number: n, status: "intact" }),
        status: "bridge",
      });
    }
    // Add a treatment line summarizing the bridge span
    const bridgeName = `Bridge ${lo}-${hi}`;
    patientsStore.addTreatmentItemToLastVisit(plan.id, {
      name: bridgeName,
      amount: 1,
      unitPrice: defaultBridgeItem?.unitPrice ?? pricelistStore.getPriceFor("Bridge"),
      catalogSectionKey: defaultBridgeItem?.sectionKey ?? "bridge",
      catalogGroupKey: defaultBridgeItem?.groupKey ?? "bridge",
      catalogItemId: defaultBridgeItem?.itemId,
      catalogItemKey: defaultBridgeItem?.itemKey,
      priceSource: "catalog",
      manualPriceOverride: false,
    });
    cancelBridge();
  };

  const totals = (() => {
    let subtotal = 0;
    for (const r of rows) {
      if (r.kind === "visit") {
        for (const it of r.items) subtotal += it.amount * it.unitPrice;
      }
    }
    let discount = 0;
    for (const r of rows) {
      if (r.kind === "discount") {
        discount += r.mode === "percent" ? (subtotal * r.value) / 100 : r.value;
      }
    }
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  })();

  return (
    <>
      {/* Teeth + Treatment categories */}
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-2">
          <TeethChart
            teeth={plan.teeth}
            selected={bridgeMode ? null : selected}
            onSelect={bridgeMode ? toggleBridgeTooth : setSelected}
            highlighted={bridgeMode ? bridgeSel : undefined}
            annotations={toothAnnotations}
          />
          {bridgeMode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2">
              <p className="text-xs font-medium text-foreground">
                Bridge mode — pick 2+ teeth across a missing tooth
                {bridgeSel.length > 0 && (
                  <span className="ml-2 font-semibold text-violet-700">
                    Selected: {[...bridgeSel].sort((a, b) => a - b).join(", ")}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelBridge}
                  className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={applyBridge}
                  disabled={bridgeSel.length < 2}
                  className="rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Apply Bridge
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Treatments
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                bridgeMode
                  ? "bg-violet-500/15 text-violet-700"
                  : selected
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {bridgeMode
                ? "Bridge mode"
                : selected
                  ? `Tooth ${selected}`
                  : "Any tooth"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {treatmentGroups.map((group) => {
              const isActive = group.id === "bridge" && bridgeMode;
              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "group flex h-10 items-center justify-between gap-2 rounded-md px-3 text-left text-xs font-semibold transition-all",
                        isActive
                          ? "bg-violet-600 text-white"
                          : "bg-emerald-500 text-white hover:bg-emerald-600",
                      )}
                    >
                      <span className="truncate">{group.label}</span>
                      {isActive ? <Check className="h-3.5 w-3.5 shrink-0 opacity-90" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-90" />}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[320px] min-w-[240px] overflow-y-auto">
                    {group.items?.map((item) => (
                      <DropdownMenuItem
                        key={`${group.id}-${item.value}-${item.label}`}
                        onSelect={() => handlePick(group, item)}
                        className="text-xs font-medium"
                      >
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </div>
        </div>
      </div>

      {/* Suggested treatment header */}
      <div className="mt-5 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <h2 className="text-base font-bold tracking-tight">Your suggested treatment</h2>
          <div className="inline-flex rounded-full border border-border/60 p-0.5">
            <button
              onClick={() => {
                patientsStore.updatePlan(plan.id, { billingMode: "insurance" });
                setInsOpen(true);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                billingMode === "insurance"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Insurance
            </button>
            <button
              onClick={() => {
                patientsStore.updatePlan(plan.id, { billingMode: "payment" });
                setPayOpen(true);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                billingMode === "payment"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Payment plan
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="mt-3 grid grid-cols-[1fr_90px_120px_110px_70px] items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div>Treatment</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Unit price</div>
          <div className="text-right">Price</div>
          <div />
        </div>

        <div className="mt-2 space-y-2">
          {rows.length === 0 ? (
            <p className="rounded-md bg-muted/40 px-4 py-6 text-center text-sm italic text-muted-foreground">
              No treatments yet — add a Visit and pick a treatment from the green buttons above.
            </p>
          ) : (
            rows.map((row, idx) => (
              <RowRenderer
                key={row.id}
                row={row}
                index={idx}
                planId={plan.id}
              />
            ))
          )}
        </div>

        {/* Totals + Note */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border/40 pt-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-md bg-muted/40 px-4 py-4">
            {totals.discount > 0 && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">$ {totals.subtotal.toFixed(0)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Discount</span>
                  <span className="tabular-nums">- $ {totals.discount.toFixed(0)}</span>
                </div>
                <div className="my-2 h-px bg-border/60" />
              </>
            )}
            <div className="flex items-center justify-between text-base font-bold uppercase text-primary">
              <span>Total</span>
              <span className="text-foreground tabular-nums">$ {totals.total.toFixed(0)}</span>
            </div>
            {billingMode === "insurance" && plan.insurance && (() => {
              const coverage = Math.max(
                0,
                Math.min(plan.insurance.unusedMax, totals.total) - plan.insurance.deductible,
              );
              const oop = Math.max(0, totals.total - coverage);
              return (
                <>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-foreground">Insurance coverage (estimated)</span>
                    <span className="font-semibold tabular-nums">$ {coverage.toFixed(0)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">Out of pocket costs (estimated)</span>
                    <span className="font-semibold tabular-nums">$ {oop.toFixed(0)}</span>
                  </div>
                </>
              );
            })()}
            {billingMode === "payment" && plan.paymentPlan && (() => {
              const { amount, term, interest } = plan.paymentPlan;
              const safeTerm = Math.max(1, term);
              const monthly =
                interest === 0 ? amount / safeTerm : (amount / safeTerm) * interest;
              const totalPaid = monthly * safeTerm;
              const totalInterest = Math.max(0, totalPaid - amount);
              return (
                <>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-foreground">Monthly payments</span>
                    <span className="font-semibold tabular-nums">$ {monthly.toFixed(0)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">Total interest</span>
                    <span className="font-semibold tabular-nums">$ {totalInterest.toFixed(0)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-foreground">Total ({safeTerm} months)</span>
                    <span className="font-semibold tabular-nums">$ {totalPaid.toFixed(0)}</span>
                  </div>
                </>
              );
            })()}
          </div>
          <div>
            <Textarea
              placeholder="Note:"
              rows={3}
              value={plan.treatmentNote ?? ""}
              onChange={(e) =>
                patientsStore.updatePlan(plan.id, { treatmentNote: e.target.value })
              }
              className="bg-muted/30"
            />
          </div>
        </div>
      </div>

      {insOpen && (
        <InsuranceDialog
          initial={plan.insurance ?? { unusedMax: 100, deductible: 0 }}
          onClose={() => setInsOpen(false)}
          onSave={(v) => {
            patientsStore.updatePlan(plan.id, { insurance: v, billingMode: "insurance" });
            setInsOpen(false);
          }}
        />
      )}

      {payOpen && (
        <PaymentPlanDialog
          initial={
            plan.paymentPlan ?? {
              amount: totals.total > 0 ? totals.total : 500,
              term: 2,
              interest: 0,
            }
          }
          onClose={() => setPayOpen(false)}
          onSave={(v) => {
            patientsStore.updatePlan(plan.id, { paymentPlan: v, billingMode: "payment" });
            setPayOpen(false);
          }}
        />
      )}
    </>
  );
}

function RowRenderer({
  row,
  index,
  planId,
}: {
  row: TreatmentRow;
  index: number;
  planId: string;
}) {
  if (row.kind === "visit") {
    return <VisitRow row={row} index={index} planId={planId} />;
  }
  if (row.kind === "healing") {
    return <HealingRow row={row} planId={planId} />;
  }
  return <DiscountRow row={row} planId={planId} />;
}

function RowShell({
  children,
  onDelete,
  onToggleNote,
  noteOpen,
  hasNote,
  variant = "default",
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onToggleNote: () => void;
  noteOpen: boolean;
  hasNote: boolean;
  variant?: "default" | "visit";
}) {
  return (
    <div
      className={cn(
        "group grid grid-cols-[24px_1fr_90px_120px_110px_70px] items-center gap-2 rounded-md px-2 py-2 transition-colors",
        variant === "visit" ? "bg-primary/10" : "bg-muted/40 hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground/60 hover:text-muted-foreground"
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onToggleNote}
          className={cn(
            "rounded p-1 transition-colors",
            noteOpen || hasNote
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted",
          )}
          aria-label="Add note"
          title="Add note"
        >
          <StickyNote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function NoteInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ml-7 mt-1 flex items-center gap-2 rounded-md border border-dashed border-border/60 bg-background px-2 py-1.5">
      <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a note…"
        className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

function VisitRow({
  row,
  index,
  planId,
}: {
  row: Extract<TreatmentRow, { kind: "visit" }>;
  index: number;
  planId: string;
}) {
  const [open, setOpen] = useState(Boolean(row.note));
  const total = row.items.reduce((acc, it) => acc + it.amount * it.unitPrice, 0);
  return (
    <div className="space-y-1">
      <RowShell
        variant="visit"
        onDelete={() => patientsStore.removeTreatmentRow(planId, row.id)}
        onToggleNote={() => setOpen((v) => !v)}
        noteOpen={open}
        hasNote={Boolean(row.note)}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {index + 1}
          </span>
          <span className="text-sm font-bold text-primary">Visit:</span>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          Total: <span className="font-semibold text-primary">$ {total.toFixed(0)}</span>
        </div>
        <div />
        <div className="text-right text-xs text-muted-foreground">
          Payable: <span className="font-semibold text-primary">$ {total.toFixed(0)}</span>
        </div>
      </RowShell>

      {open && (
        <NoteInput
          value={row.note ?? ""}
          onChange={(v) =>
            patientsStore.updateTreatmentRow(planId, row.id, { note: v } as Partial<TreatmentRow>)
          }
        />
      )}

      {row.items.map((it) => (
        <ItemRow key={it.id} planId={planId} rowId={row.id} item={it} />
      ))}
    </div>
  );
}

function ItemRow({
  planId,
  rowId,
  item,
}: {
  planId: string;
  rowId: string;
  item: TreatmentItem;
}) {
  const price = item.amount * item.unitPrice;
  return (
    <div className="grid grid-cols-[24px_1fr_90px_120px_110px_70px] items-center gap-2 rounded-md bg-background px-2 py-1.5">
      <span className="text-muted-foreground/40">
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {item.toothNumber != null && (
          <span className="grid h-5 min-w-[26px] place-items-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary tabular-nums">
            {item.toothNumber}
          </span>
        )}
        <span className="truncate">{item.name}</span>
      </div>
      <Input
        type="number"
        min={1}
        value={item.amount}
        onChange={(e) =>
          patientsStore.updateTreatmentItem(planId, rowId, item.id, {
            amount: Math.max(1, Number(e.target.value) || 1),
          })
        }
        className="h-7 text-right text-xs"
      />
      <div className="flex items-center justify-end gap-1">
        <span className="text-xs text-muted-foreground">$</span>
        <Input
          type="number"
          min={0}
          value={item.unitPrice}
          onChange={(e) =>
            patientsStore.updateTreatmentItem(planId, rowId, item.id, {
              unitPrice: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="h-7 w-20 text-right text-xs"
        />
      </div>
      <div className="text-right text-xs font-semibold tabular-nums">$ {price.toFixed(0)}</div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => patientsStore.removeTreatmentItem(planId, rowId, item.id)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Remove item"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function HealingRow({
  row,
  planId,
}: {
  row: Extract<TreatmentRow, { kind: "healing" }>;
  planId: string;
}) {
  const [open, setOpen] = useState(Boolean(row.note));
  return (
    <div className="space-y-1">
      <RowShell
        onDelete={() => patientsStore.removeTreatmentRow(planId, row.id)}
        onToggleNote={() => setOpen((v) => !v)}
        noteOpen={open}
        hasNote={Boolean(row.note)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold italic text-foreground/80">Healing period:</span>
          <Input
            type="number"
            min={0}
            placeholder="days"
            value={row.days ?? ""}
            onChange={(e) =>
              patientsStore.updateTreatmentRow(planId, row.id, {
                days: e.target.value === "" ? undefined : Number(e.target.value),
              } as Partial<TreatmentRow>)
            }
            className="h-7 w-20 text-xs"
          />
          <span className="text-xs text-muted-foreground">days</span>
        </div>
        <div />
        <div />
        <div />
      </RowShell>
      {open && (
        <NoteInput
          value={row.note ?? ""}
          onChange={(v) =>
            patientsStore.updateTreatmentRow(planId, row.id, { note: v } as Partial<TreatmentRow>)
          }
        />
      )}
    </div>
  );
}

function DiscountRow({
  row,
  planId,
}: {
  row: Extract<TreatmentRow, { kind: "discount" }>;
  planId: string;
}) {
  const [open, setOpen] = useState(Boolean(row.note));
  return (
    <div className="space-y-1">
      <RowShell
        onDelete={() => patientsStore.removeTreatmentRow(planId, row.id)}
        onToggleNote={() => setOpen((v) => !v)}
        noteOpen={open}
        hasNote={Boolean(row.note)}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-4 w-4 place-items-center rounded-full border-2 border-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-semibold">Discount</span>
        </div>
        <div />
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground">
            {row.mode === "percent" ? "%" : "$"}
          </span>
          <Input
            type="number"
            value={row.value}
            onChange={(e) =>
              patientsStore.updateTreatmentRow(planId, row.id, {
                value: Number(e.target.value) || 0,
              } as Partial<TreatmentRow>)
            }
            className="h-7 w-20 text-right text-xs"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-muted">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() =>
                  patientsStore.updateTreatmentRow(planId, row.id, {
                    mode: "amount",
                  } as Partial<TreatmentRow>)
                }
              >
                <span className="flex items-center gap-2">
                  {row.mode === "amount" && <Check className="h-3.5 w-3.5" />} Amount ($)
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  patientsStore.updateTreatmentRow(planId, row.id, {
                    mode: "percent",
                  } as Partial<TreatmentRow>)
                }
              >
                <span className="flex items-center gap-2">
                  {row.mode === "percent" && <Check className="h-3.5 w-3.5" />} Percent (%)
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-right text-xs text-muted-foreground">=</div>
      </RowShell>
      {open && (
        <NoteInput
          value={row.note ?? ""}
          onChange={(v) =>
            patientsStore.updateTreatmentRow(planId, row.id, { note: v } as Partial<TreatmentRow>)
          }
        />
      )}
    </div>
  );
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function ModalShell({
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn("w-full rounded-2xl bg-background shadow-xl", width)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function InsuranceDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: { unusedMax: number; deductible: number };
  onClose: () => void;
  onSave: (v: { unusedMax: number; deductible: number }) => void;
}) {
  const [unusedMax, setUnusedMax] = useState(initial.unusedMax);
  const [deductible, setDeductible] = useState(initial.deductible);
  return (
    <ModalShell title="Insurance settings" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm">Unused annual max for patient:</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              value={unusedMax}
              onChange={(e) => setUnusedMax(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-28 text-right"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-sm">Deductible:</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              value={deductible}
              onChange={(e) => setDeductible(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-28 text-right"
            />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={() => onSave({ unusedMax, deductible })}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <Check className="h-4 w-4" /> OK
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function PaymentPlanDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: { amount: number; term: number; interest: number };
  onClose: () => void;
  onSave: (v: { amount: number; term: number; interest: number }) => void;
}) {
  const [amount, setAmount] = useState(initial.amount);
  const [term, setTerm] = useState(initial.term);
  const [interest, setInterest] = useState(initial.interest);
  const safeTerm = Math.max(1, term);
  const monthly = interest === 0 ? amount / safeTerm : (amount / safeTerm) * interest;
  const totalPaid = monthly * safeTerm;
  const totalInterest = Math.max(0, totalPaid - amount);
  return (
    <ModalShell title="Payment plan" onClose={onClose} width="max-w-2xl">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Amount to loan</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-semibold">$</span>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 border-0 border-b border-border/60 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Term (months)</div>
            <Input
              type="number"
              min={1}
              value={term}
              onChange={(e) => setTerm(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 h-9 border-0 border-b border-border/60 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Interest rate</div>
            <div className="mt-1 flex items-baseline gap-1">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 border-0 border-b border-border/60 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-4">
          <h4 className="text-sm font-bold text-primary">Calculations</h4>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span>Monthly payments</span>
              <span className="font-semibold tabular-nums">$ {monthly.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span>Total interest</span>
              <span className="font-semibold tabular-nums">$ {totalInterest.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold tabular-nums">$ {totalPaid.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onSave({ amount, term, interest })}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <Check className="h-4 w-4" /> OK
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
