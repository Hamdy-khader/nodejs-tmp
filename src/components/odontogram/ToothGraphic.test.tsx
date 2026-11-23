import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildToothVisual } from "@/lib/dental/tooth-visual";
import { EXTRA_DIAGNOSIS } from "@/lib/dental/states";
import { ODONTOGRAM_COLORS, ToothGraphic } from "./ToothGraphic";
import { render, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { Odontogram } from "./Odontogram";
import { importedBridgeEntries } from "@/test/fixtures/imported-bridge-chart";

afterEach(cleanup);

describe("imported bridge chart", () => {
  it("paints abutments above the crown on both jaws and leaves unspecified anatomy empty", () => {
    const { container } = render(<Odontogram entries={importedBridgeEntries()} readOnly />);
    const tooth = (n: number) => container.querySelector(`[data-tooth-number="${n}"]`)!;
    expect(tooth(22).querySelectorAll("svg path")).toHaveLength(0);
    expect(tooth(22).querySelector('[data-marker="none"]')).not.toBeNull();
    for (const n of [11,13,14,17,31,33,41,43]) {
      const crown = tooth(n).querySelector('[data-crown]')!;
      const abutment = tooth(n).querySelector('[data-abutment]')!;
      expect(crown.compareDocumentPosition(abutment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    for (const n of [26,27]) {
      expect(tooth(n).querySelector('[data-abutment]')).not.toBeNull();
      expect(tooth(n).querySelector('[data-crown]')).toBeNull();
    }
  });
});

describe("additional diagnosis colors", () => {
  for (const stateId of [3, 4, 5, 18, 9, 15, 26, 11, 201]) {
    it.each(EXTRA_DIAGNOSIS[stateId].options.filter((option) => option !== "-"))(
      `renders state ${stateId} with %s in red`,
      (extraDiagnosis) => {
        const visual = buildToothVisual(16, [{ toothId: 16, stateId, extraDiagnosis }]);
        const svg = renderToStaticMarkup(<ToothGraphic visual={visual} />);
        expect(svg).toMatch(new RegExp(`${ODONTOGRAM_COLORS.caries}|${ODONTOGRAM_COLORS.cariesLine}|${ODONTOGRAM_COLORS.cariesBack}`));
        expect(visual.marker).toBe("detailed");
      },
    );
  }

  it("restores the usual root color when details are cleared", () => {
    const visual = buildToothVisual(16, [{ toothId: 16, stateId: 201, extraDiagnosis: "" }]);
    const svg = renderToStaticMarkup(<ToothGraphic visual={visual} />);
    expect(svg).toContain(ODONTOGRAM_COLORS.root);
    expect(svg).not.toContain(ODONTOGRAM_COLORS.caries);
  });

  it("keeps planned replacement work green", () => {
    for (const stateId of [201, 9, 11, 26]) {
      const visual = buildToothVisual(16,
        [{ toothId: 16, stateId, extraDiagnosis: "Unsatisfactory" }],
        [{ toothId: 16, stateId }],
      );
      const svg = renderToStaticMarkup(<ToothGraphic visual={visual} />);
      expect(svg).toContain(ODONTOGRAM_COLORS.plannedLine);
      expect(svg).not.toContain(ODONTOGRAM_COLORS.caries);
    }
  });
});
