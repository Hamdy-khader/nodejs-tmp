import { afterEach, describe, expect, it, vi } from "vitest";
import { fitWithin, resizeImage } from "./image-resize";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockImage(width: number, height: number) {
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLImageElement.prototype, "naturalHeight", "get").mockReturnValue(height);
  // jsdom never loads images; fire the load event as soon as a source is set.
  vi.spyOn(HTMLImageElement.prototype, "src", "set").mockImplementation(function (this: HTMLImageElement) {
    queueMicrotask(() => this.onload?.(new Event("load")));
  });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: () => "blob:picked", revokeObjectURL: revoke });
  const context = { drawImage: vi.fn(), fillRect: vi.fn(), fillStyle: "" };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => callback(new Blob(["small"], { type })));
  return { context, revoke };
}

describe("image resizing before upload", () => {
  it("fits the longest side and never enlarges", () => {
    expect(fitWithin(4000, 3000, 1754)).toEqual({ width: 1754, height: 1316 });
    expect(fitWithin(1000, 3000, 1754)).toEqual({ width: 585, height: 1754 });
    expect(fitWithin(800, 600, 1754)).toEqual({ width: 800, height: 600 });
  });

  it("shrinks a large photo to a JPEG cover on a white background", async () => {
    const { context, revoke } = mockImage(4000, 3000);
    const file = await resizeImage(new File(["big"], "cover.png", { type: "image/png" }), { maxSize: 1754, type: "image/jpeg" });
    expect(file).toMatchObject({ name: "cover.jpg", type: "image/jpeg" });
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1754, 1316);
    expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), 0, 0, 1754, 1316);
    expect(revoke).toHaveBeenCalledWith("blob:picked");
  });

  it("sends a small file of the right type unchanged", async () => {
    const { context } = mockImage(400, 120);
    const original = new File(["logo"], "logo.png", { type: "image/png" });
    expect(await resizeImage(original, { maxSize: 600, type: "image/png" })).toBe(original);
    expect(context.drawImage).not.toHaveBeenCalled();
  });
});
