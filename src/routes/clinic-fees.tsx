import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Banknote, Globe, DollarSign, Plus, Save, Settings, Check, X } from "lucide-react";
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

export const Route = createFileRoute("/clinic-fees")({
  head: () => ({
    meta: [
      { title: "Your Clinic Fees — BrightPlans" },
      { name: "description", content: "Manage pricelists, languages and currencies for your clinic." },
    ],
  }),
  component: ClinicFeesPage,
});

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

const PRICELIST_GROUPS = [
  { n: 1, label: "Extraction", items: ["Wisdom Extraction", "Surgical extraction", "Remove existing implant"], extra: "Other treatments" },
  { n: 2, label: "Prosthesis removal", items: ["Bridge removal", "Crown removal"] },
  { n: 3, label: "Filling", items: ["Temporary filling", "Inlay", "Onlay"] },
  { n: 4, label: "Dentures", items: ["Temporary bridge", "Temporary crown"] },
  { n: 5, label: "Root canal treatment", items: ["RCT - 1 root", "RCT - 2 root", "RCT - 3 root"] },
  { n: 6, label: "Implant", items: ["Implant", "Abutment", "Implant + abutment"] },
  { n: 7, label: "Crown", items: ["Zirconia crown", "PFM crown", "E-max crown"] },
  { n: 8, label: "Bridge", items: ["3-unit bridge", "4-unit bridge"] },
  { n: 9, label: "General (fixed)", items: ["Consultation", "Cleaning", "Whitening"] },
  { n: 10, label: "Other", items: ["Night guard", "Retainer"] },
];

function ClinicFeesPage() {
  const [setupOpen, setSetupOpen] = useState(true);
  const [addCurrencyOpen, setAddCurrencyOpen] = useState(false);

  const [language, setLanguage] = useState("en");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);

  const [pendingLang, setPendingLang] = useState(language);
  const [pendingCurrency, setPendingCurrency] = useState(currencyCode);

  const currentCurrency = currencies.find((c) => c.code === currencyCode) ?? currencies[0];
  const currentLanguage = DEFAULT_LANGUAGES.find((l) => l.code === language)?.label ?? "English";

  const confirmSetup = () => {
    setLanguage(pendingLang);
    setCurrencyCode(pendingCurrency);
    setSetupOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="bg-[image:var(--gradient-hero)] px-6 py-4 text-white shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Banknote className="h-6 w-6 text-accent" />
            <h1 className="text-lg font-semibold tracking-wide">Your Clinic Fees</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">{currentLanguage}</span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              {currentCurrency?.symbol} {currentCurrency?.code}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* Pricelist */}
          <div className="rounded-2xl bg-card shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                Price List
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setPendingLang(language);
                    setPendingCurrency(currencyCode);
                    setSetupOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {PRICELIST_GROUPS.map((g) => (
                <div key={g.n} className="px-5 py-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Button {g.n} — {g.label}
                  </div>
                  <div className="space-y-2">
                    {g.items.map((it) => (
                      <div
                        key={it}
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-foreground">{it}</span>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span>{currentCurrency?.symbol}</span>
                          <Input
                            type="number"
                            placeholder="0"
                            className="h-8 w-20 text-right"
                          />
                        </div>
                        <Input placeholder="Note" className="h-8 w-44" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side rail */}
          <aside className="space-y-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground">
              <Globe className="h-4 w-4 text-primary" />
              {currentLanguage}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground">
              <DollarSign className="mt-0.5 h-4 w-4 text-primary" />
              <div className="leading-tight">
                <div>{currentCurrency?.code}</div>
                <div className="text-xs text-muted-foreground">{currentCurrency?.label}</div>
              </div>
            </div>
            <div className="space-y-1 pt-2">
              {PRICELIST_GROUPS.map((g) => (
                <div
                  key={g.n}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-secondary"
                >
                  <span className="grid h-5 w-5 place-items-center rounded border border-border text-[10px] font-bold">
                    {g.n}
                  </span>
                  <span className="truncate">{g.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Setup popup (Select pricelist) */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
            <Banknote className="h-6 w-6" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Select pricelist</DialogTitle>
          </DialogHeader>

          {/* Language */}
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
                      <SelectItem key={l.code} value={l.code}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Currency */}
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold underline">You can have multiple pricelists</span>: create
            your base pricelist in your primary language and currency, then change the language and/or
            currency to translate it or exchange it to a different one.
          </p>

          <DialogFooter>
            <Button onClick={confirmSetup} className="gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90">
              <Check className="h-4 w-4" />
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add custom currency */}
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

function AddCurrencyDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: Currency) => void;
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
    onAdd({ label: label.trim(), code: code.trim().toUpperCase(), symbol: symbol.trim() || code.trim().toUpperCase() });
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
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
