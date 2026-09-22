import { describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { pricelistStore, toPriceSections, usePricelist } from "@/lib/pricelist-store";
import type { PricelistSection } from "@/lib/admin/api";

const getPricelist = vi.hoisted(() => vi.fn());
vi.mock("@/lib/admin/api", () => ({ clinicApi: { pricelist: { get: getPricelist } } }));

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
  it("refreshes saved clinic prices when opening treatment selection again", async () => {
    pricelistStore.setSections(toPriceSections(rawSections));
    const latest = structuredClone(rawSections);
    latest[0].groups[0].items[0].price = 123.75;
    getPricelist.mockResolvedValueOnce({ sections: latest });
    const { result } = renderHook(() => usePricelist());
    await waitFor(() => expect(result.current[0].groups[0].items[0].price).toBe(123.75));
    cleanup();
  });

  it("does not let an older load overwrite a newer clinic price edit", async () => {
    let resolve!: (value: { sections: PricelistSection[] }) => void;
    getPricelist.mockImplementationOnce(() => new Promise(res => { resolve = res; }));
    const pending = pricelistStore.reload();
    const latest = structuredClone(rawSections);
    latest[0].groups[0].items[0].price = 456;
    pricelistStore.setSections(toPriceSections(latest));
    resolve({ sections: rawSections });
    await pending;
    expect(pricelistStore.getPriceFor("Panoramic X-Ray")).toBe(456);
  });
  it("converts API sections into normalized price sections", () => {
    const sections = toPriceSections(rawSections);
    const generalSection = sections.find((section) => section.key === "general");
    const item = generalSection?.groups[0]?.items.find((entry) => entry.name === "Panoramic X-Ray");

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
