import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { patientsStore, type ToothState } from "@/lib/patients-store";

const ITEMS = ["Retrognathic", "Prognathic", "Short lower face", "Long lower face"];

interface Props {
  planId: string;
  tooth: ToothState;
  variant: string;
  onClose: () => void;
}

export function FacialDisproportionsPanel({ planId, tooth, variant, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(tooth.diagnosis ?? []);

  useEffect(() => {
    setSelected(tooth.diagnosis ?? []);
  }, [tooth.number, tooth.diagnosis]);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
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
        {ITEMS.map((l) => (
          <label key={l} className="flex cursor-pointer items-start gap-2.5 text-sm">
            <Checkbox
              checked={selected.includes(l)}
              onCheckedChange={() => toggle(l)}
              className="mt-0.5"
            />
            <span>{l}</span>
          </label>
        ))}
      </div>

      <div className="my-3 h-px bg-border" />

      <Button onClick={save} className="w-full rounded-full" size="sm">
        OK
      </Button>
    </div>
  );
}
