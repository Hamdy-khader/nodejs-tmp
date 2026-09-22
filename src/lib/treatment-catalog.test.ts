import { describe, expect, it } from "vitest";
import {
  getToothStatusForTreatment,
  isDefaultItem,
  normalizePricelistData,
} from "@/lib/treatment-catalog";
import type { PricelistData } from "@/lib/admin/api";

function makePricelistData(): PricelistData {
  return {
    settings: {
      language: "en",
      currency_code: "USD",
      currency_label: "United States dollar",
      currency_symbol: "$",
    },
    sections: [
      {
        id: "implant-source",
        key: "implant",
        n: 99,
        label: "Implant",
        icon: "anchor",
        groups: [
          {
            id: "implant-group",
            key: "implant",
            title: "Implant",
            price_label: null,
            items: [
              {
                id: "nobel-id",
                key: "nobel-custom",
                name: "Implant - Nobel Biocare",
                price: 2222,
                note: "custom",
              },
            ],
          },
        ],
      },
      {
        id: "filling-source",
        key: "filling",
        n: 3,
        label: "Filling",
        icon: "droplet",
        groups: [
          {
            id: "fill-group",
            key: "filling",
            title: "Filling",
            price_label: "EUR",
            items: [
              {
                id: "filling-id",
                key: "filling-custom",
                name: "Filling",
                price: 175,
                note: "front tooth",
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("treatment-catalog", () => {
  it("preserves renamed and custom clinic treatments, duplicate names, zero prices and permissions", () => {
    const data = makePricelistData();
    const group = data.sections[0].groups[0];
    group.items = [
      { id: "custom-uuid", key: "implant-nobel-biocare", name: "Clinic implant", price: 987.5, note: "custom", can_edit_price: true, can_delete: false },
      { id: "free", name: "Consultation", price: 0, note: "" },
    ];
    data.sections[0].groups.push({ ...group, id: "another-group", items: [{ id: "paid", name: "Consultation", price: 50, note: "" }] });
    data.sections.push({ id: "custom-section", label: "Clinic services", n: null, icon: "package", groups: [] });
    expect(normalizePricelistData(data)).toEqual(data);
    expect(normalizePricelistData({ ...data, sections: [] }).sections).toEqual([]);
  });
  it("uses clinic records without inventing missing treatments", () => {
    const normalized = normalizePricelistData(makePricelistData());
    const implantSection = normalized.sections.find((section) => section.key === "implant");
    const nobel = implantSection?.groups[0]?.items.find(
      (item) => item.name === "Implant - Nobel Biocare",
    );
    const straumann = implantSection?.groups[0]?.items.find(
      (item) => item.name === "Implant - Straumann",
    );

    expect(normalized.sections).toHaveLength(2);
    expect(nobel).toMatchObject({
      id: "nobel-id",
      key: "nobel-custom",
      price: 2222,
      note: "custom",
    });
    expect(straumann).toBeUndefined();
  });

  it("detects built-in catalog items using normalized titles", () => {
    expect(isDefaultItem("filling", " filling ", "Filling")).toBe(true);
    expect(isDefaultItem("filling", "other treatments", "Not in catalog")).toBe(false);
  });

  it("maps treatment sections to tooth statuses", () => {
    expect(getToothStatusForTreatment("implant", "Implant - Neodent")).toBe("implant");
    expect(getToothStatusForTreatment("dentures", "Temporary Crown")).toBe("crown");
    expect(getToothStatusForTreatment("general", "Panoramic X-Ray")).toBeNull();
  });
});
