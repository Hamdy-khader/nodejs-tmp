import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TreatmentButton, TreatmentEntry } from "@/lib/dental/treatment-engine";
import { cn } from "@/lib/utils";

interface Props {
  buttons: TreatmentButton[];
  onPick: (entry: TreatmentEntry, button: string) => void;
  activeLabel?: string;
  currencySymbol: string;
}

function priceOf(entry: TreatmentEntry, symbol: string) {
  if (entry.kind !== "item") return null;
  return `${symbol} ${entry.entry.item.price.toFixed(2)}`;
}

/**
 * The ten green treatment buttons next to the chart. The face adds the first
 * entry (for Crown, Bridge and Implant the first type, for Root canal the price
 * by roots); the arrow lists every entry of the button.
 */
export function TreatmentButtons({ buttons, onPick, activeLabel, currencySymbol }: Props) {
  // "Other..." opens a dialog; the menu must not take the focus back from it.
  const opensDialog = useRef(false);
  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2" data-treatment-selection>
      {buttons.map((button) => {
        const active = activeLabel === button.label;
        return (
          <div
            key={button.label}
            className={cn(
              "flex h-8 items-stretch overflow-hidden rounded-full text-[12.5px] font-medium text-white transition-colors",
              active ? "bg-[#4f9a53]" : "bg-[#66b96a]",
              !button.face && "opacity-60",
            )}
          >
            <button
              type="button"
              disabled={!button.face}
              onClick={() => button.face && onPick(button.face, button.label)}
              className="min-w-0 flex-1 truncate pl-3.5 pr-1 text-left hover:bg-black/10"
            >
              {button.label}
            </button>
            {button.entries.length > 0 && (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${button.label} options`}
                    className="grid w-8 shrink-0 place-items-center hover:bg-black/10"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-80 min-w-[240px] overflow-y-auto"
                  onCloseAutoFocus={(event) => {
                    if (opensDialog.current) event.preventDefault();
                    opensDialog.current = false;
                  }}
                >
                  {button.entries.map((entry, index) => (
                    <DropdownMenuItem
                      key={`${entry.label}-${index}`}
                      onSelect={() => {
                        opensDialog.current = entry.kind === "custom";
                        onPick(entry, button.label);
                      }}
                      className="flex items-center justify-between gap-3 py-2 text-[13px]"
                    >
                      <span className="truncate">{entry.label}</span>
                      {priceOf(entry, currencySymbol) && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {priceOf(entry, currencySymbol)}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}
    </div>
  );
}
