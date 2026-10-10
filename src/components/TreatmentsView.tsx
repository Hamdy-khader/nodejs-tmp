import { createContext, useContext, useEffect, useState } from "react";
import { Check, ChevronDown, StickyNote, X } from "lucide-react";
import {
  patientsStore,
  type TreatmentPlan,
  type TreatmentRow,
  type TreatmentItem,
  type TreatmentPriceMode,
  UPPER_TEETH,
  LOWER_TEETH,
} from "@/lib/patients-store";
import { pricelistStore, usePricelist } from "@/lib/pricelist-store";
import { TeethChart } from "@/components/TeethChart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getTreatmentTeeth, getTreatmentAnnotations } from "@/lib/treatment-teeth";
import { cn } from "@/lib/utils";
import { TreatmentSorting, SortableTreatment, TreatmentDragHandle } from "./TreatmentSorting";
import { toggleToothSelection } from "@/lib/tooth-selection";
import {
  isTotalAdjustment,
  setTreatmentTotal,
  treatmentTotals,
  withoutTotalAdjustment,
} from "@/lib/treatment-pricing";
import { toast } from "sonner";
import {
  groupTreatmentItems,
  groupAmountPatches,
  PRICE_MODES,
  treatmentItemsTotal,
  type TreatmentItemGroup,
} from "@/lib/treatment-groups";
import "./treatment-workspace.css";

const CurrencyContext = createContext("$");
function CurrencySymbol() {
  return <>{useContext(CurrencyContext)}</>;
}
function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

interface TreatmentMenuItem {
  label: string;
  value: string;
  itemId?: string;
  itemKey?: string;
  sectionKey?: string;
  groupKey?: string;
  unitPrice?: number;
  priceDisplay?: string;
}

interface TreatmentGroup {
  id: string;
  label: string;
  items: TreatmentMenuItem[];
}

/** Ordered FDI map across both jaws for finding "between" teeth. */
const JAW_ORDER: number[][] = [UPPER_TEETH, LOWER_TEETH];

