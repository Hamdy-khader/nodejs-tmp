import { EXTRA_DIAGNOSIS, EXTRA_DIAGNOSIS_LABELS } from "@/lib/dental/states";
import type { DetailsTarget } from "./useDiagnosisEditor";

interface Props {
  details: DetailsTarget | null;
  onToggle: (option: string) => void;
  onConfirm: () => void;
}

/**
 * "Diagnosis:" box in the side rail. Right after a state is applied (or a chip
 * is clicked) it lists that state's details: surfaces, conditions or severity.
 */
export function DiagnosisDetailsPanel({ details, onToggle, onConfirm }: Props) {
  const options = details ? EXTRA_DIAGNOSIS[details.stateId] : undefined;
  return (
    <div
      className="rounded-md bg-card px-4 py-4 shadow-[var(--shadow-soft)]"
      data-diagnosis-selection
    >
      <h3 className="font-sans text-[14px] font-semibold text-foreground">Diagnosis:</h3>
      {!details || !options ? (
        <p className="mt-6 text-[13px] text-muted-foreground">First select a status.</p>
      ) : (
        <>
          <p className="text-[14px] text-foreground">{details.title}</p>
          <div className="mt-2 border-t border-border/70 pt-2">
            {options.options.map((option, index) =>
              option === "-" ? (
                <div key={`divider-${index}`} className="my-2 h-px bg-border/70" />
              ) : (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]"
                >
                  <input
                    type={options.multiple ? "checkbox" : "radio"}
                    name={`detail-${details.stateId}`}
                    checked={details.selected.includes(option)}
                    onChange={() => onToggle(option)}
                    className="h-[18px] w-[18px] accent-[#616161]"
                  />
                  {EXTRA_DIAGNOSIS_LABELS[option] ?? option}
                </label>
              ),
            )}
          </div>
          <div className="mt-2 border-t border-border/70 pt-3 text-center">
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-full bg-[#757575] px-6 py-1.5 text-[14px] font-medium text-white hover:bg-[#616161]"
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
}
