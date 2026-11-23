import type { StatusEntry } from "@/lib/dental/diagnosis-engine";

/** Regression case: mixed implant-supported bridges and an explicitly unspecified tooth. */
export function importedBridgeEntries(): StatusEntry[] {
  const teeth: Record<number, number[]> = {
    18: [2], 17: [11, 13, 15], 16: [2, 15], 15: [2, 15],
    14: [11, 13, 15], 13: [11, 13, 15], 12: [2, 15], 11: [11, 13, 15],
    21: [2], 22: [208], 23: [2], 24: [2], 25: [2], 26: [11, 13], 27: [11, 13], 28: [2],
    48: [2], 47: [1], 46: [1], 45: [1], 44: [1], 43: [11, 13, 15], 42: [2, 15], 41: [11, 13, 15],
    31: [11, 13, 15], 32: [2, 15], 33: [11, 13, 15], 34: [1], 35: [1], 36: [1], 37: [1], 38: [2],
  };
  return Object.entries(teeth).flatMap(([number, states]) => states.map((stateId) => ({
    toothId: Number(number), stateId,
    ...(stateId === 208 ? { title: "Not specified in source PDF", baseTitle: "Not specified in source PDF" } : {}),
  })));
}
