import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Youtube,
  Save,
  Pencil,
  Settings as SettingsIcon,
  DollarSign,
  ArrowUpDown,
  QrCode,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  Check,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  planSettingsStore,
  usePlanSettings,
  type PageDesign,
} from "@/lib/plan-settings-store";

export const Route = createFileRoute("/plan-settings")({
  head: () => ({
    meta: [
      { title: "Plan Settings — BrightPlans" },
      { name: "description", content: "Configure your treatment plan PDF design." },
    ],
  }),
  component: PlanSettingsPage,
});

type EditorKey = keyof PageDesign | "pageSize" | "priceList" | "pricePage" | "planSections" | null;

function PlanSettingsPage() {
  const settings = usePlanSettings();
  const [saved, setSaved] = useState(false);
  const [editor, setEditor] = useState<EditorKey>(null);

  const save = () => {
    planSettingsStore.update({});
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.96_0.005_160)] px-6 py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Header card */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-5">
              <h1 className="text-xl font-semibold uppercase tracking-[0.18em] text-primary">
                Plan Settings
              </h1>
              <Select
                value={settings.language}
                onValueChange={(v) => planSettingsStore.update({ language: v })}
              >
                <SelectTrigger className="h-10 w-[220px] rounded-none border-0 border-b text-sm shadow-none focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["English (EN)", "العربية (AR)", "Français (FR)", "Deutsch (DE)"].map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-full bg-primary-deep px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary-deep/90">
                <span className="grid size-7 place-items-center rounded-full bg-destructive">
                  <Youtube className="size-4 text-white" />
                </span>
                <span className="leading-tight text-left">
                  Tutorial
                  <br />
                  Plan Settings
                </span>
              </button>
              <button
                onClick={save}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:text-primary-deep"
              >
                <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm">
                  <Save className="size-4" />
                </span>
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </header>
        </section>

        {/* Page Design */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold uppercase tracking-[0.18em] text-primary">
            Page Design
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DesignCard
              label="Front cover"
              action="EDIT"
              onClick={() => setEditor("frontCover")}
              preview={<FrontCoverPreview title={settings.pageDesign.frontCover.title} subtitle={settings.pageDesign.frontCover.subtitle} />}
            />
            <DesignCard
              label="Inner pages"
              action="EDIT"
              onClick={() => setEditor("innerPages")}
              preview={<InnerPagesPreview headerText={settings.pageDesign.innerPages.headerText} />}
            />
            <DesignCard
              label="Animation (QR code) page"
              action="CUSTOM"
              actionVariant="outline"
              onClick={() => setEditor("animationPage")}
              preview={<AnimationPreview />}
            />
            <DesignCard
              label="Back cover"
              action="EDIT"
              onClick={() => setEditor("backCover")}
              preview={<BackCoverPreview note={settings.pageDesign.backCover.note} />}
            />
          </div>

          {/* Settings tiles */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SettingTile icon={<span className="text-2xl font-semibold">A4</span>} label="Page size" onClick={() => setEditor("pageSize")} />
            <SettingTile icon={<DollarSign className="size-6" />} label="Price list design" onClick={() => setEditor("priceList")} />
            <SettingTile icon={<DollarSign className="size-6" />} label="Price page settings" onClick={() => setEditor("pricePage")} />
            <SettingTile icon={<ArrowUpDown className="size-6" />} label="Plan sections" onClick={() => setEditor("planSections")} />
          </div>
        </section>
      </div>

      <SettingsEditorDialog editor={editor} onClose={() => setEditor(null)} />
    </div>
  );
}

/* ---------- preview/card components ---------- */

function DesignCard({
  label,
  action,
  actionVariant = "solid",
  onClick,
  preview,
}: {
  label: string;
  action: string;
  actionVariant?: "solid" | "outline";
  onClick: () => void;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-muted/40 p-4">
      <span className="mb-3 text-sm text-muted-foreground">{label}</span>
      <div className="flex h-[300px] w-full items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-border/50">
        {preview}
      </div>
      <button
        onClick={onClick}
        className={cn(
          "mt-4 rounded-full px-8 py-2 text-xs font-semibold tracking-wider transition",
          actionVariant === "solid"
            ? "bg-black text-white hover:bg-black/80"
            : "border border-black bg-white text-black hover:bg-black hover:text-white",
        )}
      >
        {action}
      </button>
    </div>
  );
}

