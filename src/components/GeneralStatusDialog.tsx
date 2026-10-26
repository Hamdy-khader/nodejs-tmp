import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  /** Dialog heading, before the tooth numbers. */
  title?: string;
  /** Label of the text field. */
  label?: string;
  /** Teeth the typed finding goes on; empty means the whole mouth. */
  teeth: number[];
  onClose: () => void;
  onSubmit: (status: string) => void;
}

export function GeneralStatusDialog({
  open,
  title = "General / Other status",
  label = "Status",
  teeth,
  onClose,
  onSubmit,
}: Props) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-md bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-[15px] text-foreground">
            {title}
            {teeth.length > 0 && ` (${teeth.join(", ")})`}
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

        <div className="px-5 pt-4 pb-4">
          <label htmlFor="custom-status" className="block text-xs text-muted-foreground">
            {label}
          </label>
          <Input
            id="custom-status"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
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
