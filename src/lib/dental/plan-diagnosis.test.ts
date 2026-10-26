import { describe, expect, it } from "vitest";
import {
  diagnosisPatch,
  entriesFromApi,
  entriesToApi,
  generalEntry,
  isStructuredDiagnosis,
  legacyEntries,
  planEntries,
} from "@/lib/dental/plan-diagnosis";
import { defaultTeeth, type ToothState } from "@/lib/patients-store";

const ids = (entries: { stateId: number }[]) => entries.map((entry) => entry.stateId);

describe("reading plans saved before chips could stack", () => {
  it("turns a labelled filling with surfaces into one chip with its details", () => {
    const tooth: ToothState = {
      number: 16,
      status: "filled",
      note: "Filled (composite)",
      diagnosis: ["M", "O", "Secondary caries"],
    };
    expect(legacyEntries(tooth)).toEqual([
      {
        toothId: 16,
        stateId: 5,
        title: "Filled (composite) - M, O, Secunder caries",
        baseTitle: "Filled (composite)",
        extraDiagnosis: "M,O,SecunderCaries",
        auto: undefined,
      },
    ]);
  });

  it("expands an implant with abutment", () => {
    expect(
      ids(legacyEntries({ number: 36, status: "implant", note: "Implant + abutment" })),
    ).toEqual([11, 13]);
  });

  it("files a crowned tooth", () => {
    expect(ids(legacyEntries({ number: 11, status: "crown" }))).toEqual([19, 9]);
  });

  it("keeps a free-text finding as a custom chip", () => {
    expect(legacyEntries({ number: 21, status: "intact", note: "Cyst near apex" })).toEqual([
      {
        toothId: 21,
        stateId: 208,
        title: "Cyst near apex",
        baseTitle: "Cyst near apex",
        extraDiagnosis: undefined,
        auto: undefined,
      },
    ]);
  });

  it("reads whole-mouth labels back with their details", () => {
    expect(generalEntry("Malocclusion - Class II, Crowding", 0)).toMatchObject({
      toothId: 0,
      stateId: 401,
      baseTitle: "Malocclusion",
      extraDiagnosis: "Class2,Crowding",
    });
    expect(generalEntry("Smoker", 1)).toMatchObject({ toothId: 0, stateId: 400, title: "Smoker" });
  });
});

describe("writing chips back to the plan", () => {
  it("keeps a readable summary for reports and the general row", () => {
    const teeth = defaultTeeth();
    const entries = [
      ...planEntries(teeth),
      { toothId: 0, stateId: 401, title: "Malocclusion - Class II" },
    ].filter((entry) => entry.toothId !== 16);
    entries.push(
      { toothId: 16, stateId: 201, title: "Root treated" },
      { toothId: 16, stateId: 19, title: "Filed", auto: true },
      { toothId: 16, stateId: 9, title: "Crown" },
    );
    const patch = diagnosisPatch(teeth, entries);
    expect(patch.teeth[16]).toMatchObject({ status: "crown", note: "Root treated, Crown" });
    expect(ids(patch.teeth[16].statuses ?? [])).toEqual([201, 19, 9]);
    expect(patch.teeth[11]).toMatchObject({ status: "intact", note: undefined });
    expect(patch.generalStatuses).toEqual(["Malocclusion - Class II"]);
  });

  it("round-trips chips through the API format", () => {
    const entries = [
      {
        toothId: 16,
        stateId: 3,
        title: "Caries - M, O",
        baseTitle: "Caries",
        extraDiagnosis: "M,O",
        ts: 5,
      },
    ];
    const api = entriesToApi(entries);
    expect(isStructuredDiagnosis(api)).toBe(true);
    expect(entriesFromApi(16, api)).toEqual([{ ...entries[0], auto: false }]);
    expect(isStructuredDiagnosis(["M", "O"])).toBe(false);
  });
});