function SettingTile({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 rounded-2xl bg-muted/50 px-4 py-6 text-foreground transition hover:bg-muted hover:shadow-sm"
    >
      <div className="grid size-14 place-items-center rounded-lg border border-border bg-white text-foreground/80 shadow-sm">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function FrontCoverPreview({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-[oklch(0.18_0.03_60)] p-3 text-center text-white">
      <div className="font-serif text-sm italic tracking-wide text-amber-200">BrightPlans</div>
      <div className="space-y-1 pb-2">
        <div className="text-[10px] tracking-[0.3em] text-amber-200/80">{title}</div>
        {subtitle && <div className="text-[9px] tracking-[0.25em] text-amber-100/70">{subtitle}</div>}
      </div>
    </div>
  );
}

function InnerPagesPreview({ headerText }: { headerText: string }) {
  return (
    <div className="flex h-full w-full flex-col justify-between p-3">
      <div className="flex items-center justify-between border-b border-border pb-1.5">
        <span className="text-[10px] font-semibold tracking-widest text-foreground/80">{headerText}</span>
        <FileText className="size-3 text-foreground/60" />
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-1 rounded bg-muted" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-1.5 text-[7px] text-muted-foreground">
        <span>Footer (left)</span>
        <span>1 / 1</span>
        <span>Footer (right)</span>
      </div>
    </div>
  );
}

function AnimationPreview() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-3 text-center">
      <div className="space-y-0.5">
        <div className="text-[8px] font-semibold tracking-wider">YOUR TREATMENT PLAN</div>
        <div className="text-[9px] font-bold">WATCH YOUR OWN</div>
        <div className="text-[9px] font-bold">3D TREATMENT ANIMATION!</div>
      </div>
      <div className="grid size-16 place-items-center border border-foreground/40">
        <QrCode className="size-12" />
      </div>
      <div className="text-[7px] text-muted-foreground">OR CLICK HERE TO VIEW</div>
    </div>
  );
}

function BackCoverPreview({ note }: { note?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-3 text-[10px] text-muted-foreground">
      {note || "Back cover"}
    </div>
  );
}

/* ---------- Editors ---------- */

