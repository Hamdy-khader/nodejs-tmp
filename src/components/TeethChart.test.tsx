import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TeethChart, ToothIllustration } from "./TeethChart";
import { defaultTeeth } from "@/lib/patients-store";
import { DIAGNOSIS_MARKS, DENTAL_MARKS, getDentalVisual } from "@/lib/dental-visuals";
import { getTreatmentAnnotations, getTreatmentTeeth } from "@/lib/treatment-teeth";
import type { TreatmentRow } from "@/lib/patients-store";
import { getTreatmentSections, getCatalogSectionById } from "@/lib/treatment-catalog";

afterEach(cleanup);
describe("combined treatments on the same tooth", () => {
  it.each([false, true])(
    "updates diagnosis underneath existing treatment immediately (report=%s)",
    (report) => {
      const rows: TreatmentRow[] = [
        {
          id: "v",
          kind: "visit",
          items: [
            {
              id: "c",
              name: "Crown",
              catalogSectionKey: "crown",
              toothNumber: 12,
              amount: 1,
              unitPrice: 200,
            },
          ],
        },
      ];
      const base = defaultTeeth();
      const view = (teeth: typeof base) => (
        <TeethChart
          teeth={getTreatmentTeeth(teeth, rows)}
          baseTeeth={teeth}
          annotations={getTreatmentAnnotations(rows)}
          report={report}
        />
      );
      const { container, rerender } = render(view(base));
      const updated = { ...base, 12: { number: 12, status: "caries" as const, note: "Caries" } };
      rerender(view(updated));
      expect(
        container.querySelector('[data-tooth-number="12"] [data-dental-mark="caries"]'),
      ).not.toBeNull();
      expect(
        container.querySelector('[data-tooth-number="12"] [data-dental-mark="crown"]'),
      ).not.toBeNull();
      rerender(view({ ...base, 12: { number: 12, status: "intact", note: "Fractured" } }));
      expect(
        container.querySelector('[data-tooth-number="12"] [data-dental-mark="caries"]'),
      ).toBeNull();
      expect(
        container.querySelector(
          '[data-tooth-number="12"] path[d="M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"]',
        ),
      ).not.toBeNull();
      rerender(view(base));
      expect(
        container.querySelector('[data-tooth-number="12"] [data-dental-mark="fractured"]'),
      ).toBeNull();
      expect(
        container.querySelector('[data-tooth-number="12"] [data-dental-mark="crown"]'),
      ).not.toBeNull();
      expect(rows[0]).toMatchObject({ items: [{ id: "c", unitPrice: 200 }] });
    },
  );
  it.each([false, true])(
    "keeps a bridge on diagnosed missing teeth rootless (report=%s)",
    (report) => {
      const base = defaultTeeth();
      base[12] = { number: 12, status: "missing" };
      const rows: TreatmentRow[] = [
        {
          id: "v",
          kind: "visit",
          items: [
            {
              id: "bridge",
              name: "Bridge 13-11",
              catalogSectionKey: "bridge",
              amount: 1,
              unitPrice: 500,
            },
          ],
        },
      ];
      const { container, rerender } = render(
        <TeethChart
          teeth={getTreatmentTeeth(base, rows)}
          baseTeeth={base}
          annotations={getTreatmentAnnotations(rows)}
          report={report}
        />,
      );
      const missing = container.querySelector('[data-tooth-number="12"]')!;
      expect(missing.querySelector('[data-pontic="true"]')).not.toBeNull();
      expect(missing.querySelector("[data-natural-root]")).toBeNull();
      expect(missing.querySelector("[data-bridge-connector]")).not.toBeNull();
      expect(
        container.querySelector('[data-tooth-number="13"] [data-natural-root]'),
      ).not.toBeNull();
      rerender(<TeethChart teeth={base} baseTeeth={base} report={report} />);
      expect(container.querySelector('[data-tooth-number="12"] [data-natural-root]')).toBeNull();
      expect(
        container.querySelector('[data-tooth-number="12"] [data-bridge-connector]'),
      ).toBeNull();
      expect(base[12].status).toBe("missing");
    },
  );

  it("restores the original detailed molar with three separate roots", () => {
    const { container } = render(<ToothIllustration number={16} status="intact" />);
    expect(container.querySelectorAll("[data-natural-root]")).toHaveLength(3);
    expect(container.querySelector('linearGradient stop[stop-color="#F8F4ED"]')).not.toBeNull();
  });
  const visit = (names: string[]): TreatmentRow[] => [
    {
      id: "v",
      kind: "visit",
      items: names.map((name, i) => ({
        id: String(i),
        name,
        toothNumber: 14,
        amount: 1,
        unitPrice: 100,
      })),
    },
  ];
  it.each([
    ["Implant", "Bridge"],
    ["Bridge", "Implant"],
  ])("keeps %s and %s visible together in the editor and report", (first, second) => {
    const rows = visit([first, second]);
    const props = {
      teeth: getTreatmentTeeth(defaultTeeth(), rows),
      annotations: getTreatmentAnnotations(rows),
    };
    const { container } = render(
      <>
        <TeethChart {...props} />
        <TeethChart {...props} report />
      </>,
    );
    for (const tooth of container.querySelectorAll('[data-tooth-number="14"]')) {
      expect(tooth.querySelector('[data-dental-mark="implant"]')).not.toBeNull();
      expect(tooth.querySelector('[data-dental-mark="bridge"]')).not.toBeNull();
      expect(tooth.querySelector("[data-bridge-connector]")).not.toBeNull();
      expect(tooth.querySelector('[data-dental-mark="bridge"]')).toHaveAttribute("fill", "none");
    }
  });
  it("keeps root canal, post and crown from different visits visible together", () => {
    const rows: TreatmentRow[] = ["Root Canal Treatment (1 Root)", "Post", "Crown"].map(
      (name, i) => ({
        id: String(i),
        kind: "visit",
        items: [{ id: `i${i}`, name, toothNumber: 14, amount: 1, unitPrice: 100 }],
      }),
    );
    const { container } = render(
      <TeethChart
        teeth={getTreatmentTeeth(defaultTeeth(), rows)}
        annotations={getTreatmentAnnotations(rows)}
      />,
    );
    for (const mark of ["rootOne", "post", "crown"]) {
      expect(
        container.querySelector(`[data-tooth-number="14"] [data-dental-mark="${mark}"]`),
      ).not.toBeNull();
    }
  });
  it("keeps an existing diagnosed implant underneath a new bridge", () => {
    const base = defaultTeeth();
    base[14] = { number: 14, status: "implant", note: "Implant" };
    const rows = visit(["Bridge"]);
    const { container } = render(
      <TeethChart
        baseTeeth={base}
        teeth={getTreatmentTeeth(base, rows)}
        annotations={getTreatmentAnnotations(rows)}
      />,
    );
    const tooth = container.querySelector('[data-tooth-number="14"]');
    expect(tooth?.querySelector('[data-dental-mark="implant"]')).not.toBeNull();
    expect(tooth?.querySelector('[data-dental-mark="bridge"]')).not.toBeNull();
  });
  it("removes only the deleted treatment drawing and keeps the implant", () => {
    const rows = visit(["Implant", "Bridge"]);
    const { container, rerender } = render(
      <TeethChart
        teeth={getTreatmentTeeth(defaultTeeth(), rows)}
        annotations={getTreatmentAnnotations(rows)}
      />,
    );
    const remaining = visit(["Implant"]);
    rerender(
      <TeethChart
        teeth={getTreatmentTeeth(defaultTeeth(), remaining)}
        annotations={getTreatmentAnnotations(remaining)}
      />,
    );
    const tooth = container.querySelector('[data-tooth-number="14"]');
    expect(tooth?.querySelector('[data-dental-mark="implant"]')).not.toBeNull();
    expect(tooth?.querySelector('[data-dental-mark="bridge"]')).toBeNull();
    expect(tooth?.querySelector("[data-bridge-connector]")).toBeNull();
  });
});

