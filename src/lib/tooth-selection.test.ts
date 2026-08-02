import { describe, expect, it } from "vitest";
import { toggleToothSelection } from "@/lib/tooth-selection";

describe("toggleToothSelection", () => {
  it("keeps earlier teeth selected when another tooth is added", () => {
    expect(toggleToothSelection([11], 47)).toEqual([11, 47]);
  });

  it("only removes the tooth that is clicked again", () => {
    expect(toggleToothSelection([11, 24, 47], 24)).toEqual([11, 47]);
  });
});