function norm(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

export function TreatmentsView({
  plan,
  currency = "USD",
}: {
  plan: TreatmentPlan;
  currency?: string;
}) {
  const symbol = currencySymbol(currency);
  // Ensure the clinic's pricelist is loaded so picked treatments resolve their price.
  const pricelistSections = usePricelist();
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [bridgeMode, setBridgeMode] = useState(false);
  const [bridgeSel, setBridgeSel] = useState<number[]>([]);
  const [insOpen, setInsOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [totalOpen, setTotalOpen] = useState(false);
  const [totalDraft, setTotalDraft] = useState("");
  const [totalError, setTotalError] = useState("");
  const [savingTotal, setSavingTotal] = useState(false);
  const addItems = (items: Omit<TreatmentItem, "id">[]) => {
    for (const item of items) patientsStore.addTreatmentItemToLastVisit(plan.id, { ...item, priceMode: "unit" });
    setSelectedTeeth([]);
    setBridgeSel([]);
  };

  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.target.closest(
          '[data-tooth-number], [data-treatment-selection], [role="menu"], [role="dialog"]',
        )
      )
        return;
      setSelectedTeeth([]);
      setBridgeSel([]);
    };
    document.addEventListener("pointerdown", clear);
    return () => document.removeEventListener("pointerdown", clear);
  }, []);

  const rows = plan.treatments ?? [];
  const visibleRows = withoutTotalAdjustment(rows);
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
          priceDisplay: item.price > 0 ? `${symbol} ${item.price.toFixed(2)}` : `${symbol} 0`,
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
  const toothAnnotations = getTreatmentAnnotations(rows, treatmentLookup);
  const defaultBridgeItem = treatmentGroups
    .find((group) => group.id === "bridge")
    ?.items.find((item) => item.itemId);

  const toggleBridgeTooth = (n: number) => {
    setBridgeSel((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const toggleTreatmentTooth = (n: number) => {
    setSelectedTeeth((prev) => toggleToothSelection(prev, n));
  };

  const handlePick = (group: TreatmentGroup, item: TreatmentMenuItem) => {
    if (item.value === "__bridge_span__") {
      startBridge();
      return;
    }
    const targets = selectedTeeth.length > 0 ? selectedTeeth : [undefined];
    addItems(
      targets.map((toothNumber) => ({
        name: item.value,
        toothNumber,
        amount: 1,
        unitPrice: item.unitPrice ?? pricelistStore.getPriceFor(item.value),
        catalogSectionKey: item.sectionKey ?? group.id,
        catalogGroupKey: item.groupKey,
        catalogItemId: item.itemId,
        catalogItemKey: item.itemKey,
        priceSource: item.itemId ? "catalog" : undefined,
        manualPriceOverride: false,
      })),
    );
  };

  const startBridge = () => {
    setBridgeMode(true);
    setBridgeSel([]);
    setSelectedTeeth([]);
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
    // Add a treatment line summarizing the bridge span
    const bridgeName = `Bridge ${lo}-${hi}`;
    addItems([
      {
        name: bridgeName,
        amount: 1,
        unitPrice: defaultBridgeItem?.unitPrice ?? pricelistStore.getPriceFor("Bridge"),
        catalogSectionKey: defaultBridgeItem?.sectionKey ?? "bridge",
        catalogGroupKey: defaultBridgeItem?.groupKey ?? "bridge",
        catalogItemId: defaultBridgeItem?.itemId,
        catalogItemKey: defaultBridgeItem?.itemKey,
        priceSource: "catalog",
        manualPriceOverride: false,
      },
    ]);
    cancelBridge();
  };

  const totals = treatmentTotals(rows);
  const originalTotal = treatmentTotals(withoutTotalAdjustment(rows)).total;
  const hasTotalAdjustment = rows.some(isTotalAdjustment);

  return (
    <CurrencyContext.Provider value={symbol}>
      <div className="treatment-workspace">
        {/* Teeth + Treatment categories */}
        <div className="treatment-chart-panel">
          <div className="treatment-chart">
            <TeethChart
              teeth={getTreatmentTeeth(plan.teeth, rows, treatmentLookup)}
              baseTeeth={plan.teeth}
              selected={bridgeMode ? null : (selectedTeeth.at(-1) ?? null)}
              onSelect={bridgeMode ? toggleBridgeTooth : toggleTreatmentTooth}
              highlighted={bridgeMode ? bridgeSel : selectedTeeth}
              annotations={toothAnnotations}
            />
            {bridgeMode && (
              <div
                data-treatment-selection
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-2"
              >
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

          <div data-treatment-selection className="treatment-categories">
            <div className="sr-only">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Clinic treatments
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  bridgeMode
                    ? "bg-violet-500/15 text-violet-700"
                    : selectedTeeth.length > 0
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {bridgeMode
                  ? "Bridge mode"
                  : selectedTeeth.length > 0
                    ? `${selectedTeeth.length} ${selectedTeeth.length === 1 ? "tooth" : "teeth"}`
                    : "Any tooth"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {treatmentGroups.map((group) => {
                const isActive = group.id === "bridge" && bridgeMode;
                return (
                  <DropdownMenu key={group.id}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(
                          "group flex h-8 items-center justify-between gap-2 rounded-full px-3 text-left text-[11px] font-semibold transition-all",
                          isActive
                            ? "bg-violet-600 text-white"
                            : "bg-[#66b96a] text-white hover:bg-[#54a85a]",
                        )}
                      >
                        <span className="truncate">{group.label}</span>
                        {isActive ? (
                          <Check className="h-3.5 w-3.5 shrink-0 opacity-90" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-90" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="max-h-[320px] min-w-[240px] overflow-y-auto"
                    >
                      {group.items?.map((item) => (
                        <DropdownMenuItem
                          key={`${group.id}-${item.value}-${item.label}`}
                          onSelect={() => handlePick(group, item)}
                          className="flex items-center justify-between gap-3 text-xs font-medium"
                        >
                          <span className="truncate">{item.label}</span>
                          {item.priceDisplay && (
                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                              {item.priceDisplay}
                            </span>
                          )}
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
        <div className="treatment-suggestion">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <h2 className="text-base font-bold tracking-tight">Your suggested treatment</h2>
            <div className="inline-flex gap-3">
              <button
                onClick={() => {
                  patientsStore.updatePlan(plan.id, { billingMode: "insurance" });
                  setInsOpen(true);
                }}
                className={cn(
                  "rounded-full border border-border px-4 py-1 text-xs font-normal transition-colors",
                  billingMode === "insurance"
                    ? "bg-white text-foreground"
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
                  "rounded-full border border-border px-4 py-1 text-xs font-normal transition-colors",
                  billingMode === "payment"
                    ? "bg-white text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Payment plan
              </button>
            </div>
          </div>

          <p className="sr-only">
            Edit each treatment price below, or use Edit total to set the final price.
          </p>
          <div className="mt-2 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[18px_minmax(0,1fr)_72px_112px_100px_50px] items-center gap-2 px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div />
                <div>Treatment</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Unit price</div>
                <div className="text-right">Price</div>
                <div />
              </div>

              <TreatmentSorting planId={plan.id} rows={visibleRows}>
                <div className="mt-1 space-y-3">
                  {visibleRows.length === 0 ? (
                    <p className="rounded-md bg-muted/40 px-4 py-6 text-center text-sm italic text-muted-foreground">
                      No treatments yet — add a Visit and pick a treatment from the green buttons
                      above.
                    </p>
                  ) : (
                    visibleRows.map((row, idx) => (
                      <SortableTreatment key={row.id} position={{ kind: "row", id: row.id }}>
                        <RowRenderer
                          row={row}
                          index={visibleRows.slice(0, idx).filter((r) => r.kind === "visit").length}
                          planId={plan.id}
                        />
                      </SortableTreatment>
                    ))
                  )}
                </div>
              </TreatmentSorting>
            </div>
          </div>
          <p className="sr-only">
            Drag the grip to reorder. Use arrow keys when a grip is focused.
          </p>

          {/* Totals + Note */}
          <div className="treatment-total-panel">
            <div className="min-w-0">
              {totals.discount > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      <CurrencySymbol /> {totals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Discount</span>
                    <span className="tabular-nums">
                      - <CurrencySymbol /> {totals.discount.toFixed(2)}
                    </span>
                  </div>
                  <div className="my-2 h-px bg-border/60" />
                </>
              )}
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-primary/15 pb-4">
                <div className="flex flex-1 items-center justify-between gap-4">
                  <p className="text-sm font-bold text-[#1672cb]">TOTAL</p>
                  <p aria-label="Final total" className="text-sm font-semibold tabular-nums">
                    <CurrencySymbol /> {totals.total.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTotalDraft(totals.total.toFixed(2));
                    setTotalError("");
                    setTotalOpen(true);
                  }}
                >
                  Edit total
                </Button>
              </div>
              {hasTotalAdjustment && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    Before adjustment: <CurrencySymbol /> {originalTotal.toFixed(2)} · Adjustment:{" "}
                    {totals.total >= originalTotal ? "+" : "−"}
                    <CurrencySymbol /> {Math.abs(totals.total - originalTotal).toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void patientsStore
                        .setTreatments(plan.id, withoutTotalAdjustment(rows))
                        .catch(() => toast.error("Could not save the total. Please try again."));
                    }}
                  >
                    Reset total adjustment
                  </Button>
                </div>
              )}
              {billingMode === "insurance" &&
                plan.insurance &&
                (() => {
                  const coverage = Math.max(
                    0,
                    Math.min(plan.insurance.unusedMax, totals.total) - plan.insurance.deductible,
                  );
                  const oop = Math.max(0, totals.total - coverage);
                  return (
                    <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-background p-4">
                      <h4 className="text-sm font-semibold">Insurance estimate</h4>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-foreground">Insurance coverage (estimated)</span>
                        <span className="font-semibold tabular-nums">
                          <CurrencySymbol /> {coverage.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Out of pocket costs (estimated)</span>
                        <span className="font-semibold tabular-nums">
                          <CurrencySymbol /> {oop.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              {billingMode === "payment" &&
                plan.paymentPlan &&
                (() => {
                  const { amount, term, interest } = plan.paymentPlan;
                  const safeTerm = Math.max(1, term);
                  const monthly =
                    interest === 0 ? amount / safeTerm : (amount / safeTerm) * interest;
                  const totalPaid = monthly * safeTerm;
                  const totalInterest = Math.max(0, totalPaid - amount);
                  return (
                    <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold">Payment schedule</h4>
                        <Button size="sm" variant="ghost" onClick={() => setPayOpen(true)}>
                          Edit payment plan
                        </Button>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Financed amount</span>
                        <span className="font-semibold">
                          <CurrencySymbol /> {amount.toFixed(2)}
                        </span>
                      </div>
                      {Math.abs(amount - totals.total) > 0.005 && (
                        <p className="text-xs text-muted-foreground">
                          The financed amount differs from the treatment total. Edit the payment
                          plan to update it.
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-foreground">Monthly payments</span>
                        <span className="font-semibold tabular-nums">
                          <CurrencySymbol /> {monthly.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Total interest</span>
                        <span className="font-semibold tabular-nums">
                          <CurrencySymbol /> {totalInterest.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-sm">
                        <span className="text-foreground">Total ({safeTerm} months)</span>
                        <span className="font-semibold tabular-nums">
                          <CurrencySymbol /> {totalPaid.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
            </div>
            <div className="space-y-2">
              <label htmlFor="treatment-note" className="text-sm font-semibold">
                Plan notes
              </label>
              <Textarea
                id="treatment-note"
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

        <Dialog
          open={totalOpen}
          onOpenChange={(open) => {
            if (!savingTotal) setTotalOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit final total</DialogTitle>
              <DialogDescription>
                The difference is saved as a separate price adjustment or discount. Treatment unit
                prices stay the same.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!totalDraft.trim() || savingTotal) return;
                setSavingTotal(true);
                setTotalError("");
                try {
                  await patientsStore.setTreatments(
                    plan.id,
                    setTreatmentTotal(rows, Number(totalDraft), uid),
                  );
                  setTotalOpen(false);
                } catch (error) {
                  setTotalError(
                    error instanceof Error
                      ? error.message
                      : "Could not save the total. Please try again.",
                  );
                } finally {
                  setSavingTotal(false);
                }
              }}
            >
              <p className="text-sm text-muted-foreground">
                Current total: <CurrencySymbol /> {totals.total.toFixed(2)}
              </p>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Final total</span>
                <Input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={totalDraft}
                  disabled={savingTotal}
                  onChange={(event) => setTotalDraft(event.target.value)}
                />
              </label>
              {totalError && (
                <p role="alert" className="text-sm text-destructive">
                  {totalError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={savingTotal}
                  onClick={() => setTotalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTotal || !totalDraft.trim()}>
                  {savingTotal ? "Saving…" : "Save total"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

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
                amount: totals.total,
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
      </div>
    </CurrencyContext.Provider>
  );
}

function RowRenderer({ row, index, planId }: { row: TreatmentRow; index: number; planId: string }) {
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
        "group grid grid-cols-[18px_minmax(0,1fr)_72px_112px_100px_50px] items-center gap-2 rounded-md px-2 py-2 transition-colors",
        variant === "visit" ? "bg-primary/10" : "bg-muted/40 hover:bg-muted/60",
      )}
    >
      <TreatmentDragHandle />
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

function NoteInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
  const total = treatmentItemsTotal(row.items);
  return (
    <div className="treatment-visit">
      <div className="treatment-visit-heading">
        <TreatmentDragHandle />
        <span className="text-sm font-semibold text-primary">
          {isTotalAdjustment(row) ? "Adjustment" : `Visit ${index + 1}`}
        </span>
        <Input
          aria-label="Visit description"
          placeholder="Visit description"
          value={row.label ?? ""}
          onChange={(e) =>
            patientsStore.updateTreatmentRow(planId, row.id, { label: e.target.value })
          }
          className="h-7 min-w-0 flex-1 rounded-none border-0 border-b border-slate-300/60 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-1 text-right">
          <p className="text-[11px] text-muted-foreground">Visit subtotal</p>
          <p className="text-xs font-bold text-[#1672cb] tabular-nums">
            <CurrencySymbol /> {total.toFixed(2)}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Visit note"
          onClick={() => setOpen((v) => !v)}
        >
          <StickyNote className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Delete visit"
          onClick={() => patientsStore.removeTreatmentRow(planId, row.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <NoteInput
          value={row.note ?? ""}
          onChange={(v) =>
            patientsStore.updateTreatmentRow(planId, row.id, { note: v } as Partial<TreatmentRow>)
          }
        />
      )}

      {row.items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          No treatments in this visit. Select a clinic treatment above to add its price.
        </p>
      )}
      {groupTreatmentItems(row.items).map((group) => (
        <SortableTreatment
          key={group.id}
          position={{ kind: "item", id: group.id, itemIds: group.items.map((item) => item.id) }}
        >
          <ItemRow planId={planId} rowId={row.id} group={group} />
        </SortableTreatment>
      ))}
    </div>
  );
}

function ItemRow({
  planId,
  rowId,
  group,
}: {
  planId: string;
  rowId: string;
  group: TreatmentItemGroup;
}) {
  const item = group.items[0];
  const [teethOpen, setTeethOpen] = useState(false);
  const [teethDraft, setTeethDraft] = useState(group.teeth);
  const [savingTeeth, setSavingTeeth] = useState(false);
  const saveMode = (priceMode: TreatmentPriceMode) => patientsStore.updateTreatmentItems(
    planId, rowId, Object.fromEntries(group.items.map(entry => [entry.id, { priceMode }])),
  );
  const [priceDraft, setPriceDraft] = useState(String(group.unitPrice));
  const [amountDraft, setAmountDraft] = useState(String(group.amount));
  useEffect(() => setPriceDraft(String(group.unitPrice)), [group.unitPrice]);
  useEffect(() => setAmountDraft(String(group.amount)), [group.amount]);
  const savePrice = () => {
    const value = Number(priceDraft);
    if (!priceDraft.trim() || !Number.isFinite(value) || value < 0) {
      setPriceDraft(String(group.unitPrice));
      return;
    }
    if (value === group.unitPrice) return;
    if (group.items.length === 1)
      patientsStore.updateTreatmentItem(planId, rowId, item.id, { unitPrice: value });
    else
      patientsStore.updateTreatmentItems(
        planId,
        rowId,
        Object.fromEntries(group.items.map((entry) => [entry.id, { unitPrice: value }])),
      );
  };
  const saveAmount = () => {
    const amount = Number(amountDraft);
    const patches = groupAmountPatches(group, amount);
    if (!patches) {
      setAmountDraft(String(group.amount));
      return;
    }
    if (amount === group.amount) return;
    if (group.items.length === 1)
      patientsStore.updateTreatmentItem(planId, rowId, item.id, patches[item.id]);
    else patientsStore.updateTreatmentItems(planId, rowId, patches);
  };
  const inputClass =
    "h-7 rounded-none border-0 border-b border-slate-300/70 bg-transparent px-0 text-right text-xs shadow-none focus-visible:ring-0";
  return (
    <div className="treatment-item" data-treatment-group={group.id}>
      <TreatmentDragHandle />
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span
          className="inline-block max-w-full border-b border-slate-300/70 pb-0.5"
          title={item.name}
        >
          {item.name}
        </span>
        <div className="flex flex-wrap gap-0.5" aria-label={`Teeth for ${item.name}`}>
          {group.teeth.map((number) => (
            <span
              key={number}
              className="grid h-[19px] w-[19px] place-items-center rounded-full border border-slate-200 bg-white text-[9px] text-slate-600"
            >
              {number}
            </span>
          ))}
        </div>
        <button type="button" className="text-primary underline" aria-label={`Edit teeth for ${item.name}`} onClick={() => { setTeethDraft(group.teeth); setTeethOpen(true); }}>Edit teeth</button>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Input
          type="number"
          min={1}
          step={1}
          aria-label={`Amount for ${item.name}`}
          value={amountDraft}
          onChange={(event) => setAmountDraft(event.target.value)}
          onBlur={saveAmount}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={cn(inputClass, "w-12")}
        />
        <span className="text-xs">×</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1 text-xs">
        {(group.priceMode === "unit" || group.priceMode === "package") && <CurrencySymbol />}
        <Input
          type="number"
          min={0}
          step="0.01"
          aria-label={`${PRICE_MODES[group.priceMode]} for ${item.name}`}
          hidden={group.priceMode === "free" || group.priceMode === "in-package"}
          disabled={group.priceMode === "free" || group.priceMode === "in-package"}
          value={priceDraft}
          onChange={(event) => setPriceDraft(event.target.value)}
          onBlur={savePrice}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={cn(inputClass, "w-16", (group.priceMode === "free" || group.priceMode === "in-package") && "hidden")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-1" aria-label={`Price mode for ${item.name}`} title={PRICE_MODES[group.priceMode]}>
              {group.priceMode !== "unit" && <span>{PRICE_MODES[group.priceMode]}</span>}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(PRICE_MODES).map(([mode, label]) => (
              <DropdownMenuItem key={mode} onSelect={() => saveMode(mode as TreatmentPriceMode)}>
                <span className="w-4">{group.priceMode === mode && <Check className="h-3.5 w-3.5" />}</span>{label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="pl-1 text-muted-foreground">=</span>
      </div>
      <div className="text-right text-xs tabular-nums" aria-label={`Price for ${item.name}`}>
        <CurrencySymbol />{" "}
        {group.total.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Remove item"
          title={`Remove ${item.name}`}
          onClick={() =>
            group.items.length === 1
              ? patientsStore.removeTreatmentItem(planId, rowId, item.id)
              : patientsStore.removeTreatmentItems(
                  planId,
                  rowId,
                  group.items.map((entry) => entry.id),
                )
          }
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Dialog open={teethOpen} onOpenChange={open => { if (!savingTeeth) setTeethOpen(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Teeth for {item.name}</DialogTitle><DialogDescription>Select the teeth for this treatment row.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            {[UPPER_TEETH, LOWER_TEETH].map((jaw, index) => <div key={index} className="grid grid-cols-8 gap-1">
              {jaw.map(number => <button key={number} type="button" aria-pressed={teethDraft.includes(number)} className={cn("rounded border p-2 text-sm", teethDraft.includes(number) && "bg-primary text-primary-foreground")} onClick={() => setTeethDraft(teethDraft.includes(number) ? teethDraft.filter(n => n !== number) : [...teethDraft, number])}>{number}</button>)}
            </div>)}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={savingTeeth} onClick={() => setTeethOpen(false)}>Cancel</Button>
            <Button disabled={savingTeeth} onClick={async () => {
              setSavingTeeth(true);
              try { await patientsStore.setTreatmentItemTeeth(planId, rowId, group.items.map(entry => entry.id), teethDraft); setTeethOpen(false); }
              catch { toast.error("Could not save treatment teeth. Please try again."); }
              finally { setSavingTeeth(false); }
            }}>{savingTeeth ? "Saving…" : "Save teeth"}</Button>
          </div>
        </DialogContent>
      </Dialog>
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
            aria-label="Healing period description"
            placeholder="Period details"
            value={row.label ?? ""}
            onChange={(e) =>
              patientsStore.updateTreatmentRow(planId, row.id, { label: e.target.value })
            }
            className="h-7 min-w-0 flex-1 text-xs"
          />
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
            {row.mode === "percent" ? "%" : <CurrencySymbol />}
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
                  {row.mode === "amount" && <Check className="h-3.5 w-3.5" />} Amount (
                  <CurrencySymbol />)
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
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
            <span className="text-sm text-muted-foreground">
              <CurrencySymbol />
            </span>
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
            <span className="text-sm text-muted-foreground">
              <CurrencySymbol />
            </span>
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
              <span className="text-lg font-semibold">
                <CurrencySymbol />
              </span>
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
              <span className="font-semibold tabular-nums">
                <CurrencySymbol /> {monthly.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span>Total interest</span>
              <span className="font-semibold tabular-nums">
                <CurrencySymbol /> {totalInterest.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="font-semibold tabular-nums">
                <CurrencySymbol /> {totalPaid.toFixed(2)}
              </span>
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
