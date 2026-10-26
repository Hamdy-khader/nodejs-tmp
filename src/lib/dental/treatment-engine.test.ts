import { describe, expect, it } from "vitest";
import {
  appendToLastVisit,
  autocorrect,
  buildTreatmentButtons,
  itemsForEntry,
  needsTeeth,
  plannedStates,
  rootCount,
  switchType,
  treatmentState,
  type TreatmentEntry,
} from "@/lib/dental/treatment-engine";
import type { TreatmentItem, TreatmentRow } from "@/lib/patients-store";
import type { PriceSection } from "@/lib/pricelist-store";
import { groupTreatmentItems } from "@/lib/treatment-groups";

const item = (key: string, name: string, price: number) => ({ id: key, key, name, price });
const group = (key: string, items: ReturnType<typeof item>[]) => ({
  id: key,
  key,
  title: key,
  items,
});
const sectionOf = (key: string, groups: ReturnType<typeof group>[]): PriceSection => ({
  id: key,
  key,
  n: null,
  label: key,
  icon: "",
  groups,
});

// The default clinic price list, as the backend seeds it.
const SECTIONS: PriceSection[] = [
  sectionOf("extraction", [
    group("extraction", [item("wisdom-extraction", "Wisdom Extraction", 100)]),
  ]),
  sectionOf("prosthesis-removal", [
    group("prosthesis-removal", [item("bridge-removal", "Bridge Removal", 10)]),
  ]),
  sectionOf("filling", [
    group("filling", [
      item("filling", "Filling", 150),
      item("inlay", "Inlay", 300),
      item("onlay", "Onlay", 300),
    ]),
  ]),
  sectionOf("dentures", [group("dentures", [item("temporary-bridge", "Temporary Bridge", 20)])]),
  sectionOf("root-canal-treatment", [
    group("root-canal-treatment", [
      item("root-canal-treatment-1-root", "Root Canal Treatment (1 Root)", 400),
      item("root-canal-treatment-2-roots", "Root Canal Treatment (2 Roots)", 500),
      item("root-canal-treatment-3-roots", "Root Canal Treatment (3 Roots)", 600),
      item("post-composite", "Post (Composite)", 200),
      item("parapulpal-pin", "Parapulpal Pin", 0),
    ]),
  ]),
  sectionOf("implant", [
    group("implant", [
      item("implant-nobel-biocare", "Implant - Nobel Biocare", 1500),
      item("implant-neodent", "Implant - Neodent", 1000),
    ]),
    group("implant-abutment", [item("titanium-abutment", "Titanium Abutment", 300)]),
    group("one-phase-implant", [item("bcs-kos-implant", "BCS/KOS Implant", 1000)]),
    group("implant-accessories", [item("healing-screw", "Healing Screw", 0)]),
  ]),
  sectionOf("crown", [
    group("crown", [
      item("metal-ceramic-crown", "Metal-Ceramic Crown", 400),
      item("zirconium-crown", "Zirconium Crown", 700),
    ]),
  ]),
  sectionOf("veneer", [group("veneer", [item("veneer", "Veneer", 500)])]),
  sectionOf("bridge", [
    group("bridge", [item("metal-ceramic-bridge", "Metal-Ceramic Bridge", 400)]),
  ]),
  sectionOf("general", [
    group("general", [
      item("impression", "Impression", 0),
      item("panoramic-x-ray", "Panoramic X-Ray", 50),
    ]),
  ]),
  sectionOf("other", [group("other", [item("apicoectomy", "Apicoectomy", 0)])]),
];

let counter = 0;
const makeId = () => `id-${++counter}`;
const buttons = buildTreatmentButtons(SECTIONS);
const button = (label: string) => buttons.find((candidate) => candidate.label === label)!;
const entry = (buttonLabel: string, entryLabel: string): TreatmentEntry =>
  button(buttonLabel).entries.find((candidate) => candidate.label === entryLabel)!;

function add(rows: TreatmentRow[], target: TreatmentEntry, teeth: number[]) {
  const items = itemsForEntry(target, teeth, SECTIONS).map((created) => ({
    ...created,
    id: makeId(),
  }));
  return appendToLastVisit(rows, items, makeId);
}

