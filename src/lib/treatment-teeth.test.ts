import { describe, expect, it } from "vitest";
import { defaultTeeth, type TreatmentItem, type TreatmentRow } from "./patients-store";
import { getTreatmentTeeth } from "./treatment-teeth";

const item = (section: string, toothNumber = 12): TreatmentItem => ({
  id: section, name: section, catalogSectionKey: section, toothNumber, amount: 1, unitPrice: 100,
});
const rows = (...items: TreatmentItem[]): TreatmentRow[] => [{ id: "visit", kind: "visit", items }];

describe("treatment tooth previews", () => {
  it.each(["implant", "extraction"])("restores the original diagnosis after deleting %s", (section) => {
    const baseline = defaultTeeth();
    baseline[12] = { number: 12, status: "caries", note: "Caries", diagnosis: ["Deep"] };
    const before = structuredClone(baseline);
    expect(getTreatmentTeeth(baseline, rows(item(section)))[12].status).toBe(section === "implant" ? "implant" : "missing");
    expect(getTreatmentTeeth(baseline, rows())[12]).toEqual(before[12]);
    expect(getTreatmentTeeth(baseline, [])[12]).toEqual(before[12]);
    expect(baseline).toEqual(before);
  });

  it("shows the remaining treatment after deleting the latest treatment", () => {
    const baseline = defaultTeeth();
    expect(getTreatmentTeeth(baseline, rows(item("extraction"), item("implant")))[12].status).toBe("implant");
    expect(getTreatmentTeeth(baseline, rows(item("extraction")))[12].status).toBe("missing");
  });

  it("derives and clears the whole bridge span without changing the diagnosis", () => {
    const baseline = defaultTeeth();
    const bridge = { ...item("bridge"), toothNumber: undefined, name: "Bridge 14-11" };
    const preview = getTreatmentTeeth(baseline, rows(bridge));
    for (const n of [14, 13, 12, 11]) expect(preview[n].status).toBe("bridge");
    expect(preview[15].status).toBe("intact");
    expect(getTreatmentTeeth(baseline, [])).toEqual(defaultTeeth());
  });
});
