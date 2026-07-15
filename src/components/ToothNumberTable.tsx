import { LOWER_TEETH, UPPER_TEETH, getStatusMeta, type ToothState } from "@/lib/patients-store";
import { cn } from "@/lib/utils";

interface ToothNumberTableProps {
  teeth?: Record<number, ToothState>;
  treatmentCounts?: Record<number, number>;
  highlighted?: number[];
}

export function ToothNumberTable({
  teeth,
  treatmentCounts = {},
  highlighted = [],
}: ToothNumberTableProps) {
  const highlightedSet = new Set(highlighted);

  const cell = (number: number) => {
    const tooth = teeth?.[number];
    const hasTreatment = (treatmentCounts[number] ?? 0) > 0 || highlightedSet.has(number);
    const hasDiagnosis =
      tooth != null &&
      (tooth.status !== "intact" || Boolean(tooth.note) || (tooth.diagnosis?.length ?? 0) > 0);
    const status = tooth ? getStatusMeta(tooth.status) : null;

    return (
      <td
        key={number}
        className={cn(
          "border border-slate-200 px-0.5 py-1 text-center text-[7px] font-semibold",
          hasTreatment && "border-emerald-300 bg-emerald-100 text-emerald-800",
        )}
        style={
          !hasTreatment && hasDiagnosis && status
            ? { backgroundColor: status.bg, borderColor: status.ring, color: status.ring }
            : undefined
        }
      >
        {number}
      </td>
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-2 py-1 text-[7px] font-semibold uppercase tracking-wider text-slate-500">
        <span>Tooth numbers</span>
        <span>FDI</span>
      </div>
      <table className="w-full table-fixed border-collapse" aria-label="Tooth numbers">
        <tbody>
          <tr>
            <th className="w-10 border border-slate-200 bg-slate-50 px-1 text-left text-[6px] font-semibold uppercase text-slate-500">
              Upper
            </th>
            {UPPER_TEETH.map(cell)}
          </tr>
          <tr>
            <th className="w-10 border border-slate-200 bg-slate-50 px-1 text-left text-[6px] font-semibold uppercase text-slate-500">
              Lower
            </th>
            {LOWER_TEETH.map(cell)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