function visitRows(rows: TreatmentRow[]) {
  const visit = rows.find((row) => row.kind === "visit") as Extract<
    TreatmentRow,
    { kind: "visit" }
  >;
  return groupTreatmentItems(visit.items).map(
    (g) => `${g.items[0].name} ${g.teeth.join(",")} x${g.amount} =${g.total}`,
  );
}

describe("treatment buttons", () => {
  it("lays out the ten buttons in the reference order", () => {
    expect(buttons.map((candidate) => candidate.label)).toEqual([
      "Extraction",
      "Prosthesis removal",
      "Filling",
      "Dentures",
      "Root canal treatment",
      "Implant",
      "Crown",
      "Bridge",
      "General",
      "Other",
    ]);
  });

  it("puts the smart entries first and the preparations in the lists", () => {
    expect(button("Root canal treatment").face?.kind).toBe("roots");
    expect(
      button("Implant")
        .entries.map((candidate) => candidate.label)
        .slice(0, 4),
    ).toEqual(["Implant", "Abutment", "Implant + abutment", "One-phase implant"]);
    expect(button("Crown").entries.map((candidate) => candidate.label)).toEqual([
      "Crown",
      "Veneer",
      "Veneer preparation",
      "Filing",
    ]);
    expect(button("Bridge")).toMatchObject({
      face: { kind: "type", groupKey: "bridge" },
      entries: [],
    });
    expect(button("Filling").entries.map((candidate) => candidate.label)).toContain(
      "Inlay preparation",
    );
  });
});

describe("adding treatments", () => {
  it("makes one row for the selected teeth of one jaw", () => {
    expect(visitRows(add([], entry("Filling", "Filling"), [17, 16, 15]))).toEqual([
      "Filling 15,16,17 x3 =450",
    ]);
  });

  it("splits the selection into one row per jaw", () => {
    expect(visitRows(add([], entry("Filling", "Filling"), [16, 46]))).toEqual([
      "Filling 16 x1 =150",
      "Filling 46 x1 =150",
    ]);
  });

  it("starts a new row when the same treatment is added again later", () => {
    let rows = add([], entry("Filling", "Filling"), [17]);
    rows = add(rows, button("Crown").face!, [15]);
    rows = add(rows, entry("Filling", "Filling"), [16]);
    expect(visitRows(rows)).toEqual([
      "Filling 17 x1 =150",
      "Metal-Ceramic Crown 15 x1 =400",
      "Filling 16 x1 =150",
    ]);
  });

  it("adds the first crown type and switches the whole row to another type", () => {
    const rows = add([], button("Crown").face!, [15, 17]);
    expect(visitRows(rows)).toEqual(["Metal-Ceramic Crown 15,17 x2 =800"]);
    const ids = (rows[0] as Extract<TreatmentRow, { kind: "visit" }>).items.map(
      (created) => created.id,
    );
    const zirconium = {
      sectionKey: "crown",
      groupKey: "crown",
      item: item("zirconium-crown", "Zirconium Crown", 700),
    };
    expect(visitRows(switchType(rows, ids, zirconium))).toEqual(["Zirconium Crown 15,17 x2 =1400"]);
  });

  it("prices root canal treatment by each tooth's roots", () => {
    expect([11, 14, 15, 16, 26, 36, 46, 44].map(rootCount)).toEqual([1, 2, 1, 3, 3, 2, 2, 1]);
    expect(visitRows(add([], button("Root canal treatment").face!, [11, 14, 16]))).toEqual([
      "Root Canal Treatment (1 Root) 11 x1 =400",
      "Root Canal Treatment (2 Roots) 14 x1 =500",
      "Root Canal Treatment (3 Roots) 16 x1 =600",
    ]);
  });

  it("adds an implant with its abutment as two rows", () => {
    expect(visitRows(add([], entry("Implant", "Implant + abutment"), [18]))).toEqual([
      "Implant - Nobel Biocare 18 x1 =1500",
      "Titanium Abutment 18 x1 =300",
    ]);
  });

  it("needs teeth except for whole-mouth extras", () => {
    expect(needsTeeth(entry("Filling", "Filling"))).toBe(true);
    expect(needsTeeth(entry("General", "Impression"))).toBe(true);
    expect(needsTeeth(entry("General", "Panoramic X-Ray"))).toBe(false);
    expect(needsTeeth(button("General").face!)).toBe(false);
  });
});