describe("diagnosis illustrations", () => {
  it("renders every built-in treatment family on the original tooth anatomy", () => {
    const families = new Map<string, { name: string; catalogSectionKey: string }>();
    for (const section of getTreatmentSections()) {
      for (const group of getCatalogSectionById(section.id)!.groups) {
        for (const item of group.items) {
          const visual = getDentalVisual(item.name, { treatment: true, section: section.id });
          families.set(visual.mark, { name: item.name, catalogSectionKey: section.id });
        }
      }
    }
    const entries = [...families.entries()];
    const base = defaultTeeth();
    const numbers = Object.keys(base).map(Number);
    for (let offset = 0; offset < entries.length; offset += numbers.length) {
      const group = entries.slice(offset, offset + numbers.length);
      const rows: TreatmentRow[] = [
        {
          id: "v",
          kind: "visit",
          items: group.map(([, item], index) => ({
            ...item,
            id: String(index),
            toothNumber: numbers[index],
            amount: 1,
            unitPrice: 100,
          })),
        },
      ];
      const { container, unmount } = render(
        <TeethChart
          teeth={getTreatmentTeeth(base, rows)}
          baseTeeth={base}
          annotations={getTreatmentAnnotations(rows)}
        />,
      );
      for (const [index, [mark]] of group.entries()) {
        const tooth = container.querySelector(`[data-tooth-number="${numbers[index]}"]`)!;
        expect(tooth.querySelector(`[data-dental-mark="${mark}"]`), mark).not.toBeNull();
        expect(tooth.querySelector("svg path"), mark).not.toBeNull();
      }
      unmount();
    }
  });
  it("renders a distinct illustration for every diagnosis", () => {
    // Compare actual SVG shapes and materials; the restored composite and amalgam share anatomy.
    for (const number of [11, 13, 14, 16, 41, 43, 44, 46]) {
      const seen = new Map<string, string>();
      for (const name of Object.keys(DIAGNOSIS_MARKS)) {
        const { container, unmount } = render(
          <ToothIllustration number={number} status="intact" note={name} />,
        );
        const geometry = JSON.stringify(
          [...container.querySelectorAll("path, rect, circle, ellipse, line")].map((shape) => [
            shape.tagName,
            ...[
              "d",
              "x",
              "y",
              "x1",
              "x2",
              "y1",
              "y2",
              "cx",
              "cy",
              "rx",
              "ry",
              "r",
              "width",
              "height",
              "fill",
              "stroke",
              "stroke-width",
              "stroke-dasharray",
            ].map((attribute) =>
              shape.getAttribute(attribute)?.replace(/url\(#tk[^)]+\)/g, "gradient"),
            ),
          ]),
        );
        expect(
          seen.get(geometry),
          `${name} must differ from ${seen.get(geometry)} on tooth ${number}`,
        ).toBeUndefined();
        seen.set(geometry, name);
        unmount();
      }
    }
  });
  it("gives every diagnosis its own color and semantic drawing on every tooth", () => {
    const names = Object.keys(DIAGNOSIS_MARKS);
    expect(new Set(names.map((name) => getDentalVisual(name).color)).size).toBe(names.length);
    expect(new Set(names.map((name) => DENTAL_MARKS[getDentalVisual(name).mark])).size).toBe(
      names.length,
    );
    for (const name of names) {
      const teeth = defaultTeeth();
      for (const tooth of Object.values(teeth)) tooth.note = name;
      const { container, unmount } = render(<TeethChart teeth={teeth} />);
      expect(container.querySelectorAll("[data-tooth-number]")).toHaveLength(32);
      expect(
        [...container.querySelectorAll("[data-visual-key]")].map((el) =>
          el.getAttribute("data-visual-key"),
        ),
        name,
      ).toEqual(Array(32).fill(getDentalVisual(name).key));
      unmount();
    }
  }, 20000);

  it("keeps treatment symbols and colors identical in the chart and report, including multiple procedures", () => {
    const rows: TreatmentRow[] = [
      {
        id: "visit",
        kind: "visit",
        items: [
          {
            id: "1",
            name: "Crown Removal",
            catalogSectionKey: "prosthesis-removal",
            toothNumber: 11,
            amount: 1,
            unitPrice: 10,
          },
          {
            id: "2",
            name: "Veneer",
            catalogSectionKey: "veneer",
            toothNumber: 11,
            amount: 1,
            unitPrice: 500,
          },
          {
            id: "3",
            name: "Temporary Filling",
            catalogSectionKey: "filling",
            toothNumber: 41,
            amount: 1,
            unitPrice: 20,
          },
        ],
      },
    ];
    const props = {
      teeth: getTreatmentTeeth(defaultTeeth(), rows),
      annotations: getTreatmentAnnotations(rows),
    };
    const { container } = render(
      <>
        <TeethChart {...props} showLegend />
        <TeethChart {...props} highlighted={[11, 41]} report />
      </>,
    );
    const veneers = container.querySelectorAll('[data-visual-key="treatment:veneer"]');
    expect(veneers).toHaveLength(2);
    expect(veneers[0].querySelector("[data-dental-mark]")?.getAttribute("stroke")).toBe(
      veneers[1].querySelector("[data-dental-mark]")?.getAttribute("stroke"),
    );
    expect(
      container.querySelectorAll('[data-visual-key="treatment:temporary filling"]'),
    ).toHaveLength(2);
    expect(container.querySelector('[data-tooth-number="11"]')).toHaveAccessibleName(
      "Tooth 11: Crown Removal, Veneer",
    );
    expect(
      container.querySelector('[aria-label="Tooth symbols and colors"]')?.textContent,
    ).toContain("Crown Removal");
  });

  it("does not connect dentures as bridge supports", () => {
    const teeth = defaultTeeth();
    teeth[14] = { number: 14, status: "bridge", note: "Dentures" };
    teeth[15].status = "missing";
    teeth[16].status = "bridge";
    const { container } = render(<TeethChart teeth={teeth} />);
    expect(
      container.querySelector('[data-tooth-number="14"] [data-dental-mark="dentures"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll("[data-pontic]")).toHaveLength(0);
  });
  it("joins two bridge supports across a missing tooth without adding a root to the pontic", () => {
    const teeth = defaultTeeth();
    teeth[16].status = "bridge";
    teeth[15].status = "missing";
    teeth[14].status = "bridge";
    const { container } = render(<TeethChart teeth={teeth} />);
    expect(container.querySelectorAll('[data-tooth-visual="bridge"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-pontic="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-tooth-number="15"] [data-pontic]')).not.toBeNull();
    expect(teeth[15].status).toBe("missing");
  });
  it("does not bridge over a healthy tooth or between jaws", () => {
    const teeth = defaultTeeth();
    teeth[16].status = "bridge";
    teeth[14].status = "bridge";
    teeth[46].status = "missing";
    const { container } = render(<TeethChart teeth={teeth} />);
    expect(container.querySelectorAll("[data-pontic]")).toHaveLength(0);
  });
  it("faces upper and lower crowns toward each other", () => {
    const { container } = render(<TeethChart teeth={defaultTeeth()} />);
    expect(container.querySelector('[data-tooth-number="11"] [data-tooth-visual]')).toHaveAttribute(
      "transform",
      "translate(0,80) scale(1,-1)",
    );
    expect(
      container.querySelector('[data-tooth-number="41"] [data-tooth-visual]'),
    ).not.toHaveAttribute("transform");
  });
  it("changes the crown geometry for a fractured tooth and keeps SVG IDs unique", () => {
    const { container } = render(
      <>
        <ToothIllustration number={11} status="intact" />
        <ToothIllustration number={11} status="intact" note="Fractured" />
      </>,
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs[0].innerHTML).not.toEqual(svgs[1].innerHTML);
    expect(
      svgs[1].querySelector('path[d="M8 37 L8 23 L14 27 L18 16 L23 25 L29 19 L32 37 Z"]'),
    ).not.toBeNull();
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("highlights all selected teeth", () => {
    const { container } = render(
      <TeethChart teeth={defaultTeeth()} selected={14} highlighted={[14, 16]} />,
    );
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(2);
  });
});
