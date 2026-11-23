import { describe, expect, it } from "vitest";
import type { StatusEntry } from "@/lib/dental/diagnosis-engine";
import { importedBridgeEntries } from "@/test/fixtures/imported-bridge-chart";
import { entriesFromApi, entriesToApi } from "./plan-diagnosis";
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
  it("leaves an explicitly unspecified source cell blank, including after save/reload", () => {
    const entries = importedBridgeEntries().filter((entry) => entry.toothId === 22);
    const reloaded = entriesFromApi(22, entriesToApi(entries));
    expect(buildToothVisual(22, reloaded)).toMatchObject({ present: false, naturalRoot: false, crown: { shape: "none" }, marker: "none" });
    expect(buildToothVisual(22, reloaded, plan(22, 11, 13, 9))).toMatchObject({
      present: true, implant: { planned: true }, abutment: { planned: true }, crown: { fill: "planned" }, marker: "planned",
    });
    expect(buildToothVisual(22, [...reloaded, at(22, 1)])).toMatchObject({ present: true, naturalRoot: true, marker: "none" });
  });

  it("does not hide natural teeth for ordinary custom findings", () => {
    expect(buildToothVisual(22, [{ toothId: 22, stateId: 208, title: "Review mobility" }])).toMatchObject({ present: true, naturalRoot: true, marker: "status" });
  });

  it("retains every support, pontic and bridge connection in the imported full-mouth case", () => {
    const visuals = buildMouthVisuals(importedBridgeEntries());
    for (const tooth of [11, 13, 14, 17, 31, 33, 41, 43]) {
      expect(visuals[tooth]).toMatchObject({ naturalRoot: false, implant: { planned: false }, abutment: { planned: false }, bridge: { pontic: false } });
    }
    for (const tooth of [12, 15, 16, 32, 42]) {
      expect(visuals[tooth]).toMatchObject({ naturalRoot: false, bridge: { pontic: true } });
      expect(visuals[tooth].implant).toBeUndefined();
    }
    expect(bridgeConnectors([18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28], visuals)).toHaveLength(6);
    expect(bridgeConnectors([48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38], visuals)).toHaveLength(5);
  });
  it("hides a missing tooth and leaves its number plain", () => {
    expect(buildToothVisual(16, [at(16, 2)])).toMatchObject({ present: false, marker: "none" });
  });

  it("draws one caries spot per picked surface", () => {
    const visual = buildToothVisual(16, [at(16, 3, "M,O")]);
    expect(visual.spots).toEqual([
      { kind: "caries", surface: "M", planned: false, detailed: true },
      { kind: "caries", surface: "O", planned: false, detailed: true },
    ]);
    expect(visual.marker).toBe("detailed");
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
