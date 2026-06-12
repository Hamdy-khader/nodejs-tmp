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
  it("preserves backend values while filling missing catalog defaults", () => {
    const normalized = normalizePricelistData(makePricelistData());
    const implantSection = normalized.sections.find((section) => section.key === "implant");
    const nobel = implantSection?.groups[0]?.items.find(
      (item) => item.name === "Implant - Nobel Biocare",
    );
    const straumann = implantSection?.groups[0]?.items.find(
      (item) => item.name === "Implant - Straumann",
    );

    expect(normalized.sections).toHaveLength(11);
    expect(nobel).toMatchObject({
      id: "nobel-id",
      key: "nobel-custom",
      price: 2222,
      note: "custom",
    });
    expect(straumann).toMatchObject({
      name: "Implant - Straumann",
      price: 0,
    });
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
