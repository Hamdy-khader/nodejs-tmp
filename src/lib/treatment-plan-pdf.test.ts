import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeColorValue } from "@/lib/treatment-plan-pdf";

describe("treatment plan PDF color sanitizing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("replaces modern colors even when their arguments contain nested functions", () => {
    const context = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "#000000",
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([12, 34, 56, 255]) })),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
      if (tagName !== "canvas") return originalCreateElement(tagName);
      return {
        width: 0,
        height: 0,
        getContext: () => context,
      } as unknown as HTMLCanvasElement;
    }) as typeof document.createElement);

    expect(
      sanitizeColorValue(
        "linear-gradient(oklab(from var(--brand) l a b / calc(50% + 10%)), color(display-p3 1 0 0))",
      ),
    ).toBe("linear-gradient(rgb(12, 34, 56), rgb(12, 34, 56))");
  });
});
