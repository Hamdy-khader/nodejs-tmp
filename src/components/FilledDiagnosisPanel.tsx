import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { patientsStore, type ToothState } from "@/lib/patients-store";

const SURFACES = ["M", "O", "D", "L", "B"];
const CONDITIONS = [
  "Secondary caries",
  "Leaking",
  "Worn",
  "Fractured",
  "Discolored",
  "Unaesthetic",
];

interface Props {
  planId: string;
  tooth: ToothState;
  variant: string; // "Filled (composite)" | "Filled (amalgam)" | "Inlay"
  onClose: () => void;
}

export function FilledDiagnosisPanel({ planId, tooth, variant, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(tooth.diagnosis ?? []);

  useEffect(() => {
    setSelected(tooth.diagnosis ?? []);
  }, [tooth.number, tooth.diagnosis]);

  const toggle = (item: string) => {
    setSelected((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  const save = () => {
    patientsStore.setTooth(planId, { ...tooth, diagnosis: selected });
    onClose();
  };

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div>
        <h3 className="text-sm font-bold text-foreground">Diagnosis:</h3>
        <p className="text-sm text-muted-foreground">{variant}</p>
      </div>

      <div className="my-3 h-px bg-border" />

      <div className="space-y-2.5">
        {SURFACES.map((s) => (
          <Row key={s} label={s} checked={selected.includes(s)} onChange={() => toggle(s)} />
        ))}
      </div>

      <div className="my-3 h-px bg-border" />

      <div className="space-y-2.5">
        {CONDITIONS.map((c) => (
          <Row key={c} label={c} checked={selected.includes(c)} onChange={() => toggle(c)} />
        ))}
      </div>

      <div className="my-3 h-px bg-border" />

      <Button onClick={save} className="w-full rounded-full" size="sm">
        Save
      </Button>
    </div>
  );
}

function Row({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
