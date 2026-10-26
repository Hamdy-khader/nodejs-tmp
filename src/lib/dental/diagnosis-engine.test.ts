import { describe, expect, it } from "vitest";
import {
  BRIDGE_PILLAR_MESSAGE,
  INLAY_TEETH_MESSAGE,
  SELECT_TOOTH_MESSAGE,
  applyDiagnosis,
  removeDiagnosis,
  setExtraDiagnosis,
  type StatusEntry,
} from "@/lib/dental/diagnosis-engine";

// Expected results below were recorded from the reference implementation by
// applying every diagnosis button to tooth 16 in a known starting state.
function tooth(toothId: number, ...stateIds: number[]): StatusEntry[] {
  return stateIds.map((stateId) => ({ toothId, stateId }));
}

function ids(entries: StatusEntry[], toothId: number) {
  return entries
    .filter((entry) => entry.toothId === toothId)
    .map((entry) => entry.stateId)
    .join(".");
}

function apply(start: StatusEntry[], teeth: number[], stateIds: number[], title?: string) {
  return applyDiagnosis(start, { teeth, stateIds, title, now: 1 });
}

const BUTTONS: [string, number[]][] = [
  ["2", [2]],
  ["1", [1]],
  ["30", [30]],
  ["16", [16]],
  ["28", [28]],
  ["415", [415]],
  ["29", [29]],
  ["419", [419]],
  ["417", [417]],
  ["418", [418]],
  ["4", [4]],
  ["5", [5]],
  ["18", [18]],
  ["3", [3]],
  ["201", [201]],
  ["7", [7]],
  ["34", [34]],
  ["11+13", [11, 13]],
  ["11+12", [11, 12]],
  ["9", [9]],
  ["26", [26]],
  ["300", [300]],
  ["401", [401]],
  ["413", [413]],
  ["412", [412]],
  ["208", [208]],
  ["31", [31]],
];

// Starting states: root treated tooth, crowned tooth, implant with healing screw.
const RECORDED: Record<string, [string, string, string]> = {
  "2": ["2", "2", "2"],
  "1": ["1", "1", "1"],
  "30": ["201.30", "30", "30"],
  "16": ["201.16", "16", "16"],
  "28": ["201.28", "28", "28"],
  "415": ["1.201.415", "19.9.415", "11.12.415"],
  "29": ["201.29", "29", "29"],
  "419": ["1.201.419", "19.9.419", "11.12.419"],
  "417": ["1.201.417", "19.9.417", "11.12.417"],
  "418": ["1.201.418", "19.9.418", "11.12.418"],
  "4": ["201.4", "4", "4"],
  "5": ["201.5", "5", "5"],
  "18": ["201.18", "18", "18"],
  "3": ["201.3", "3", "3"],
  "201": ["1.201", "201.19.9", "1.201"],
  "7": ["201.7", "7.9", "7"],
  "34": ["1.201.34", "34.19.9", "1.34"],
  "11+13": ["11.13", "11.13.9", "11.13"],
  "11+12": ["11.12", "11.12.9", "11.12"],
  "9": ["201.19.9", "19.9", "11.13.9"],
  "26": ["201.26", "26", "26"],
  "300": ["2.201.300", "2.19.9.300", "11.12.300"],
  "401": ["1.201.401", "19.9.401", "11.12.401"],
  "413": ["1.201.413", "19.9.413", "11.12.413"],
  "412": ["1.201.412", "19.9.412", "11.12.412"],
  "208": ["1.201.208", "19.9.208", "11.12.208"],
  "31": ["31", "31", "31"],
};

describe("applyDiagnosis on a tooth that already has findings", () => {
  const starts: [string, StatusEntry[]][] = [
    ["root treated", tooth(16, 1, 201)],
    ["crowned", tooth(16, 19, 9)],
    ["implant with healing screw", tooth(16, 11, 12)],
  ];
  for (const [label, stateIds] of BUTTONS) {
    starts.forEach(([startName, start], index) => {
      it(`${label} on a ${startName} tooth gives ${RECORDED[label][index]}`, () => {
        const result = apply(start, [16], stateIds, label === "208" ? "Cyst" : undefined);
        expect(result.applied).toBe(true);
        expect(ids(result.entries, 16)).toBe(RECORDED[label][index]);
      });
    });
  }
});

describe("applyDiagnosis on intact and simple teeth", () => {
  const cases: [string, StatusEntry[], number[], string][] = [
    ["caries on an intact tooth", tooth(16, 1), [3], "3"],
    ["root treatment keeps the natural tooth", tooth(16, 1), [201], "1.201"],
    ["crown files the tooth", tooth(16, 1), [9], "19.9"],
    ["dentures mark a natural tooth missing", tooth(16, 1), [300], "2.300"],
    ["root treatment on a missing tooth restores it", tooth(16, 2), [201], "1.201"],
    ["a pin on a missing tooth restores it", tooth(16, 2), [34], "1.34"],
    ["crown on a missing tooth", tooth(16, 2), [9], "19.9"],
    ["dentures over a missing tooth", tooth(16, 2), [300], "2.300"],
    ["amalgam next to a discoloration", tooth(16, 30), [4], "30.4"],
    ["caries next to a discoloration", tooth(16, 30), [3], "30.3"],
    ["root treatment goes before a crown finding", tooth(16, 30), [201], "201.30"],
    ["dentures over a discolored tooth", tooth(16, 30), [300], "2.30.300"],
    ["radix keeps a root finding first", tooth(16, 1, 415), [29], "415.29"],
    ["missing keeps a root finding", tooth(16, 1, 415), [2], "2.415"],
    ["a pin keeps the root finding last", tooth(16, 1, 415), [34], "1.34.415"],
  ];
  for (const [name, start, stateIds, expected] of cases) {
    it(name, () => expect(ids(apply(start, [16], stateIds).entries, 16)).toBe(expected));
  }
});

