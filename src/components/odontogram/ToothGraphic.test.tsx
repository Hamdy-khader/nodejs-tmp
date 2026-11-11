import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildToothVisual } from "@/lib/dental/tooth-visual";
import { EXTRA_DIAGNOSIS } from "@/lib/dental/states";
import { ODONTOGRAM_COLORS, ToothGraphic } from "./ToothGraphic";

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