describe("autocorrect", () => {
  const visitOf = (rows: TreatmentRow[]) =>
    (rows[0] as Extract<TreatmentRow, { kind: "visit" }>).items;

  it("puts the visit in clinical order and adds the preparation steps", () => {
    let rows: TreatmentRow[] = [];
    rows = add(rows, entry("Filling", "Filling"), [11]);
    rows = add(rows, entry("Extraction", "Wisdom Extraction"), [12]);
    rows = add(rows, entry("Crown", "Veneer"), [13]);
    rows = add(rows, entry("Filling", "Inlay"), [14]);
    rows = add(rows, button("Crown").face!, [15]);
    rows = add(rows, button("Root canal treatment").face!, [16]);
    rows = add(rows, entry("Root canal treatment", "Post (Composite)"), [17]);
    rows = add(rows, button("Implant").face!, [18]);
    const next = autocorrect(rows, SECTIONS, [], makeId);
    expect(
      visitOf(next).map((created) => `${treatmentState(created)}@${created.toothNumber}`),
    ).toEqual([
      "33@12",
      "201@16",
      "11@18",
      "12@18",
      "8@17",
      "6@17",
      "19@15",
      "17@14",
      "25@13",
      "9@15",
      "26@13",
      "18@14",
      "27@11",
    ]);
  });

  it("brings rows of the same treatment and jaw together", () => {
    let rows = add([], button("Crown").face!, [15]);
    rows = add(rows, entry("Filling", "Filling"), [14]);
    rows = add(rows, button("Crown").face!, [16, 46]);
    const next = autocorrect(rows, SECTIONS, [], makeId);
    expect(visitRows(next)).toEqual([
      "Filing 15,16 x2 =0",
      "Filing 46 x1 =0",
      "Metal-Ceramic Crown 15,16 x2 =800",
      "Metal-Ceramic Crown 46 x1 =400",
      "Filling 14 x1 =150",
    ]);
  });

  it("does not file under a crown on an implant or a missing tooth", () => {
    let rows = add([], entry("Implant", "Implant + abutment"), [36]);
    rows = add(rows, button("Crown").face!, [36, 35]);
    const next = autocorrect(rows, SECTIONS, [35], makeId);
    expect(visitOf(next).filter((created) => treatmentState(created) === 19)).toEqual([]);
  });

  it("is a no-op on an already corrected visit", () => {
    const rows = autocorrect(add([], button("Crown").face!, [15]), SECTIONS, [], makeId);
    const again = autocorrect(rows, SECTIONS, [], makeId);
    expect(visitOf(again).map((created) => created.id)).toEqual(
      visitOf(rows).map((created) => created.id),
    );
  });
});

describe("planned drawing", () => {
  it("lists each tooth's planned states in plan order", () => {
    let rows = add([], entry("Extraction", "Wisdom Extraction"), [24]);
    rows = add(rows, entry("Implant", "Implant + abutment"), [24]);
    rows = add(rows, button("Crown").face!, [24]);
    expect(plannedStates(rows)).toEqual([
      { toothId: 24, stateId: 33 },
      { toothId: 24, stateId: 11 },
      { toothId: 24, stateId: 13 },
      { toothId: 24, stateId: 9 },
    ]);
  });

  it("maps every default price list item to its dental state", () => {
    const states = Object.fromEntries(
      SECTIONS.flatMap((current) =>
        current.groups.flatMap((g) =>
          g.items.map((created) => [
            created.key,
            treatmentState({
              catalogSectionKey: current.key,
              catalogGroupKey: g.key,
              catalogItemKey: created.key,
            } as TreatmentItem),
          ]),
        ),
      ),
    );
    expect(states).toMatchObject({
      "wisdom-extraction": 33,
      "bridge-removal": 200,
      filling: 27,
      inlay: 18,
      onlay: 24,
      "temporary-bridge": 315,
      "root-canal-treatment-2-roots": 201,
      "post-composite": 6,
      "parapulpal-pin": 34,
      "implant-neodent": 11,
      "titanium-abutment": 13,
      "bcs-kos-implant": 10,
      "healing-screw": 12,
      "zirconium-crown": 9,
      veneer: 26,
      "metal-ceramic-bridge": 15,
      impression: 14,
      "panoramic-x-ray": 207,
      apicoectomy: 207,
    });
  });
});
