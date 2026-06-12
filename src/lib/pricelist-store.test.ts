import { describe, expect, it } from "vitest";
import { pricelistStore, toPriceSections } from "@/lib/pricelist-store";
import type { PricelistSection } from "@/lib/admin/api";

const rawSections: PricelistSection[] = [
  {
    id: "general-source",
    key: "general",
    n: 10,
    label: "General",
    icon: "package",
    groups: [
      {
        id: "general-fixed-price",
        key: "general-fixed-price",
        title: "General (Fixed Price)",
        price_label: "USD",
        items: [
          {
            id: "pan-xray",
            key: "panoramic-xray-custom",
            name: "Panoramic X-Ray",
            price: 80,
            note: "updated",
          },
        ],
      },
    ],
  },
  {
    id: "implant-source",
    key: "implant",
    n: 6,
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
            id: "implant-nobel",
            key: "implant-nobel",
            name: "Implant - Nobel Biocare",
            price: 1500,
            note: "",
          },
        ],
      },
    ],
  },
];

describe("pricelist-store", () => {
  it("converts API sections into normalized price sections", () => {
    const sections = toPriceSections(rawSections);
    const generalSection = sections.find((section) => section.key === "general");
    const item = generalSection?.groups[1]?.items.find((entry) => entry.name === "Panoramic X-Ray");

    expect(generalSection?.label).toBe("General");
    expect(item).toMatchObject({
      id: "pan-xray",
      key: "panoramic-xray-custom",
      price: 80,
      note: "updated",
    });
  });

  it("returns exact-match prices before prefix matches", () => {
    pricelistStore.setSections(toPriceSections(rawSections));

    expect(pricelistStore.getPriceFor("Panoramic X-Ray")).toBe(80);
    expect(pricelistStore.getPriceFor("Implant - Nobel Biocare (Promo)")).toBe(1500);
    expect(pricelistStore.getPriceFor("Unknown service")).toBe(0);
  });
});