describe("bridges", () => {
  it("files every pillar and keeps the missing tooth as a pontic", () => {
    const start = [...tooth(14, 1), ...tooth(15, 2), ...tooth(16, 1)];
    const result = apply(start, [14, 15, 16], [15]);
    expect([14, 15, 16].map((t) => ids(result.entries, t))).toEqual(["19.15", "2.15", "19.15"]);
    expect(result.message).toBeUndefined();
  });

  it("rests on an implant with its abutment", () => {
    const start = [...tooth(14, 1), ...tooth(15, 2), ...tooth(16, 11, 13)];
    const result = apply(start, [14, 15, 16], [15]);
    expect(ids(result.entries, 16)).toBe("11.13.15");
  });

  it("replaces a crown, a radix and dentures", () => {
    const start = [...tooth(14, 2, 300), ...tooth(15, 29), ...tooth(16, 19, 9)];
    const result = apply(start, [14, 15, 16], [15]);
    expect([14, 15, 16].map((t) => ids(result.entries, t))).toEqual(["2.15", "19.15", "19.15"]);
  });

  it("warns but still applies without two pillars", () => {
    const start = [...tooth(14, 2), ...tooth(15, 2), ...tooth(16, 1)];
    const result = apply(start, [14, 15, 16], [15]);
    expect(result.applied).toBe(true);
    expect(result.message).toBe(BRIDGE_PILLAR_MESSAGE);
  });
});

describe("validation and placement", () => {
  it("refuses an inlay on a front tooth", () => {
    const start = tooth(11, 1);
    const result = apply(start, [11], [18]);
    expect(result.applied).toBe(false);
    expect(result.message).toBe(INLAY_TEETH_MESSAGE);
    expect(result.entries).toBe(start);
  });

  it("refuses the whole selection when one tooth cannot take an inlay", () => {
    expect(apply([...tooth(13, 1), ...tooth(14, 1)], [13, 14], [18]).applied).toBe(false);
  });

  it("asks for a tooth before applying a tooth state", () => {
    const result = apply(tooth(16, 1), [], [3]);
    expect(result).toMatchObject({ applied: false, message: SELECT_TOOTH_MESSAGE });
  });

  it("puts a whole-mouth finding on tooth 0 when nothing is selected", () => {
    const result = apply(tooth(16, 1), [], [401]);
    expect(ids(result.entries, 0)).toBe("401");
    expect(ids(result.entries, 16)).toBe("1");
  });

  it("attaches a whole-mouth finding to the selected teeth", () => {
    const result = apply([...tooth(16, 1), ...tooth(26, 1)], [16, 26], [401]);
    expect([ids(result.entries, 16), ids(result.entries, 26), ids(result.entries, 0)]).toEqual([
      "1.401",
      "1.401",
      "",
    ]);
  });

  it("titles a custom finding with the typed text", () => {
    const result = apply(tooth(16, 1), [16], [208], "Cyst");
    expect(result.entries.find((entry) => entry.stateId === 208)?.title).toBe("Cyst");
  });
});

describe("drifted teeth", () => {
  const mouth = () => [...tooth(15, 1), ...tooth(16, 1), ...tooth(17, 1)];

  it("moves forward and leaves the old place missing", () => {
    const result = apply(mouth(), [16], [420]);
    expect([15, 16, 17].map((t) => ids(result.entries, t))).toEqual(["1.420", "2", "1"]);
    expect(result.entries.find((entry) => entry.stateId === 420)?.title).toBe("Drifted (16 → 15)");
  });

  it("moves back", () => {
    const result = apply(mouth(), [16], [421]);
    expect([15, 16, 17].map((t) => ids(result.entries, t))).toEqual(["1", "2", "1.421"]);
  });

  it("crosses the midline", () => {
    const result = apply([...tooth(11, 1), ...tooth(21, 1)], [11], [420]);
    expect(result.entries.find((entry) => entry.stateId === 420)).toMatchObject({
      toothId: 21,
      title: "Drifted (11 → 21)",
    });
  });

  it("stays on the last tooth when drifting back", () => {
    const result = apply(tooth(18, 1), [18], [421]);
    expect(ids(result.entries, 18)).toBe("2.421");
  });
});

describe("editing chips", () => {
  it("removes the filing together with its crown", () => {
    const entries = tooth(16, 201, 19, 9);
    const crown = entries[2];
    expect(ids(removeDiagnosis(entries, crown), 16)).toBe("201");
  });

  it("stores picked details on the chip title", () => {
    const { entries, ts } = apply(tooth(16, 1), [16], [3]);
    const next = setExtraDiagnosis(entries, { ts, stateId: 3, teeth: [16] }, ["M", "O"], " - M, O");
    expect(next.find((entry) => entry.stateId === 3)).toMatchObject({
      title: "Caries - M, O",
      baseTitle: "Caries",
      extraDiagnosis: "M,O",
    });
  });
});
