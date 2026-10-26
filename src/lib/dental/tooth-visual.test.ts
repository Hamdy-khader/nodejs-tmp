import { describe, expect, it } from "vitest";
import type { StatusEntry } from "@/lib/dental/diagnosis-engine";
import {
  bridgeConnectors,
  buildMouthVisuals,
  buildToothVisual,
  dentureRuns,
  type PlannedState,
} from "@/lib/dental/tooth-visual";

const at = (toothId: number, stateId: number, extraDiagnosis?: string): StatusEntry => ({
  toothId,
  stateId,
  extraDiagnosis,
});
const plan = (toothId: number, ...stateIds: number[]): PlannedState[] =>
  stateIds.map((stateId) => ({ toothId, stateId }));

describe("diagnosis drawings", () => {
  it("hides a missing tooth and leaves its number plain", () => {
    expect(buildToothVisual(16, [at(16, 2)])).toMatchObject({ present: false, marker: "none" });
  });

  it("draws one caries spot per picked surface", () => {
    const visual = buildToothVisual(16, [at(16, 3, "M,O")]);
    expect(visual.spots).toEqual([
      { kind: "caries", surface: "M", planned: false },
      { kind: "caries", surface: "O", planned: false },
    ]);
    expect(visual.marker).toBe("status");
  });

  it("draws the default spot when no surface was picked", () => {
    expect(buildToothVisual(16, [at(16, 4)]).spots).toEqual([
      { kind: "amalgam", surface: undefined, planned: false },
    ]);
  });

  it("replaces the crown with a core under a post", () => {
    const visual = buildToothVisual(16, [at(16, 201), at(16, 7)]);
    expect(visual).toMatchObject({ rootCanal: { planned: false }, post: { planned: false } });
    expect(visual.crown).toEqual({ shape: "core", fill: "gray" });
  });

  it("covers the filing with a grey crown", () => {
    expect(buildToothVisual(16, [at(16, 19), at(16, 9)]).crown).toEqual({
      shape: "natural",
      fill: "gray",
    });
  });

  it("draws a pontic for a bridge over a missing tooth", () => {
    const visual = buildToothVisual(15, [at(15, 2), at(15, 15)]);
    expect(visual).toMatchObject({ present: true, naturalRoot: false, bridge: { pontic: true } });
  });

  it("draws an implant with its abutment and no crown", () => {
    const visual = buildToothVisual(16, [at(16, 11), at(16, 13)]);
    expect(visual).toMatchObject({
      present: true,
      naturalRoot: false,
      abutment: { planned: false },
    });
    expect(visual.crown.shape).toBe("none");
  });

  it("puts a white denture tooth on a missing socket", () => {
    const visual = buildToothVisual(33, [at(33, 2), at(33, 300)]);
    expect(visual).toMatchObject({
      present: true,
      naturalRoot: false,
      dentures: { planned: false },
    });
    expect(visual.crown.fill).toBe("white");
  });

  it("marks a whole-mouth finding on the tooth with the circle only", () => {
    const visual = buildToothVisual(11, [at(11, 1), at(11, 412)]);
    expect(visual).toMatchObject({ marker: "status", spots: [], present: true });
  });

  it("keeps the root and draws no crown for a radix", () => {
    expect(buildToothVisual(26, [at(26, 29)])).toMatchObject({
      naturalRoot: true,
      crown: { shape: "none" },
    });
  });
});

describe("treatment drawings", () => {
  it("replaces an extracted tooth with a green cross", () => {
    const visual = buildToothVisual(18, [at(18, 1)], plan(18, 33));
    expect(visual).toMatchObject({ present: false, extraction: true, marker: "planned" });
  });

  it("builds extraction, implant, abutment and crown on one tooth", () => {
    const visual = buildToothVisual(24, [at(24, 1)], plan(24, 33, 11, 13, 9));
    expect(visual).toMatchObject({
      present: true,
      extraction: false,
      implant: { planned: true },
      abutment: { planned: true },
      crown: { shape: "natural", fill: "planned" },
    });
  });

  it("shows root canal and post under a planned crown", () => {
    const visual = buildToothVisual(26, [at(26, 1)], plan(26, 201, 6, 9));
    expect(visual).toMatchObject({
      rootCanal: { planned: true },
      post: { planned: true },
      crown: { shape: "natural", fill: "planned" },
    });
  });

  it("keeps the crown over a filing whose row comes after it", () => {
    for (const steps of [plan(16, 9, 19), plan(16, 19, 9)]) {
      expect(buildToothVisual(16, [at(16, 1)], steps).crown).toEqual({
        shape: "natural",
        fill: "planned",
      });
    }
    expect(buildToothVisual(16, [at(16, 1)], plan(16, 19)).crown.shape).toBe("filed");
  });

  it("keeps an untreated caries red next to planned work elsewhere", () => {
    const visual = buildToothVisual(22, [at(22, 3)], plan(21, 27));
    expect(visual.spots).toEqual([{ kind: "caries", surface: undefined, planned: false }]);
    expect(visual.marker).toBe("status");
  });

  it("turns the number green for treatments that draw nothing", () => {
    expect(buildToothVisual(28, [at(28, 1)], plan(28, 14)).marker).toBe("planned");
  });

  it("draws a temporary bridge in beige", () => {
    const visual = buildToothVisual(32, [at(32, 1)], plan(32, 315));
    expect(visual.crown.fill).toBe("temporary");
    expect(visual.bridge).toMatchObject({ temporary: true, planned: true });
  });
});

describe("links between teeth", () => {
  const order = [18, 17, 16, 15, 14, 13];

  it("connects neighbouring bridge units", () => {
    const entries = [at(14, 19), at(14, 15), at(15, 2), at(15, 15), at(16, 19), at(16, 15)];
    const visuals = buildMouthVisuals(entries);
    expect(bridgeConnectors(order, visuals).map(({ from, to }) => [from, to])).toEqual([
      [16, 15],
      [15, 14],
    ]);
  });

  it("joins neighbouring denture teeth on one gum base", () => {
    const entries = [at(16, 2), at(16, 300), at(15, 2), at(15, 300), at(13, 2), at(13, 300)];
    const runs = dentureRuns(order, buildMouthVisuals(entries));
    expect(runs.map((run) => run.teeth)).toEqual([[16, 15], [13]]);
  });
});
