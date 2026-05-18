import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote, Globe, DollarSign, Plus, Save, Settings, Check, X,
  Scissors, Layers, Droplet, Smile, Activity, Anchor,
  Crown as CrownIcon, Wrench, Package, MoreHorizontal, Sparkles,
  ChevronDown, Trash2, StickyNote, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  clinicApi,
  type PricelistData,
  type PricelistSection,
  type PricelistGroup,
  type PricelistItem,
} from "@/lib/admin/api";
import { toast } from "sonner";

export const Route = createFileRoute("/clinic-fees")({
  head: () => ({
    meta: [
      { title: "Your Clinic Fees — BrightPlans" },
      { name: "description", content: "Manage pricelists, languages and currencies for your clinic." },
    ],
  }),
  component: ClinicFeesPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
];

type Currency = { code: string; label: string; symbol: string };

const DEFAULT_CURRENCIES: Currency[] = [
  { code: "USD", label: "United States dollar", symbol: "$"  },
  { code: "EUR", label: "Euro",                 symbol: "€"  },
  { code: "TRY", label: "Turkish lira",         symbol: "₺"  },
  { code: "EGP", label: "Egyptian pound",       symbol: "£E" },
  { code: "GBP", label: "British pound",        symbol: "£"  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scissors: Scissors, layers: Layers,  droplet: Droplet,  smile: Smile,
  activity: Activity, anchor: Anchor,  crown: CrownIcon,  wrench: Wrench,
  package:  Package,  more:  MoreHorizontal, sparkles: Sparkles,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function ClinicFeesPage() {
  const [data, setData]             = useState<PricelistData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [setupOpen, setSetupOpen]           = useState(false);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);
  const [currencies, setCurrencies]         = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [pendingLang, setPendingLang]       = useState("en");
  const [pendingCurrency, setPendingCurrency] = useState("USD");

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── GET /clinic/pricelist ───────────────────────────────────────────────────
  useEffect(() => {
    clinicApi.pricelist.get()
      .then((d) => {
        setData(d);
        setPendingLang(d.settings.language);
        setPendingCurrency(d.settings.currency_code);
        const cur: Currency = {
          code:   d.settings.currency_code,
          label:  d.settings.currency_label,
          symbol: d.settings.currency_symbol,
        };
        setCurrencies((prev) => prev.some((c) => c.code === cur.code) ? prev : [...prev, cur]);
      })
      .catch(() => setFetchError("Failed to load pricelist. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  // ── PUT /clinic/pricelist (Save button — full sync fallback) ────────────────
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const saved = await clinicApi.pricelist.save(data);
      setData(saved);
      toast.success("Pricelist saved");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Settings dialog OK → PUT /clinic/pricelist (settings only) ─────────────
  const confirmSetup = async () => {
    const cur = currencies.find((c) => c.code === pendingCurrency) ?? currencies[0];
    const newData: PricelistData = {
      ...(data!),
      settings: {
        language:        pendingLang,
        currency_code:   cur.code,
        currency_label:  cur.label,
        currency_symbol: cur.symbol,
      },
    };
    setData(newData);
    setSetupOpen(false);
    try {
      await clinicApi.pricelist.save(newData);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings.");
    }
  };

  // ── PATCH /clinic/pricelist/items/{id} ──────────────────────────────────────
  const patchItem = useCallback(async (
    sId: string,
    gId: string,
    iId: string,
    patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>,
  ) => {
    // 1. Optimistic local update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id !== sId ? s : {
            ...s,
            groups: s.groups.map((g) =>
              g.id !== gId ? g : {
                ...g,
                items: g.items.map((it) => it.id === iId ? { ...it, ...patch } : it),
              },
            ),
          },
        ),
      };
    });

    // 2. PATCH → API
    try {
      await clinicApi.pricelist.updateItem(iId, patch);
    } catch {
      toast.error("Failed to save changes. Please try again.");
      // Refetch to restore correct state
      clinicApi.pricelist.get().then(setData).catch(() => null);
    }
  }, []);

  // ── POST /clinic/pricelist/items ────────────────────────────────────────────
  const addItem = useCallback(async (sId: string, gId: string) => {
    try {
      const newItem = await clinicApi.pricelist.addItem({
        group_id: gId,
        name:     "New treatment",
        price:    0,
        note:     "",
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((s) =>
            s.id !== sId ? s : {
              ...s,
              groups: s.groups.map((g) =>
                g.id !== gId ? g : { ...g, items: [...g.items, newItem] },
              ),
            },
          ),
        };
      });
    } catch {
      toast.error("Failed to add item.");
    }
  }, []);

  // ── DELETE /clinic/pricelist/items/{id} ─────────────────────────────────────
  const removeItem = useCallback(async (sId: string, gId: string, iId: string) => {
    // Optimistic remove
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id !== sId ? s : {
            ...s,
            groups: s.groups.map((g) =>
              g.id !== gId ? g : { ...g, items: g.items.filter((it) => it.id !== iId) },
            ),
          },
        ),
      };
    });

    try {
      await clinicApi.pricelist.deleteItem(iId);
    } catch {
      toast.error("Failed to delete item.");
      clinicApi.pricelist.get().then(setData).catch(() => null);
    }
  }, []);

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const settings        = data?.settings;
  const currentLanguage = LANGUAGES.find((l) => l.code === settings?.language)?.label ?? "English";
  const currentCurrency = currencies.find((c) => c.code === settings?.currency_code) ?? currencies[0];

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading pricelist…</span>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-medium">{fetchError || "Failed to load pricelist."}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">

      {/* Header */}
      <div className="bg-[image:var(--gradient-hero)] px-6 py-5 text-white shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
              <Banknote className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">Clinic</div>
              <h1 className="text-lg font-semibold tracking-wide">Price List</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
              <Globe className="h-3.5 w-3.5" /> {currentLanguage}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
              <DollarSign className="h-3.5 w-3.5" /> {currentCurrency?.code}
            </span>
            <Button
              variant="ghost" size="sm"
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
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl gap-6 p-6 lg:grid lg:grid-cols-[1fr_240px] lg:p-8">

        {/* Sections */}
        <div className="space-y-5">
          {data.sections.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              currency={currentCurrency}
              registerRef={(el) => { sectionRefs.current[s.id] = el; }}
              onPatch={(gId, iId, patch) => patchItem(s.id, gId, iId, patch)}
              onAdd={(gId)          => addItem(s.id, gId)}
              onRemove={(gId, iId)  => removeItem(s.id, gId, iId)}
            />
          ))}
        </div>

        {/* Side nav */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-1 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Categories
            </div>
            {data.sections.map((s) => {
              const Icon = ICON_MAP[s.icon] ?? Package;
              return (
                <button
                  key={s.id} type="button" onClick={() => scrollTo(s.id)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground transition hover:bg-secondary"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate">{s.label}</span>
                  {s.n != null && (
                    <span className="text-[10px] font-bold text-muted-foreground">{s.n}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Settings dialog */}
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
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
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
                    {currencies.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label} ({c.code}) — {c.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              type="button" onClick={() => setAddCurrencyOpen(true)}
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
        onAdd={(c) => {
          setCurrencies((prev) =>
            prev.some((x) => x.code.toLowerCase() === c.code.toLowerCase()) ? prev : [...prev, c],
          );
          setPendingCurrency(c.code);
          setAddCurrencyOpen(false);
        }}
      />
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section, currency, registerRef, onPatch, onAdd, onRemove,
}: {
  section:     PricelistSection;
  currency:    Currency;
  registerRef: (el: HTMLDivElement | null) => void;
  onPatch:     (gId: string, iId: string, patch: Partial<PricelistItem>) => void;
  onAdd:       (gId: string) => void;
  onRemove:    (gId: string, iId: string) => void;
}) {
  const Icon = ICON_MAP[section.icon] ?? Package;
  return (
    <div ref={registerRef} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-5 py-3.5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {section.n != null ? `Button ${section.n}` : "Section"}
          </div>
          <div className="text-sm font-bold uppercase tracking-wide text-foreground">
            {section.label}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {section.groups.map((g) => (
          <SubGroupBlock
            key={g.id}
            group={g}
            currency={currency}
            onPatch={(iId, patch) => onPatch(g.id, iId, patch)}
            onAdd={() => onAdd(g.id)}
            onRemove={(iId) => onRemove(g.id, iId)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-group block ──────────────────────────────────────────────────────────

function SubGroupBlock({
  group, currency, onPatch, onAdd, onRemove,
}: {
  group:    PricelistGroup;
  currency: Currency;
  onPatch:  (iId: string, patch: Partial<PricelistItem>) => void;
  onAdd:    () => void;
  onRemove: (iId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="px-5 py-4">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-foreground">{group.title}</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="hidden sm:inline">{group.price_label ?? "Unit price"}</span>
          <span className="hidden sm:inline">Note</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
        </div>
      </button>

      {open && (
        <div className="space-y-1.5">
          {group.items.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-center text-xs text-muted-foreground">
              No items yet
            </div>
          )}
          {group.items.map((it) => (
            <Row
              key={it.id}
              item={it}
              currency={currency}
              onPatch={(patch) => onPatch(it.id, patch)}
              onRemove={() => onRemove(it.id)}
            />
          ))}
          <button
            type="button" onClick={onAdd}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" /> Add to {group.title}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
// Local state for smooth typing. PATCH is called on blur only if the value changed.

function Row({
  item, currency, onPatch, onRemove,
}: {
  item:     PricelistItem;
  currency: Currency;
  onPatch:  (patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>) => void;
  onRemove: () => void;
}) {
  const [localName,  setLocalName]  = useState(item.name);
  const [localPrice, setLocalPrice] = useState(String(item.price));
  const [localNote,  setLocalNote]  = useState(item.note ?? "");
  const [editingNote, setEditingNote] = useState(false);

  // Sync local state when a different item is rendered in this slot
  useEffect(() => {
    setLocalName(item.name);
    setLocalPrice(String(item.price));
    setLocalNote(item.note ?? "");
  }, [item.id]);

  // ── onBlur handlers — call PATCH only if value actually changed ──────────────
  const handleNameBlur = () => {
    const trimmed = localName.trim();
    if (!trimmed) { setLocalName(item.name); return; }
    if (trimmed !== item.name) onPatch({ name: trimmed });
  };

  const handlePriceBlur = () => {
    const p = Math.max(0, Number(localPrice) || 0);
    setLocalPrice(String(p));
    if (p !== item.price) onPatch({ price: p });
  };

  const handleNoteBlur = () => {
    if (localNote !== (item.note ?? "")) onPatch({ note: localNote });
  };

  const hasNote = !!localNote.trim();

  return (
    <div className="group rounded-xl border border-transparent bg-secondary/40 px-3 py-2 transition hover:border-border hover:bg-secondary/70">
      <div className="flex items-center gap-3">

        {/* Name — PATCH on blur */}
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          className="h-8 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
        />

        {/* Price — PATCH on blur */}
        <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 ring-1 ring-border/60">
          <span className="text-xs font-semibold text-muted-foreground">{currency?.symbol}</span>
          <Input
            type="number"
            value={localPrice}
            onChange={(e) => setLocalPrice(e.target.value)}
            onBlur={handlePriceBlur}
            className="h-6 w-20 border-0 bg-transparent p-0 text-right text-sm font-semibold shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Note toggle */}
        <button
          type="button"
          onClick={() => setEditingNote((v) => !v)}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md transition",
            hasNote || editingNote
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
          title={hasNote ? "Edit note" : "Add note"}
        >
          <StickyNote className="h-4 w-4" />
        </button>

        {/* Delete — DELETE immediately */}
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Note field — PATCH on blur */}
      {(editingNote || hasNote) && (
        <Input
          autoFocus={editingNote && !hasNote}
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Note…"
          className="mt-2 h-8 bg-background text-xs"
        />
      )}
    </div>
  );
}

// ─── Add currency dialog ──────────────────────────────────────────────────────

function AddCurrencyDialog({
  open, onClose, onAdd,
}: {
  open:    boolean;
  onClose: () => void;
  onAdd:   (c: Currency) => void;
}) {
  const [label,  setLabel]  = useState("");
  const [code,   setCode]   = useState("");
  const [symbol, setSymbol] = useState("");

  const reset  = () => { setLabel(""); setCode(""); setSymbol(""); };
  const submit = () => {
    if (!label.trim() || !code.trim()) return;
    onAdd({
      label:  label.trim(),
      code:   code.trim().toUpperCase(),
      symbol: symbol.trim() || code.trim().toUpperCase(),
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-4 w-4" /> Add custom currency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Currency name</label>
            <Input value={label}  onChange={(e) => setLabel(e.target.value)}  placeholder="e.g. Saudi Riyal" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Code</label>
            <Input value={code}   onChange={(e) => setCode(e.target.value)}   placeholder="e.g. SAR" maxLength={6} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Symbol (optional)</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. ﷼" maxLength={4} />
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
