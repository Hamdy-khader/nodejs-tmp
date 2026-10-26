import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DIAGNOSIS_BUTTONS, type DiagnosisButtonItem } from "@/lib/dental/states";
import { cn } from "@/lib/utils";

interface Props {
  /** Applies a state to the selected teeth (or the whole mouth). */
  onApply: (item: DiagnosisButtonItem, button: string) => void;
  /** The last applied button stays darker, as on the reference chart. */
  activeLabel?: string;
}

/**
 * The ten diagnosis buttons next to the chart. The face applies the first item;
 * the arrow opens the variants of that group.
 */
export function DiagnosisButtons({ onApply, activeLabel }: Props) {
  // "General" and "Other..." open a dialog; the menu must not take the focus back from it.
  const opensDialog = useRef(false);
  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2" data-diagnosis-selection>
      {DIAGNOSIS_BUTTONS.map((button) => {
        const active = activeLabel === button.label;
        const single = button.items.length <= 1;
        return (
          <div
            key={button.label}
            className={cn(
              "flex h-8 items-stretch overflow-hidden rounded-full text-[12.5px] font-medium text-white transition-colors",
              active ? "bg-[#707070]" : "bg-[#9e9e9e]",
            )}
          >
            <button
              type="button"
              onClick={() => onApply(button.items[0], button.label)}
              className="min-w-0 flex-1 truncate pl-3.5 pr-1 text-left hover:bg-black/10"
            >
              {button.label}
            </button>
            {!single && (
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
                  className="max-h-72 min-w-[210px] overflow-y-auto"
                  onCloseAutoFocus={(event) => {
                    if (opensDialog.current) event.preventDefault();
                    opensDialog.current = false;
                  }}
                >
                  {button.items.map((item) => (
                    <DropdownMenuItem
                      key={item.label}
                      onSelect={() => {
                        opensDialog.current = !!item.custom;
                        onApply(item, button.label);
                      }}
                      className="py-2 text-[13px]"
                    >
                      {item.label}
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
