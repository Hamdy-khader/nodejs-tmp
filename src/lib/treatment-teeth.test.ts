import { describe, expect, it } from "vitest";
import { defaultTeeth, type TreatmentItem, type TreatmentRow } from "./patients-store";
import { getTreatmentTeeth, getTreatmentAnnotations } from "./treatment-teeth";

const item = (section: string, toothNumber = 12): TreatmentItem => ({
  id: section,
  name: section,
  catalogSectionKey: section,
  toothNumber,
  amount: 1,
  unitPrice: 100,
});
const rows = (...items: TreatmentItem[]): TreatmentRow[] => [{ id: "visit", kind: "visit", items }];

describe("treatment tooth previews", () => {
  it("keeps the latest repeated procedure as the primary drawing", () => {
    const treatments = rows(item("crown"), item("filling"), item("crown"));
    const annotations = getTreatmentAnnotations(treatments)[12];
    expect(annotations).toHaveLength(2);
    expect(annotations.at(-1)?.visual?.mark).toBe("crown");
    expect(getTreatmentTeeth(defaultTeeth(), treatments)[12].status).toBe("crown");
  });
  it("preserves names and shows procedures without a structural tooth status", () => {
    const baseline = defaultTeeth();
    const treatment = { ...item("other"), name: "Gingival Graft" };
    const preview = getTreatmentTeeth(baseline, rows(treatment));
    expect(preview[12].note).toBe("Gingival Graft");
    expect(getTreatmentAnnotations(rows(treatment))[12][0].visual?.mark).toBe("graft");
    expect(baseline[12].note).toBeUndefined();
  });

  it("uses saved catalog sections for custom names and covers the entire bridge span", () => {
    const custom = { ...item("implant"), name: "Clinic special" };
    const bridge = { ...item("bridge"), toothNumber: undefined, name: "Bridge 14-11" };
    const annotations = getTreatmentAnnotations(
      rows(custom, bridge),
      new Map([["clinic special", "filling"]]),
    );
    expect(annotations[12][0].visual?.mark).toBe("implant");
    for (const n of [14, 13, 12, 11]) expect(annotations[n].at(-1)?.visual?.mark).toBe("bridge");
    expect(getTreatmentAnnotations(rows({ ...bridge, name: "Bridge 14-41" }))).toEqual({});
    expect(getTreatmentAnnotations(rows({ ...custom, toothNumber: undefined }))).toEqual({});
  });
  it.each(["implant", "extraction"])(
    "restores the original diagnosis after deleting %s",
    (section) => {
      const baseline = defaultTeeth();
      baseline[12] = { number: 12, status: "caries", note: "Caries", diagnosis: ["Deep"] };
      const before = structuredClone(baseline);
      expect(getTreatmentTeeth(baseline, rows(item(section)))[12].status).toBe(
        section === "implant" ? "implant" : "missing",
      );
      expect(getTreatmentTeeth(baseline, rows())[12]).toEqual(before[12]);
      expect(getTreatmentTeeth(baseline, [])[12]).toEqual(before[12]);
      expect(baseline).toEqual(before);
    },
  );

  it("shows the remaining treatment after deleting the latest treatment", () => {
    const baseline = defaultTeeth();
    expect(getTreatmentTeeth(baseline, rows(item("extraction"), item("implant")))[12].status).toBe(
      "implant",
    );
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
