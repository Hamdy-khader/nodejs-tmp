import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  Banknote,
  Check,
  ChevronDown,
  Lock,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ApiError,
  clinicApi,
  clinicTokenStore,
  type PricelistData,
  type PricelistGroup,
  type PricelistItem,
  type PricelistSection,
} from "@/lib/admin/api";
import { pricelistStore, toPriceSections } from "@/lib/pricelist-store";
import { normalizePricelistData } from "@/lib/treatment-catalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Currency = { code: string; label: string; symbol: string };

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "USD", label: "United States dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "EUR" },
  { code: "TRY", label: "Turkish lira", symbol: "TRY" },
  { code: "EGP", label: "Egyptian pound", symbol: "EGP" },
  { code: "GBP", label: "British pound", symbol: "GBP" },
  { code: "SAR", label: "Saudi riyal", symbol: "SAR" },
  { code: "AED", label: "UAE dirham", symbol: "AED" },
];

// The number of the treatment button each catalog section feeds. Veneers sit
// under the Crown button, so their section is listed with button 7.
const BUTTON_NUMBERS: Record<string, number> = {
  extraction: 1,
  "prosthesis-removal": 2,
  filling: 3,
  dentures: 4,
  "root-canal-treatment": 5,
  implant: 6,
  crown: 7,
  veneer: 7,
  bridge: 8,
  general: 9,
  other: 10,
};

interface ButtonBlock {
  id: string;
  number: number | null;
  label: string;
  sections: PricelistSection[];
}

/** Sections grouped by the treatment button they belong to, in catalog order. */
function buttonBlocks(sections: PricelistSection[]): ButtonBlock[] {
  const blocks: ButtonBlock[] = [];
  for (const section of sections) {
    const number = BUTTON_NUMBERS[section.key ?? ""] ?? null;
    const block = number != null ? blocks.find((candidate) => candidate.number === number) : undefined;
    if (block) block.sections.push(section);
    else blocks.push({ id: section.id, number, label: section.label, sections: [section] });
  }
  return blocks;
}

function getItemPolicy(item: PricelistItem) {
  const isUsed = Boolean(item.is_used ?? (item.usage_count ?? 0) > 0);
  return {
    isUsed,
    usageCount: item.usage_count ?? 0,
    canEditName: item.can_edit_name ?? !isUsed,
    canEditNote: item.can_edit_note ?? !isUsed,
    canEditPrice: item.can_edit_price ?? true,
  };
}

function updateGroup(
  data: PricelistData,
  sectionId: string,
  groupId: string,
  updater: (group: PricelistGroup) => PricelistGroup,
): PricelistData {
  return {
    ...data,
    sections: data.sections.map((section) =>
      section.id !== sectionId
        ? section
        : {
            ...section,
            groups: section.groups.map((group) => (group.id === groupId ? updater(group) : group)),
          },
    ),
  };
}

function validatePricelist(data: PricelistData): string | null {
  for (const section of data.sections) {
    if (!section.label.trim()) return "Section name is required.";
    for (const group of section.groups) {
      if (!group.title.trim()) return `Group name is required in ${section.label}.`;
      for (const item of group.items) {
        if (!item.name.trim()) return `Treatment name is required in ${group.title}.`;
      }
    }
  }
  return null;
}

function syncPricelistStore(data: PricelistData) {
  pricelistStore.setSections(toPriceSections(data.sections));
}

