import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultTeeth, type TreatmentRow } from "@/lib/patients-store";
import { getTreatmentAnnotations, getTreatmentTeeth } from "@/lib/treatment-teeth";
import { TeethChart } from "./TeethChart";

afterEach(cleanup);

describe.each([false, true])("implant-supported bridges (report=%s)", report => {
  it("keeps an extracted gap rootless when a bridge spans two diagnosed implants", () => {
    const base = defaultTeeth();
    base[16] = { number: 16, status: "implant", note: "Implant" };
    base[13] = { number: 13, status: "implant", note: "Implant" };
    const original = structuredClone(base);
    const rows: TreatmentRow[] = [
      { id: "extractions", kind: "visit", items: [15, 14].map(number => ({
        id: `extraction-${number}`, name: "Extraction", catalogSectionKey: "extraction", toothNumber: number, amount: 1, unitPrice: 50,
      })) },
      { id: "bridge", kind: "visit", items: [{ id: "span", name: "Bridge 16-13", catalogSectionKey: "bridge", amount: 1, unitPrice: 500 }] },
    ];
    const { container } = render(<TeethChart baseTeeth={base} teeth={getTreatmentTeeth(base, rows)}
      annotations={getTreatmentAnnotations(rows)} report={report} />);
    for (const number of [16, 15, 14, 13]) {
      const tooth = container.querySelector(`[data-tooth-number="${number}"]`)!;
      expect(tooth.querySelector("[data-natural-root]"), `Root at extracted tooth ${number}`).toBeNull();
      expect(tooth.querySelector("[data-bridge-connector]")).not.toBeNull();
      if (number === 15 || number === 14) expect(tooth.querySelector('[data-pontic="true"]')).not.toBeNull();
      else expect(tooth.querySelector('[data-dental-mark="implant"]')).not.toBeNull();
    }
    expect(base).toEqual(original);
  });

  it.each([
    ["Ceramic bridge on implant", [16, 15, 14, 13]],
    ["Temporary bridge on implants", [46, 45, 44, 43]],
    ["Screw-retained implant bridge", [16, 15, 14, 13]],
    ["Bridge on implant abutments", [46, 45, 44, 43]],
  ] as const)("keeps missing teeth rootless beneath %s", (name, numbers) => {
    const base = defaultTeeth();
    for (const number of numbers) base[number] = { number, status: "missing", note: "Missing" };
    const original = structuredClone(base);
    const implants: TreatmentRow = { id: "implants", kind: "visit", items: [numbers[0], numbers[3]].map(number => ({
      id: `implant-${number}`, name: "Implant", catalogSectionKey: "implant", toothNumber: number, amount: 1, unitPrice: 500,
    })) };
    const bridge: TreatmentRow = { id: "bridge", kind: "visit", items: numbers.map(number => ({
      id: `bridge-${number}`, name, catalogSectionKey: "bridge", toothNumber: number, amount: 1, unitPrice: 200,
    })) };
    const view = (rows: TreatmentRow[]) => <TeethChart baseTeeth={base} teeth={getTreatmentTeeth(base, rows)}
      annotations={getTreatmentAnnotations(rows)} report={report} />;
    const { container, rerender } = render(view([implants]));
    rerender(view([implants, bridge]));
    const verify = () => {
      for (const number of numbers) {
        const tooth = container.querySelector(`[data-tooth-number="${number}"]`)!;
        expect(tooth.querySelector("[data-natural-root]"), `Root at missing tooth ${number}`).toBeNull();
        expect(tooth.querySelector("[data-bridge-connector]")).not.toBeNull();
        expect(tooth.querySelector('[data-dental-mark="bridge"]')).not.toBeNull();
        if (number === numbers[0] || number === numbers[3]) {
          expect(tooth.querySelector('[data-dental-mark="implant"]')).not.toBeNull();
          expect(tooth.querySelector("[data-pontic]")).toBeNull();
        } else {
          expect(tooth.querySelector('[data-dental-mark="implant"]')).toBeNull();
          expect(tooth.querySelector('[data-pontic="true"]')).not.toBeNull();
          expect(tooth.querySelector('path[d="M13 21 L27 21 L25 71 Q22.5 76 20 76 Q17.5 76 15 71 Z"]')).toBeNull();
        }
      }
      expect(base).toEqual(original);
    };
    verify();
    // A reloaded plan must derive the same anatomy from persisted diagnosis/items.
    rerender(view(JSON.parse(JSON.stringify([implants, bridge]))));
    verify();
    rerender(view([implants]));
    expect(container.querySelector("[data-bridge-connector]")).toBeNull();
    for (const number of [numbers[1], numbers[2]]) {
      const tooth = container.querySelector(`[data-tooth-number="${number}"]`)!;
      expect(tooth.querySelector("[data-natural-root]")).toBeNull();
      expect(tooth.querySelector('[data-dental-mark="implant"]')).toBeNull();
    }
    expect(base).toEqual(original);
  });
});
