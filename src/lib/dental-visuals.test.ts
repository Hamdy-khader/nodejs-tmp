import { describe, expect, it } from "vitest";
import { getDentalVisual } from "./dental-visuals";
import {
  getCatalogSectionById,
  getTreatmentSections,
  getToothStatusForTreatment,
} from "./treatment-catalog";

describe("name-based treatment visuals", () => {
  it("covers every built-in treatment and assigns distinct name-based colors", () => {
    const visuals = getTreatmentSections().flatMap((section) =>
      getCatalogSectionById(section.id)!.groups.flatMap((group) =>
        group.items.map((item) =>
          getDentalVisual(item.name, { treatment: true, section: section.id }),
        ),
      ),
    );
    for (const visual of visuals) expect(visual.mark, visual.label).not.toBe("other");
    const unique = [...new Map(visuals.map((visual) => [visual.key, visual])).values()];
    expect(new Set(unique.map((visual) => visual.color)).size).toBe(unique.length);
  });
  it.each([
    ["Veneer", "crown", "veneer"],
    ["Crown Removal", "crown", "crownRemoval"],
    ["Post (Composite)", "root-canal-treatment", "post"],
    ["Parapulpal Pin", "root-canal-treatment", "pin"],
    ["Temporary Filling", "filling", "temporary"],
    ["Medicated Filling", "filling", "medicated"],
    ["Root Canal Treatment (1 Root)", "root-canal-treatment", "rootOne"],
    ["Root Canal Treatment (2 Roots)", "root-canal-treatment", "rootTwo"],
    ["Root Canal Treatment (3 Roots)", "root-canal-treatment", "rootThree"],
    ["Ceramic bridge on implant", "bridge", "bridge"],
    ["Temporary bridge on implants", "implant", "bridge"],
    ["Screw-retained implant bridge", "implant", "bridge"],
    ["Bridge on implant abutments", "bridge", "bridge"],
    ["Ceramic crown on implant", "implant", "crown"],
    ["Screw-retained implant crown", "crown", "crown"],
    ["Implant-supported dentures", "dentures", "dentures"],
  ])("uses the specific procedure %s before its category", (name, section, mark) => {
    expect(getDentalVisual(name, { treatment: true, section }).mark).toBe(mark);
  });
  it.each([
    ["Ceramic bridge on implant", "bridge"],
    ["Ceramic crown on implant", "crown"],
  ])("does not create an implant for the restoration %s", (name, status) => {
    expect(getToothStatusForTreatment("implant", name)).toBe(status);
    expect(getDentalVisual(name, { treatment: true }).mark).toBe(status);
  });
  it("normalizes names and infers legacy treatments without a section", () => {
    expect(getDentalVisual("  TEMPORARY   Filling ", { treatment: true }).color).toBe(
      getDentalVisual("Temporary Filling", { treatment: true }).color,
    );
    expect(getToothStatusForTreatment("", "Implant - Neodent")).toBe("implant");
    expect(getToothStatusForTreatment("crown", "Crown Lengthening")).toBeNull();
  });
});
