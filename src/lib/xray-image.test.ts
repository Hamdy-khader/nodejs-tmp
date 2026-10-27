import { describe, expect, it, vi, afterEach } from "vitest";
import { DEFAULT_XRAY_ADJUST, renderXrayImage, xrayRenderGeometry, xrayStyle } from "./xray-image";

afterEach(() => vi.restoreAllMocks());

function mockCanvas(data: number[]) {
  const pixels = { data: new Uint8ClampedArray(data) };
  const context = {
    drawImage: vi.fn(), getImageData: () => pixels, putImageData: vi.fn(), fillRect: vi.fn(),
    save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    globalCompositeOperation: "", fillStyle: "",
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["png"], { type: "image/png" })));
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(800);
  Object.defineProperty(HTMLImageElement.prototype, "decode", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: () => "blob:xray", revokeObjectURL: revoke });
  return { pixels, context, revoke };
}

describe("X-ray image rendering", () => {
  it("clips a centered zoom using the visible viewport at source resolution", () => {
    expect(xrayRenderGeometry({ width: 800, height: 600, imageWidth: 800, imageHeight: 400 }, 1600, 200))
      .toEqual({ width: 1600, height: 1200, imageWidth: 3200, imageHeight: 1600, x: -800, y: -200 });
  });
  it("keeps zoom-out margins and uses the fullscreen viewport dimensions", () => {
    expect(xrayRenderGeometry({ width: 1200, height: 900, imageWidth: 1200, imageHeight: 600 }, 1200, 50))
      .toEqual({ width: 1200, height: 900, imageWidth: 600, imageHeight: 300, x: 300, y: 300 });
  });
  it("moves the image by the dragged offset at source resolution", () => {
    expect(xrayRenderGeometry({ width: 800, height: 600, imageWidth: 800, imageHeight: 400 }, 1600, 100, { x: 40, y: -25 }))
      .toMatchObject({ x: 80, y: 150 });
  });
  it("bounds output size and rejects unloaded images", () => {
    expect(xrayRenderGeometry({ width: 800, height: 600, imageWidth: 800, imageHeight: 600 }, 10000, 300).width).toBe(4096);
    expect(() => xrayRenderGeometry({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 }, 0, 100)).toThrow();
  });
  it("shows the same adjustments on screen as CSS", () => {
    expect(xrayStyle({ ...DEFAULT_XRAY_ADJUST, zoom: 150, invert: true, rotation: 90, offsetX: 10, offsetY: -5 })).toEqual({
      filter: "brightness(100%) contrast(100%) invert(1)",
      transform: "translate(10px, -5px) rotate(90deg) scale(1.5)",
      transformOrigin: "center center",
    });
  });
  it("bakes crop, brightness and contrast into PNG pixels and releases the source URL", async () => {
    const { pixels, context, revoke } = mockCanvas([100, 150, 200, 255]);
    try {
      const file = await renderXrayImage(new Blob(), { ...DEFAULT_XRAY_ADJUST, zoom: 200, brightness: 50, contrast: 150 }, { width: 800, height: 600, imageWidth: 800, imageHeight: 600 });
      expect(file.type).toBe("image/png");
      expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), -400, -300, 1600, 1200);
      expect(context.rotate).not.toHaveBeenCalled();
      expect(Array.from(pixels.data)).toEqual([11, 49, 86, 255]);
      expect(context.globalCompositeOperation).toBe("destination-over");
      expect(revoke).toHaveBeenCalledWith("blob:xray");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("turns the image around its centre and inverts the pixels", async () => {
    const { pixels, context } = mockCanvas([100, 150, 200, 255]);
    try {
      await renderXrayImage(new Blob(), { ...DEFAULT_XRAY_ADJUST, rotation: 90, invert: true }, { width: 800, height: 600, imageWidth: 800, imageHeight: 600 });
      expect(context.translate).toHaveBeenCalledWith(400, 300);
      expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
      expect(context.drawImage).toHaveBeenCalledWith(expect.any(HTMLImageElement), -400, -300, 800, 600);
      expect(context.restore).toHaveBeenCalled();
      expect(Array.from(pixels.data)).toEqual([155, 105, 55, 255]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
