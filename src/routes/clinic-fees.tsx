import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  Globe,
  DollarSign,
  Plus,
  Save,
  Settings,
  Check,
  X,
  Scissors,
  Layers,
  Droplet,
  Smile,
  Activity,
  Anchor,
  Crown as CrownIcon,
  Wrench,
  Package,
  MoreHorizontal,
  Sparkles,
  ChevronDown,
  Trash2,
  StickyNote,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clinic-fees")({
  head: () => ({
    meta: [
      { title: "Your Clinic Fees — BrightPlans" },
      { name: "description", content: "Manage pricelists, languages and currencies for your clinic." },
    ],
  }),
  component: ClinicFeesPage,
});

/* ---------------- Languages & Currencies ---------------- */

const DEFAULT_LANGUAGES = [
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
  { code: "USD", label: "United States dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "TRY", label: "Turkish lira", symbol: "₺" },
  { code: "EGP", label: "Egyptian pound", symbol: "£E" },
  { code: "GBP", label: "British pound", symbol: "£" },
];

/* ---------------- Pricelist data ---------------- */

type Item = { id: string; name: string; price: number; note?: string };
type SubGroup = { id: string; title: string; priceLabel?: string; items: Item[] };
type Section = { id: string; n: number | null; label: string; icon: React.ComponentType<{ className?: string }>; groups: SubGroup[] };

const uid = () => Math.random().toString(36).slice(2, 9);
const mk = (name: string, price = 0, note = ""): Item => ({ id: uid(), name, price, note });

const INITIAL: Section[] = [
  {
    id: "extraction", n: 1, label: "Extraction", icon: Scissors,
    groups: [
      { id: uid(), title: "Extraction", items: [
        mk("Wisdom Extraction", 100), mk("Surgical extraction", 200), mk("Remove existing implant", 0),
      ]},
      { id: uid(), title: "Other treatments", items: [] },
    ],
  },
  {
    id: "prosthesis", n: 2, label: "Prosthesis removal", icon: Layers,
    groups: [
      { id: uid(), title: "Prosthesis removal", items: [
        mk("Bridge removal", 10), mk("Crown removal", 10),
      ]},
    ],
  },
  {
    id: "filling", n: 3, label: "Filling", icon: Droplet,
    groups: [
      { id: uid(), title: "Filling", items: [
        mk("Filling", 150), mk("Temporary filling", 0), mk("Medicated filling", 0),
      ]},
      { id: uid(), title: "Inlay", items: [mk("Inlay", 300)] },
      { id: uid(), title: "Onlay", items: [mk("Onlay", 300)] },
      { id: uid(), title: "Other treatments", items: [] },
    ],
  },
  {
    id: "dentures", n: 4, label: "Dentures", icon: Smile,
    groups: [
      { id: uid(), title: "Dentures", priceLabel: "Package price", items: [
        mk("Temporary bridge", 20), mk("Temporary crown", 20), mk("Overdenture", 0), mk("Overdentures", 0),
      ]},
      { id: uid(), title: "Other treatments", items: [mk("Preci-vertix", 0)] },
    ],
  },
  {
    id: "rct", n: 5, label: "Root canal treatment", icon: Activity,
    groups: [
      { id: uid(), title: "Root canal treatments (by roots)", items: [
        mk("Root canal treatment - 1 root", 400),
        mk("Root canal treatment - 2 root", 500),
        mk("Root canal treatment - 3 root", 600),
        mk("Root canal re-treatment", 500),
      ]},
      { id: uid(), title: "Post (composite)", items: [mk("Post", 200)] },
      { id: uid(), title: "Post (metal)", items: [] },
      { id: uid(), title: "Other treatments", items: [mk("Parapulpal pin", 0)] },
    ],
  },
  {
    id: "implant", n: 6, label: "Implant", icon: Anchor,
    groups: [
      { id: uid(), title: "Implant", items: [
        mk("Implant - Nobel Biocare", 1500),
        mk("Implant - Neodent", 1000),
        mk("Implant - Straumann", 0),
        mk("Implant - Astra", 0),
        mk("Implant - Megagen", 0),
        mk("Implant - Nobel Alpha Bio", 0),
      ]},
      { id: uid(), title: "Implant abutment", items: [
        mk("Implant abutment - Titanium", 300),
        mk("Implant abutment - Zirconium", 500),
      ]},
      { id: uid(), title: "Implant (one-phase)", items: [mk("Implant - BCS/KOS", 1000)] },
      { id: uid(), title: "Other treatments", items: [
        mk("Healing screw", 0), mk("Gingiva former", 0), mk("Bar", 0),
        mk("Prosthetic screw (lateral)", 0), mk("Prosthetic screw", 0),
      ]},
    ],
  },
  {
    id: "crown", n: 7, label: "Crown", icon: CrownIcon,
    groups: [
      { id: uid(), title: "Crown", items: [
        mk("Crown - Metal-ceramic", 400),
        mk("Crown - Zirconium", 700),
        mk("Crown - Emax", 0),
        mk("Crown - Gold-ceramic", 0),
      ]},
      { id: uid(), title: "Veneer", items: [mk("Veneer", 500)] },
      { id: uid(), title: "Other treatments", items: [
        mk("Telescopic crown", 0), mk("Filing", 0),
      ]},
    ],
  },
  {
    id: "bridge", n: 8, label: "Bridge", icon: Wrench,
    groups: [
      { id: uid(), title: "Bridge", items: [
        mk("Bridge - Metal-ceramic", 400),
        mk("Bridge - Zirconium", 700),
        mk("Bridge - Press Ceramic", 0),
        mk("Bridge - Emax", 0),
      ]},
    ],
  },
  {
    id: "general", n: 9, label: "General (fixed price)", icon: Package,
    groups: [
      { id: uid(), title: "Packages", priceLabel: "Package price", items: [
        mk("All on 6 Bredent German", 0, "All Inclusive (6 pcs Bredent Implant - Temporary)"),
        mk("All on 6 Straumann Swiss", 0, "All Inclusive (6 pcs Straumann Implant - Temporary)"),
        mk("All on 4 Nobel Swiss", 0, "All Inclusive (4 pcs Nobel Implant - Temporary)"),
        mk("Premium Hollywood Smile", 0, "All Inclusive (All Transfers - 5 Stars Radisson)"),
        mk("Standard Smile Design", 0, "All Inclusive (All Transfers - 5 Stars Radisson)"),
      ]},
      { id: uid(), title: "General (fixed price)", priceLabel: "Package price", items: [
        mk("Panoramic X-ray", 50),
        mk("Impression", 0),
        mk("Sinus lift", 1000),
        mk("IV sedation", 1200),
        mk("Medical Pack", 200),
      ]},
      { id: uid(), title: "Diagnostics", priceLabel: "Package price", items: [] },
      { id: uid(), title: "Orthodontics (fixed price)", priceLabel: "Package price", items: [
        mk("Clear Aligners", 0), mk("Fixed ceramic braces", 0), mk("Fixed metal braces", 0),
        mk("Functional appliance", 0), mk("Removable appliance", 0), mk("Lingual braces", 0),
        mk("Orthodontic retainer", 0),
      ]},
      { id: uid(), title: "Dental Hygiene (fixed price)", priceLabel: "Package price", items: [
        mk("Teeth whitening - external bleach", 500),
        mk("Teeth whitening - internal bleach", 400),
        mk("Dental Hygiene Treatment", 100),
        mk("Prevention & hygiene", 150),
        mk("Topical fluoride", 50),
      ]},
      { id: uid(), title: "Hotel / Transfer", priceLabel: "Package price", items: [] },
    ],
  },
  {
    id: "other", n: 10, label: "Other", icon: MoreHorizontal,
    groups: [
      { id: uid(), title: "Other", items: [
        mk("Local X-ray", 0), mk("Accommodation", 0), mk("Transportation (Airport-Hotel-Clinic)", 0),
        mk("Apicoectomy", 0), mk("Core build-up", 0), mk("Crown lengthening", 0),
        mk("Gingival graft", 0), mk("Gingivectomy", 0), mk("Laser gingivectomy", 0),
        mk("Pocket reduction", 0), mk("Scaling / root planing", 0),
      ]},
    ],
  },
  {
    id: "hair", n: null, label: "Hair Transplant", icon: Sparkles,
    groups: [
      { id: uid(), title: "Packages & additional treatments", items: [] },
    ],
  },
];

/* ---------------- Page ---------------- */

function ClinicFeesPage() {
  const [setupOpen, setSetupOpen] = useState(true);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);

  const [language, setLanguage] = useState("en");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);

  const [pendingLang, setPendingLang] = useState(language);
  const [pendingCurrency, setPendingCurrency] = useState(currencyCode);

  const [sections, setSections] = useState<Section[]>(INITIAL);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentCurrency = currencies.find((c) => c.code === currencyCode) ?? currencies[0];
  const currentLanguage = DEFAULT_LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  const confirmSetup = () => {
    setLanguage(pendingLang);
    setCurrencyCode(pendingCurrency);
    setSetupOpen(false);
  };

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateItem = (sectionId: string, groupId: string, itemId: string, patch: Partial<Item>) => {
    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : {
        ...s,
        groups: s.groups.map((g) =>
          g.id !== groupId ? g : { ...g, items: g.items.map((it) => it.id === itemId ? { ...it, ...patch } : it) },
        ),
      },
    ));
  };

  const addItem = (sectionId: string, groupId: string) => {
    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : {
        ...s,
        groups: s.groups.map((g) =>
          g.id !== groupId ? g : { ...g, items: [...g.items, mk("New treatment", 0)] },
        ),
      },
    ));
  };

  const removeItem = (sectionId: string, groupId: string, itemId: string) => {
    setSections((prev) => prev.map((s) =>
      s.id !== sectionId ? s : {
        ...s,
        groups: s.groups.map((g) =>
          g.id !== groupId ? g : { ...g, items: g.items.filter((it) => it.id !== itemId) },
        ),
      },
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      {/* Header bar */}
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
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => {
                setPendingLang(language);
                setPendingCurrency(currencyCode);
                setSetupOpen(true);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Button>
            <Button size="sm" className="gap-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl gap-6 p-6 lg:grid lg:grid-cols-[1fr_240px] lg:p-8">
        {/* MAIN */}
        <div className="space-y-5">
          {sections.map((s) => (
            <SectionCard
              key={s.id}
              section={s}
              currency={currentCurrency}
              registerRef={(el) => { sectionRefs.current[s.id] = el; }}
              onUpdate={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* SIDE NAV */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-1 rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Categories
            </div>
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
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

      {/* Setup popup */}
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
                    {DEFAULT_LANGUAGES.map((l) => (
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
              type="button"
              onClick={() => setAddCurrencyOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-primary hover:bg-background"
            >
              <Plus className="h-3.5 w-3.5" />
              Add custom currency
            </button>
          </div>

          <DialogFooter>
            <Button onClick={confirmSetup} className="gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Check className="h-4 w-4" />
              OK
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

/* ---------------- Section card ---------------- */

function SectionCard({
  section, currency, registerRef, onUpdate, onAdd, onRemove,
}: {
  section: Section;
  currency: Currency;
  registerRef: (el: HTMLDivElement | null) => void;
  onUpdate: (sId: string, gId: string, iId: string, patch: Partial<Item>) => void;
  onAdd: (sId: string, gId: string) => void;
  onRemove: (sId: string, gId: string, iId: string) => void;
}) {
  const Icon = section.icon;
  return (
    <div ref={registerRef} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
      {/* Section header */}
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
            onUpdate={(iId, patch) => onUpdate(section.id, g.id, iId, patch)}
            onAdd={() => onAdd(section.id, g.id)}
            onRemove={(iId) => onRemove(section.id, g.id, iId)}
          />
        ))}
      </div>
    </div>
  );
}

function SubGroupBlock({
  group, currency, onUpdate, onAdd, onRemove,
}: {
  group: SubGroup;
  currency: Currency;
  onUpdate: (iId: string, patch: Partial<Item>) => void;
  onAdd: () => void;
  onRemove: (iId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const priceLabel = group.priceLabel ?? "Unit price";

  return (
    <div className="px-5 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-foreground">{group.title}</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="hidden sm:inline">{priceLabel}</span>
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
              onUpdate={(patch) => onUpdate(it.id, patch)}
              onRemove={() => onRemove(it.id)}
            />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-primary/40 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add to {group.title}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  item, currency, onUpdate, onRemove,
}: {
  item: Item;
  currency: Currency;
  onUpdate: (patch: Partial<Item>) => void;
  onRemove: () => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const hasNote = !!item.note?.trim();

  return (
    <div className="group rounded-xl border border-transparent bg-secondary/40 px-3 py-2 transition hover:border-border hover:bg-secondary/70">
      <div className="flex items-center gap-3">
        <Input
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="h-8 flex-1 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-1"
        />
        <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 ring-1 ring-border/60">
          <span className="text-xs font-semibold text-muted-foreground">{currency?.symbol}</span>
          <Input
            type="number"
            value={item.price}
            onChange={(e) => onUpdate({ price: Number(e.target.value) || 0 })}
            className="h-6 w-20 border-0 bg-transparent p-0 text-right text-sm font-semibold shadow-none focus-visible:ring-0"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditingNote((v) => !v)}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md transition",
            hasNote || editingNote
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
          title="Add note"
        >
          <StickyNote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {(editingNote || hasNote) && (
        <Input
          autoFocus={editingNote}
          value={item.note ?? ""}
          onChange={(e) => onUpdate({ note: e.target.value })}
          placeholder="Note…"
          className="mt-2 h-8 bg-background text-xs"
        />
      )}
    </div>
  );
}

/* ---------------- Add currency dialog ---------------- */

function AddCurrencyDialog({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Currency) => void;
}) {
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [symbol, setSymbol] = useState("");

  const reset = () => { setLabel(""); setCode(""); setSymbol(""); };

  const submit = () => {
    if (!label.trim() || !code.trim()) return;
    onAdd({ label: label.trim(), code: code.trim().toUpperCase(), symbol: symbol.trim() || code.trim().toUpperCase() });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-4 w-4" />
            Add custom currency
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Currency name</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Saudi Riyal" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Code</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SAR" maxLength={6} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Symbol (optional)</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. ﷼" maxLength={4} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={submit} className="gap-1" disabled={!label.trim() || !code.trim()}>
            <Check className="h-4 w-4" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
