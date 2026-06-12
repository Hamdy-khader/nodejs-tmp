import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Anchor,
  Banknote,
  Check,
  ChevronDown,
  Crown as CrownIcon,
  DollarSign,
  Droplet,
  Globe,
  Layers,
  Lock,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Save,
  Scissors,
  Settings,
  Smile,
  Sparkles,
  StickyNote,
  Trash2,
  Wrench,
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

export const Route = createFileRoute("/clinic-fees")({
  head: () => ({
    meta: [
      { title: "Your Clinic Fees - Treatly" },
      {
        name: "description",
        content: "Manage pricelists, languages and currencies for your clinic.",
      },
    ],
  }),
  component: ClinicFeesPage,
});

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
];

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scissors: Scissors,
  layers: Layers,
  droplet: Droplet,
  smile: Smile,
  activity: Activity,
  anchor: Anchor,
  crown: CrownIcon,
  wrench: Wrench,
  package: Package,
  more: MoreHorizontal,
  sparkles: Sparkles,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);
const isPersistedId = (id: string) => /^\d+$/.test(id);

function getItemPolicy(item: PricelistItem) {
  const isUsed = Boolean(item.is_used ?? (item.usage_count ?? 0) > 0);
  return {
    isUsed,
    usageCount: item.usage_count ?? 0,
    canEditName: item.can_edit_name ?? !isUsed,
    canEditNote: item.can_edit_note ?? !isUsed,
    canDelete: item.can_delete ?? !isUsed,
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

function ClinicFeesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PricelistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [setupOpen, setSetupOpen] = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [pendingLang, setPendingLang] = useState("en");
  const [pendingCurrency, setPendingCurrency] = useState("USD");

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
        setPendingLang(normalized.settings.language);
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
        setDirty(false);
        toast.success("Pricelist saved");
        return saved;
      } catch {
        toast.error("Failed to save. Please try again.");
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
    const next: PricelistData = {
      ...data,
      settings: {
        language: pendingLang,
        currency_code: currency.code,
        currency_label: currency.label,
        currency_symbol: currency.symbol,
      },
    };

    setSetupOpen(false);
    await savePricelist(next);
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

      if (!isPersistedId(itemId)) {
        setDirty(true);
        return;
      }

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
    async (groupId: string, item: { name: string; price: number; note: string }) => {
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
      } catch {
        toast.error("Failed to add treatment.");
      }
    },
    [],
  );

  const deleteItem = useCallback(
    async (sectionId: string, groupId: string, item: PricelistItem) => {
      const policy = getItemPolicy(item);
      if (!policy.canDelete) {
        toast.error("Used treatments cannot be deleted.");
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        const next = updateGroup(prev, sectionId, groupId, (group) => ({
          ...group,
          items: group.items.filter((entry) => entry.id !== item.id),
        }));
        syncPricelistStore(next);
        return next;
      });

      if (!isPersistedId(item.id)) {
        setDirty(true);
        return;
      }

      try {
        await clinicApi.pricelist.deleteItem(item.id);
        toast.success("Treatment deleted");
      } catch (error) {
        toast.error(
          error instanceof ApiError && error.code === "PRICELIST_ITEM_IN_USE"
            ? "This treatment is already used in treatment plans and cannot be deleted."
            : "Failed to delete treatment.",
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
    [],
  );

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const settings = data?.settings;
  const currentLanguage =
    LANGUAGES.find((language) => language.code === settings?.language)?.label ?? "English";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      <div className="bg-[image:var(--gradient-hero)] px-6 py-5 text-white shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
              <Banknote className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">Clinic</div>
              <h1 className="text-lg font-semibold tracking-wide">Price List</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
              <Globe className="h-3.5 w-3.5" /> {currentLanguage}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
              <DollarSign className="h-3.5 w-3.5" /> {currentCurrency.code}
            </span>
            {dirty && (
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-medium text-white/75">
                Unsaved changes
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setPendingLang(settings?.language ?? "en");
                setPendingCurrency(settings?.currency_code ?? "USD");
                setSetupOpen(true);
              }}
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </Button>
            <Button
              size="sm"
              className="gap-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => savePricelist()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl gap-6 p-6 lg:grid lg:grid-cols-[1fr_240px] lg:p-8">
        <div className="space-y-5">
          {data.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              currency={currentCurrency}
              registerRef={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              onItemPatch={(groupId, itemId, patch) =>
                patchItem(section.id, groupId, itemId, patch)
              }
              onItemAdd={addItem}
              onItemDelete={(groupId, item) => deleteItem(section.id, groupId, item)}
            />
          ))}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-1 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Categories
            </div>
            {data.sections.map((section) => {
              const Icon = ICON_MAP[section.icon] ?? Package;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollTo(section.id)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-secondary"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{section.label}</span>
                  {section.n != null && (
                    <span className="text-[10px] font-bold text-muted-foreground">{section.n}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
            <Banknote className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Select pricelist</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl bg-secondary p-3">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Language</div>
                <Select value={pendingLang} onValueChange={setPendingLang}>
                  <SelectTrigger className="mt-0.5 h-8 border-0 bg-transparent p-0 font-semibold underline shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((language) => (
                      <SelectItem key={language.code} value={language.code}>
                        {language.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-secondary p-3">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
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

function SectionCard({
  section,
  currency,
  registerRef,
  onItemPatch,
  onItemAdd,
  onItemDelete,
}: {
  section: PricelistSection;
  currency: Currency;
  registerRef: (el: HTMLDivElement | null) => void;
  onItemPatch: (
    groupId: string,
    itemId: string,
    patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>,
  ) => void;
  onItemAdd: (
    groupId: string,
    item: { name: string; price: number; note: string },
  ) => Promise<void>;
  onItemDelete: (groupId: string, item: PricelistItem) => Promise<void>;
}) {
  const Icon = ICON_MAP[section.icon] ?? Package;

  return (
    <div
      ref={registerRef}
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-5 py-3.5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {section.n != null ? `Button ${section.n}` : "Section"}
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(160px,1fr)_88px_128px]">
            <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-semibold uppercase tracking-wide">
              {section.label}
            </div>
            <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm">
              {section.n ?? "-"}
            </div>
            <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs">
              {section.icon}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {section.groups.length === 0 && (
          <div className="p-5 text-center text-xs text-muted-foreground">
            No groups yet. Add one to start building this section.
          </div>
        )}
        {section.groups.map((group) => (
          <SubGroupBlock
            key={group.id}
            sectionId={section.id}
            group={group}
            currency={currency}
            onItemPatch={(itemId, patch) => onItemPatch(group.id, itemId, patch)}
            onItemAdd={(item) => onItemAdd(group.id, item)}
            onItemDelete={(item) => onItemDelete(group.id, item)}
          />
        ))}
      </div>
    </div>
  );
}

function SubGroupBlock({
  sectionId,
  group,
  currency,
  onItemPatch,
  onItemAdd,
  onItemDelete,
}: {
  sectionId: string;
  group: PricelistGroup;
  currency: Currency;
  onItemPatch: (
    itemId: string,
    patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>,
  ) => void;
  onItemAdd: (item: { name: string; price: number; note: string }) => Promise<void>;
  onItemDelete: (item: PricelistItem) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [adding, setAdding] = useState(false);

  const submitNewItem = async () => {
    const name = draftName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await onItemAdd({
        name,
        price: Math.max(0, Number(draftPrice) || 0),
        note: draftNote.trim(),
      });
      setDraftName("");
      setDraftPrice("");
      setDraftNote("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-8 w-8 place-items-center rounded-md hover:bg-secondary"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
        </button>
        <div className="flex h-8 min-w-[180px] flex-1 items-center rounded-md border border-input bg-background px-3 text-sm font-semibold">
          {group.title}
        </div>
      </div>

      {open && (
        <div className="space-y-1.5">
          {group.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-center text-xs text-muted-foreground">
              No items yet
            </div>
          )}
          {group.items.map((item) => (
            <PriceRow
              key={item.id}
              sectionId={sectionId}
              groupTitle={group.title}
              item={item}
              currency={currency}
              onPatch={(patch) => onItemPatch(item.id, patch)}
              onDelete={() => onItemDelete(item)}
            />
          ))}
          <div className="rounded-xl border border-dashed border-border/70 bg-background/70 px-3 py-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Add treatment
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
              <Input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Treatment name"
                className="h-8"
              />
              <Input
                type="number"
                min={0}
                value={draftPrice}
                onChange={(event) => setDraftPrice(event.target.value)}
                placeholder="Price"
                className="h-8"
              />
            </div>
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <Input
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder="Optional note"
                className="h-8 flex-1"
              />
              <Button
                type="button"
                size="sm"
                className="gap-1.5 self-start"
                onClick={submitNewItem}
                disabled={adding || !draftName.trim()}
              >
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceRow({
  sectionId,
  groupTitle,
  item,
  currency,
  onPatch,
  onDelete,
}: {
  sectionId: string;
  groupTitle: string;
  item: PricelistItem;
  currency: Currency;
  onPatch: (patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>) => void;
  onDelete: () => void;
}) {
  const [localName, setLocalName] = useState(item.name);
  const [localPrice, setLocalPrice] = useState(String(item.price));
  const [localNote, setLocalNote] = useState(item.note ?? "");
  const [editingNote, setEditingNote] = useState(false);

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

  const hasNote = Boolean(localNote.trim());
  const policy = getItemPolicy(item);
  const statusText = policy.isUsed
    ? `Used in ${policy.usageCount} treatment plan${policy.usageCount === 1 ? "" : "s"}`
    : "Not used yet";

  return (
    <div className="group rounded-xl border border-transparent bg-secondary/40 px-3 py-2 transition hover:border-border hover:bg-secondary/70">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            policy.isUsed ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900",
          )}
        >
          {statusText}
        </span>
        {policy.isUsed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            Name and note locked
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={localName}
          onChange={(event) => setLocalName(event.target.value)}
          onBlur={handleNameBlur}
          readOnly={!policy.canEditName}
          className={cn(
            "h-8 min-w-[220px] flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1",
            !policy.canEditName && "cursor-default text-foreground/80 focus-visible:ring-0",
          )}
        />

        <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 ring-1 ring-border/60">
          <span className="text-xs font-semibold text-muted-foreground">{currency.symbol}</span>
          <Input
            type="number"
            value={localPrice}
            onChange={(event) => setLocalPrice(event.target.value)}
            onBlur={handlePriceBlur}
            readOnly={!policy.canEditPrice}
            className={cn(
              "h-6 w-20 border-0 bg-transparent p-0 text-right text-sm font-semibold shadow-none focus-visible:ring-0",
              !policy.canEditPrice && "cursor-default text-foreground/80",
            )}
          />
        </div>

        <button
          type="button"
          disabled={!policy.canEditNote}
          onClick={() => setEditingNote((value) => !value)}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md transition",
            hasNote || editingNote
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
            !policy.canEditNote && "cursor-not-allowed opacity-50",
          )}
          title={
            !policy.canEditNote
              ? "Used treatments cannot edit note"
              : hasNote
                ? "Edit note"
                : "Add note"
          }
        >
          <StickyNote className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!policy.canDelete}
          onClick={onDelete}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md transition",
            policy.canDelete
              ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "cursor-not-allowed text-muted-foreground/50",
          )}
          title={policy.canDelete ? "Delete treatment" : "Used treatments cannot be deleted"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {(editingNote || hasNote) && (
        <Input
          autoFocus={editingNote && !hasNote}
          value={localNote}
          onChange={(event) => setLocalNote(event.target.value)}
          onBlur={handleNoteBlur}
          readOnly={!policy.canEditNote}
          placeholder="Note..."
          className={cn("mt-2 h-8 bg-background text-xs", !policy.canEditNote && "cursor-default")}
        />
      )}
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