function SettingsEditorDialog({ editor, onClose }: { editor: EditorKey; onClose: () => void }) {
  const settings = usePlanSettings();
  const open = editor !== null;

  let title = "";
  let body: React.ReactNode = null;

  if (editor === "frontCover") {
    title = "Edit Front Cover";
    body = (
      <div className="space-y-3">
        <Field label="Title">
          <Input
            defaultValue={settings.pageDesign.frontCover.title}
            onChange={(e) => planSettingsStore.updatePageDesign("frontCover", { title: e.target.value })}
          />
        </Field>
        <Field label="Subtitle">
          <Input
            defaultValue={settings.pageDesign.frontCover.subtitle ?? ""}
            onChange={(e) => planSettingsStore.updatePageDesign("frontCover", { subtitle: e.target.value })}
          />
        </Field>
        <Field label="Cover image URL">
          <Input
            defaultValue={settings.pageDesign.frontCover.coverImage ?? ""}
            placeholder="https://..."
            onChange={(e) => planSettingsStore.updatePageDesign("frontCover", { coverImage: e.target.value })}
          />
        </Field>
      </div>
    );
  } else if (editor === "innerPages") {
    title = "Edit Inner Pages";
    body = (
      <div className="space-y-3">
        <Field label="Header text">
          <Input
            defaultValue={settings.pageDesign.innerPages.headerText}
            onChange={(e) => planSettingsStore.updatePageDesign("innerPages", { headerText: e.target.value })}
          />
        </Field>
        <ToggleRow
          label="Show footer"
          checked={settings.pageDesign.innerPages.showFooter}
          onChange={(v) => planSettingsStore.updatePageDesign("innerPages", { showFooter: v })}
        />
      </div>
    );
  } else if (editor === "animationPage") {
    title = "Customize Animation Page";
    body = (
      <div className="space-y-3">
        <Field label="Mode">
          <Select
            value={settings.pageDesign.animationPage.mode}
            onValueChange={(v) => planSettingsStore.updatePageDesign("animationPage", { mode: v as "default" | "custom" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Custom note">
          <Input
            defaultValue={settings.pageDesign.animationPage.customNote ?? ""}
            onChange={(e) => planSettingsStore.updatePageDesign("animationPage", { customNote: e.target.value })}
          />
        </Field>
      </div>
    );
  } else if (editor === "backCover") {
    title = "Edit Back Cover";
    body = (
      <div className="space-y-3">
        <Field label="Note">
          <Input
            defaultValue={settings.pageDesign.backCover.note ?? ""}
            onChange={(e) => planSettingsStore.updatePageDesign("backCover", { note: e.target.value })}
          />
        </Field>
        <Field label="Background image URL">
          <Input
            defaultValue={settings.pageDesign.backCover.backImage ?? ""}
            onChange={(e) => planSettingsStore.updatePageDesign("backCover", { backImage: e.target.value })}
          />
        </Field>
      </div>
    );
  } else if (editor === "pageSize") {
    title = "Page Size";
    body = (
      <Field label="Size">
        <Select
          value={settings.pageSize}
          onValueChange={(v) => planSettingsStore.update({ pageSize: v as "A4" | "Letter" | "Legal" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="A4">A4</SelectItem>
            <SelectItem value="Letter">Letter</SelectItem>
            <SelectItem value="Legal">Legal</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  } else if (editor === "priceList") {
    title = "Price List Design";
    body = (
      <Field label="Style">
        <Select
          value={settings.priceListDesign}
          onValueChange={(v) => planSettingsStore.update({ priceListDesign: v as "compact" | "detailed" | "minimal" })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="detailed">Detailed</SelectItem>
            <SelectItem value="minimal">Minimal</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    );
  } else if (editor === "pricePage") {
    title = "Price Page Settings";
    const p = settings.pricePage;
    body = (
      <div className="space-y-3">
        <ToggleRow label="Show subtotal" checked={p.showSubtotal} onChange={(v) => planSettingsStore.update({ pricePage: { ...p, showSubtotal: v } })} />
        <ToggleRow label="Show discount" checked={p.showDiscount} onChange={(v) => planSettingsStore.update({ pricePage: { ...p, showDiscount: v } })} />
        <ToggleRow label="Show tax" checked={p.showTax} onChange={(v) => planSettingsStore.update({ pricePage: { ...p, showTax: v } })} />
        <ToggleRow label="Show total" checked={p.showTotal} onChange={(v) => planSettingsStore.update({ pricePage: { ...p, showTotal: v } })} />
        <Field label="Currency">
          <Input defaultValue={p.currency} onChange={(e) => planSettingsStore.update({ pricePage: { ...p, currency: e.target.value } })} />
        </Field>
      </div>
    );
  } else if (editor === "planSections") {
    title = "Plan Sections";
    const s = settings.planSections;
    body = (
      <div className="space-y-3">
        <ToggleRow label="Diagnosis" checked={s.showDiagnosis} onChange={(v) => planSettingsStore.update({ planSections: { ...s, showDiagnosis: v } })} />
        <ToggleRow label="Treatments" checked={s.showTreatments} onChange={(v) => planSettingsStore.update({ planSections: { ...s, showTreatments: v } })} />
        <ToggleRow label="Animation" checked={s.showAnimation} onChange={(v) => planSettingsStore.update({ planSections: { ...s, showAnimation: v } })} />
        <ToggleRow label="Documents" checked={s.showDocuments} onChange={(v) => planSettingsStore.update({ planSections: { ...s, showDocuments: v } })} />
        <ToggleRow label="Overview" checked={s.showOverview} onChange={(v) => planSettingsStore.update({ planSections: { ...s, showOverview: v } })} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">{body}</div>
        <DialogFooter>
          <Button onClick={onClose} className="gap-2">
            <Check className="size-4" /> Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