export function ClinicFeesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PricelistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [setupOpen, setSetupOpen] = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [pendingCurrency, setPendingCurrency] = useState("USD");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!clinicTokenStore.exists()) {
      navigate({ to: "/clinic/login" });
      return;
    }

    clinicApi.pricelist
      .get()
      .then((next) => {
        const normalized = normalizePricelistData(next);
        setData(normalized);
        syncPricelistStore(normalized);
        setPendingCurrency(normalized.settings.currency_code);
        const current: Currency = {
          code: normalized.settings.currency_code,
          label: normalized.settings.currency_label,
          symbol: normalized.settings.currency_symbol,
        };
        setCurrencies((prev) =>
          prev.some((c) => c.code === current.code) ? prev : [...prev, current],
        );
      })
      .catch((error) => {
        if (error instanceof Error && "status" in error && error.status === 401) {
          clinicTokenStore.clear();
          navigate({ to: "/clinic/login" });
          return;
        }
        setFetchError("Failed to load pricelist. Please refresh.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const savePricelist = useCallback(
    async (payload = data) => {
      if (!payload) return null;
      const validationError = validatePricelist(payload);
      if (validationError) {
        toast.error(validationError);
        return null;
      }

      setSaving(true);
      try {
        const saved = normalizePricelistData(await clinicApi.pricelist.save(payload));
        setData(saved);
        syncPricelistStore(saved);
        toast.success("Pricelist saved");
        return saved;
      } catch (error) {
        toast.error(error instanceof ApiError ? Object.values(error.errors ?? {}).flat()[0] ?? error.message : "Failed to save. Please try again.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [data],
  );

  const confirmSetup = async () => {
    if (!data) return;
    const currency = currencies.find((c) => c.code === pendingCurrency) ?? currencies[0];
    setSaving(true);
    try {
      const saved = normalizePricelistData(await clinicApi.pricelist.saveCurrency({
        currency_code: currency.code,
        currency_label: currency.label,
        currency_symbol: currency.symbol,
      }));
      setData(current => current ? { ...current, settings: saved.settings } : saved);
      setSetupOpen(false);
      toast.success("Currency saved");
    } catch (error) {
      toast.error(error instanceof ApiError ? Object.values(error.errors ?? {}).flat()[0] ?? error.message : "Could not save currency. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const patchItem = useCallback(
    async (
      sectionId: string,
      groupId: string,
      itemId: string,
      patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>,
    ) => {
      const currentItem = data?.sections
        .find((section) => section.id === sectionId)
        ?.groups.find((group) => group.id === groupId)
        ?.items.find((item) => item.id === itemId);
      const policy = currentItem ? getItemPolicy(currentItem) : null;

      if (
        policy &&
        ((patch.name !== undefined && !policy.canEditName) ||
          (patch.note !== undefined && !policy.canEditNote) ||
          (patch.price !== undefined && !policy.canEditPrice))
      ) {
        toast.error("Used treatments can only update price.");
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        const next = updateGroup(prev, sectionId, groupId, (group) => ({
          ...group,
          items: group.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        }));
        syncPricelistStore(next);
        return next;
      });

      try {
        await clinicApi.pricelist.updateItem(itemId, patch);
      } catch (error) {
        toast.error(
          error instanceof ApiError && error.code === "PRICELIST_ITEM_LOCKED"
            ? "This treatment is already used in treatment plans. Only the price can be changed."
            : "Failed to save item changes.",
        );
        clinicApi.pricelist
          .get()
          .then((next) => {
            const normalized = normalizePricelistData(next);
            setData(normalized);
            syncPricelistStore(normalized);
          })
          .catch(() => null);
      }
    },
    [data],
  );

  const addItem = useCallback(
    async (groupId: string, item: { name: string; price: number; note: string }): Promise<boolean> => {
      try {
        const created = await clinicApi.pricelist.addItem({
          group_id: groupId,
          name: item.name,
          price: item.price,
          note: item.note,
        });
        setData((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            sections: prev.sections.map((section) => ({
              ...section,
              groups: section.groups.map((group) =>
                group.id !== groupId ? group : { ...group, items: [...group.items, created] },
              ),
            })),
          };
          syncPricelistStore(next);
          return next;
        });
        toast.success("Treatment added");
        return true;
      } catch {
        toast.error("Failed to add treatment.");
        return false;
      }
    },
    [],
  );

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const settings = data?.settings;
  const currentCurrency =
    currencies.find((currency) => currency.code === settings?.currency_code) ?? currencies[0];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading pricelist...</span>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">{fetchError || "Failed to load pricelist."}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  const blocks = buttonBlocks(data.sections);
  const openCurrency = () => {
    setPendingCurrency(settings?.currency_code ?? "USD");
    setSetupOpen(true);
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-6 lg:p-6">
        <div className="min-w-0">
          <div className="flex items-center justify-between rounded-md bg-card px-5 py-3.5 shadow-sm">
            <h1 className="font-sans text-[15px] font-medium uppercase tracking-wide text-primary">Price list</h1>
            <button
              type="button"
              onClick={() => savePricelist()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {blocks.map((block) => (
            <ButtonSection
              key={block.id}
              block={block}
              currency={currentCurrency}
              registerRef={(el) => {
                sectionRefs.current[block.id] = el;
              }}
              onItemPatch={patchItem}
              onItemAdd={addItem}
            />
          ))}
        </div>

        <aside className="order-first lg:order-none">
          <div className="rounded-md bg-card p-2 shadow-sm lg:sticky lg:top-6">
            <button
              type="button"
              aria-label="Currency"
              onClick={openCurrency}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-secondary"
            >
              <Banknote className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-sm">{currentCurrency.code}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{currentCurrency.label}</span>
              </span>
            </button>
            <nav className="hidden lg:block" aria-label="Treatment buttons">
              <div className="mx-2 my-2 h-px bg-border" />
              {blocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => scrollTo(block.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-secondary"
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border border-foreground/60 text-[9px] font-semibold leading-none">
                    {block.number ?? "•"}
                  </span>
                  <span className="truncate">{block.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>
      </div>

      <Dialog open={setupOpen} onOpenChange={open => { if (!saving) setSetupOpen(open); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
            <Banknote className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Select currency</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl bg-secondary p-3">
            <div className="flex items-center gap-3">
              <Banknote className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Currency</div>
                <Select value={pendingCurrency} onValueChange={setPendingCurrency}>
                  <SelectTrigger className="mt-0.5 h-8 border-0 bg-transparent p-0 font-semibold underline shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.label} ({currency.code}) - {currency.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAddCurrencyOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-background"
            >
              <Plus className="h-3.5 w-3.5" /> Add custom currency
            </button>
          </div>

          <DialogFooter>
            <Button
              onClick={confirmSetup}
              disabled={saving}
              className="gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              <Check className="h-4 w-4" /> OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCurrencyDialog
        open={addCurrencyOpen}
        onClose={() => setAddCurrencyOpen(false)}
        onAdd={(currency) => {
          setCurrencies((prev) =>
            prev.some((item) => item.code.toLowerCase() === currency.code.toLowerCase())
              ? prev
              : [...prev, currency],
          );
          setPendingCurrency(currency.code);
          setAddCurrencyOpen(false);
        }}
      />
    </div>
  );
}

type ItemPatch = Partial<Pick<PricelistItem, "name" | "price" | "note">>;
type NewItem = { name: string; price: number; note: string };

// Underlined inputs, as in the reference price list.
const lineInput =
  "h-8 rounded-none border-0 border-b border-border bg-transparent px-1 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0";
const priceInput =
  "w-16 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** One treatment button: "BUTTON 7 - CROWN" and the groups of its sections. */
function ButtonSection({
  block,
  currency,
  registerRef,
  onItemPatch,
  onItemAdd,
}: {
  block: ButtonBlock;
  currency: Currency;
  registerRef: (el: HTMLElement | null) => void;
  onItemPatch: (sectionId: string, groupId: string, itemId: string, patch: ItemPatch) => void;
  onItemAdd: (groupId: string, item: NewItem) => Promise<boolean>;
}) {
  return (
    <section ref={registerRef} className="scroll-mt-4" aria-label={block.label}>
      <h2 className="px-1 pb-2.5 pt-6 font-sans text-[13px] uppercase tracking-wide">
        {block.number != null ? (
          <>
            <b>Button {block.number}</b> - {block.label}
          </>
        ) : (
          <b>{block.label}</b>
        )}
      </h2>
      <div className="space-y-px overflow-hidden rounded-md shadow-sm">
        {block.sections.map((section, index) =>
          section.groups.map((group) => (
            <GroupCard
              key={group.id}
              // A second section under the same button has its own "Other" group.
              title={index > 0 && group.key === "other" ? `${group.title} (${section.label})` : group.title}
              group={group}
              currency={currency}
              onItemPatch={(itemId, patch) => onItemPatch(section.id, group.id, itemId, patch)}
              onItemAdd={(item) => onItemAdd(group.id, item)}
            />
          )),
        )}
      </div>
    </section>
  );
}

function GroupCard({
  title,
  group,
  currency,
  onItemPatch,
  onItemAdd,
}: {
  title: string;
  group: PricelistGroup;
  currency: Currency;
  onItemPatch: (itemId: string, patch: ItemPatch) => void;
  onItemAdd: (item: NewItem) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);

  return (
    <div className="bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <h3 className="min-w-0 flex-1 truncate font-sans text-sm font-medium">{title}</h3>
        <span className="hidden w-24 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
          Unit price
        </span>
        <span className="hidden w-[240px] shrink-0 text-[11px] text-muted-foreground sm:block">Note</span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          onClick={() => setOpen((value) => !value)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <>
          {group.items.map((item) => (
            <PriceRow
              key={item.id}
              item={item}
              currency={currency}
              onPatch={(patch) => onItemPatch(item.id, patch)}
            />
          ))}
          {adding ? (
            <NewItemRow
              currency={currency}
              onCancel={() => setAdding(false)}
              onAdd={async (item) => {
                if (await onItemAdd(item)) setAdding(false);
              }}
            />
          ) : (
            <div className="border-t border-border/60 py-2 text-center">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> {title}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PriceRow({
  item,
  currency,
  onPatch,
}: {
  item: PricelistItem;
  currency: Currency;
  onPatch: (patch: ItemPatch) => void;
}) {
  const [localName, setLocalName] = useState(item.name);
  const [localPrice, setLocalPrice] = useState(String(item.price));
  const [localNote, setLocalNote] = useState(item.note ?? "");

  useEffect(() => {
    setLocalName(item.name);
    setLocalPrice(String(item.price));
    setLocalNote(item.note ?? "");
  }, [item.id, item.name, item.note, item.price]);

  const handleNameBlur = () => {
    const trimmed = localName.trim();
    if (!trimmed) {
      setLocalName(item.name);
      return;
    }
    if (trimmed !== item.name) onPatch({ name: trimmed });
  };

  const handlePriceBlur = () => {
    const price = Math.max(0, Number(localPrice) || 0);
    setLocalPrice(String(price));
    if (price !== item.price) onPatch({ price });
  };

  const handleNoteBlur = () => {
    if (localNote !== (item.note ?? "")) onPatch({ note: localNote });
  };

  const policy = getItemPolicy(item);
  const lockTitle = policy.isUsed
    ? `Used in ${policy.usageCount} treatment plan${policy.usageCount === 1 ? "" : "s"}. Only the price can be changed.`
    : undefined;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 px-4 py-1.5 sm:flex-nowrap">
      <span className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground" title={lockTitle}>
        {policy.isUsed && <Lock className="h-3.5 w-3.5" aria-label={lockTitle} />}
      </span>
      <Input
        value={localName}
        aria-label="Treatment name"
        onChange={(event) => setLocalName(event.target.value)}
        onBlur={handleNameBlur}
        readOnly={!policy.canEditName}
        className={cn(lineInput, "min-w-0 flex-1 sm:max-w-[320px]", !policy.canEditName && "cursor-default border-transparent")}
      />
      <span className="hidden flex-1 sm:block" />
      <label className="flex w-24 shrink-0 items-center justify-end gap-1 text-sm">
        <span className="text-muted-foreground">{currency.symbol}</span>
        <Input
          type="number"
          min={0}
          value={localPrice}
          aria-label={`Price for ${item.name}`}
          onChange={(event) => setLocalPrice(event.target.value)}
          onBlur={handlePriceBlur}
          readOnly={!policy.canEditPrice}
          className={cn(lineInput, priceInput, !policy.canEditPrice && "cursor-default")}
        />
      </label>
      <Input
        value={localNote}
        aria-label={`Note for ${item.name}`}
        placeholder="Note:"
        onChange={(event) => setLocalNote(event.target.value)}
        onBlur={handleNoteBlur}
        readOnly={!policy.canEditNote}
        className={cn(lineInput, "w-full text-xs sm:w-[240px] sm:shrink-0", !policy.canEditNote && "cursor-default")}
      />
      <span className="hidden w-7 shrink-0 sm:block" />
    </div>
  );
}

function NewItemRow({
  currency,
  onAdd,
  onCancel,
}: {
  currency: Currency;
  onAdd: (item: NewItem) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onAdd({ name: trimmed, price: Math.max(0, Number(price) || 0), note: note.trim() });
    } finally {
      setBusy(false);
    }
  };
  const keys = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") void submit();
    if (event.key === "Escape") onCancel();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 bg-secondary/30 px-4 py-2 sm:flex-nowrap">
      <span className="hidden w-4 shrink-0 sm:block" />
      <Input
        autoFocus
        value={name}
        placeholder="Treatment name"
        aria-label="New treatment name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={keys}
        className={cn(lineInput, "min-w-0 flex-1 sm:max-w-[320px]")}
      />
      <span className="hidden flex-1 sm:block" />
      <label className="flex w-24 shrink-0 items-center justify-end gap-1 text-sm">
        <span className="text-muted-foreground">{currency.symbol}</span>
        <Input
          type="number"
          min={0}
          value={price}
          placeholder="0"
          aria-label="New treatment price"
          onChange={(event) => setPrice(event.target.value)}
          onKeyDown={keys}
          className={cn(lineInput, priceInput)}
        />
      </label>
      <Input
        value={note}
        placeholder="Note:"
        aria-label="New treatment note"
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={keys}
        className={cn(lineInput, "w-full text-xs sm:w-[240px] sm:shrink-0")}
      />
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" size="sm" className="h-7 gap-1 rounded-full" onClick={() => void submit()} disabled={busy || !name.trim()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Add
        </Button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function AddCurrencyDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (currency: Currency) => void;
}) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [symbol, setSymbol] = useState("");

  const reset = () => {
    setLabel("");
    setCode("");
    setSymbol("");
  };

  const submit = () => {
    if (!label.trim() || !code.trim()) return;
    onAdd({
      label: label.trim(),
      code: code.trim().toUpperCase(),
      symbol: symbol.trim() || code.trim().toUpperCase(),
    });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-4 w-4" /> Add custom currency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Currency name</label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="e.g. Saudi Riyal"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Code</label>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="e.g. SAR"
              maxLength={6}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Symbol (optional)</label>
            <Input
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="e.g. SAR"
              maxLength={8}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button onClick={submit} className="gap-1" disabled={!label.trim() || !code.trim()}>
            <Check className="h-4 w-4" /> Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
