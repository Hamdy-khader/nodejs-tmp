import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  toothNumber?: number;
  onClose: () => void;
  onSubmit: (status: string) => void;
}

export function GeneralStatusDialog({ open, toothNumber, onClose, onSubmit }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setValue("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between bg-muted/40 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            General / Other status ({toothNumber ?? ""})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-6 pb-4">
          <label className="block text-xs text-muted-foreground">Status</label>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="mt-1 border-0 border-b border-border rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary"
          />
        </div>

        <div className="flex justify-end px-5 pb-4">
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Check className="h-4 w-4" />
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
