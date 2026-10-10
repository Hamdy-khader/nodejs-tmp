import { describe, expect, it, vi, afterEach } from "vitest";
import { renderXrayImage, xrayRenderGeometry } from "./xray-image";

afterEach(() => vi.restoreAllMocks());

describe("X-ray image rendering", () => {
  it("clips a centered zoom using the visible viewport at source resolution", () => {
    expect(xrayRenderGeometry({ width: 800, height: 600, imageWidth: 800, imageHeight: 400 }, 1600, 200))
      .toEqual({ width: 1600, height: 1200, imageWidth: 3200, imageHeight: 1600, x: -800, y: -200 });
  });
  it("keeps zoom-out margins and uses the fullscreen viewport dimensions", () => {
    expect(xrayRenderGeometry({ width: 1200, height: 900, imageWidth: 1200, imageHeight: 600 }, 1200, 50))
      .toEqual({ width: 1200, height: 900, imageWidth: 600, imageHeight: 300, x: 300, y: 300 });
  });
  it("bounds output size and rejects unloaded images", () => {
    expect(xrayRenderGeometry({ width: 800, height: 600, imageWidth: 800, imageHeight: 600 }, 10000, 300).width).toBe(4096);
    expect(() => xrayRenderGeometry({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 }, 0, 100)).toThrow();
  });
  it("bakes crop, brightness and contrast into PNG pixels and releases the source URL", async () => {
    const pixels = { data: new Uint8ClampedArray([100, 150, 200, 255]) };
    const context = { drawImage: vi.fn(), getImageData: () => pixels, putImageData: vi.fn(), fillRect: vi.fn(), globalCompositeOperation: "", fillStyle: "" };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(800);
    Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    const revoke = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:xray", revokeObjectURL: revoke });
    try {
      const file = await renderXrayImage(new Blob(), { zoom: 200, brightness: 50, contrast: 150 }, { width: 800, height: 600, imageWidth: 800, imageHeight: 600 });
      expect(file.type).toBe("image/png");
      expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), -400, -300, 1600, 1200);
      expect(Array.from(pixels.data)).toEqual([11, 49, 86, 255]);
      expect(context.globalCompositeOperation).toBe("destination-over");
      expect(revoke).toHaveBeenCalledWith("blob:xray");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
