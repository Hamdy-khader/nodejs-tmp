import { loadImage } from "./image-resize";

export interface ImageAdjust {
  zoom: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  /** Clockwise, in quarter turns: 0, 90, 180 or 270. */
  rotation: number;
  /** How far the image was dragged, in pixels of the visible frame. */
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_XRAY_ADJUST: ImageAdjust = {
  zoom: 100,
  brightness: 100,
  contrast: 100,
  invert: false,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

export interface XrayViewport {
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

// Match the centered CSS scale, including clipping at the visible frame edges.
export function xrayRenderGeometry(
  view: XrayViewport,
  naturalWidth: number,
  zoom: number,
  offset: { x: number; y: number } = { x: 0, y: 0 },
) {
  if (Math.min(view.width, view.height, view.imageWidth, view.imageHeight, naturalWidth) <= 0) {
    throw new Error("Wait for the X-ray to load before saving.");
  }
  const resolution = Math.min(naturalWidth / view.imageWidth, 4096 / Math.max(view.width, view.height));
  const width = Math.max(1, Math.round(view.width * resolution));
  const height = Math.max(1, Math.round(view.height * resolution));
  const imageWidth = view.imageWidth * (zoom / 100) * resolution;
  const imageHeight = view.imageHeight * (zoom / 100) * resolution;
  return {
    width,
    height,
    imageWidth,
    imageHeight,
    x: (width - imageWidth) / 2 + offset.x * resolution,
    y: (height - imageHeight) / 2 + offset.y * resolution,
  };
}

/** The CSS that shows an adjustment on screen, matching what saving bakes in. */
export function xrayStyle(adjust: ImageAdjust) {
  return {
    filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%)${adjust.invert ? " invert(1)" : ""}`,
    transform: `translate(${adjust.offsetX}px, ${adjust.offsetY}px) rotate(${adjust.rotation}deg) scale(${adjust.zoom / 100})`,
    transformOrigin: "center center",
  };
}

export async function renderXrayImage(source: Blob, adjust: ImageAdjust, view: XrayViewport): Promise<File> {
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const geometry = xrayRenderGeometry(view, image.naturalWidth, adjust.zoom, {
      x: adjust.offsetX ?? 0,
      y: adjust.offsetY ?? 0,
    });
    const canvas = document.createElement("canvas");
    canvas.width = geometry.width;
    canvas.height = geometry.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image editing is unavailable in this browser.");
    if (adjust.rotation % 360) {
      // Turn around the image centre, as the CSS rotate does on screen.
      context.save();
      context.translate(geometry.x + geometry.imageWidth / 2, geometry.y + geometry.imageHeight / 2);
      context.rotate((adjust.rotation * Math.PI) / 180);
      context.drawImage(image, -geometry.imageWidth / 2, -geometry.imageHeight / 2, geometry.imageWidth, geometry.imageHeight);
      context.restore();
    } else {
      context.drawImage(image, geometry.x, geometry.y, geometry.imageWidth, geometry.imageHeight);
    }
    // Apply CSS brightness, contrast and invert to the pixels, including browsers without canvas.filter.
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const brightness = adjust.brightness / 100;
    const contrast = adjust.contrast / 100;
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        const bright = Math.min(255, pixels.data[i + channel] * brightness);
        const value = Math.min(255, Math.max(0, (bright - 127.5) * contrast + 127.5));
        pixels.data[i + channel] = adjust.invert ? 255 - value : value;
      }
    }
    context.putImageData(pixels, 0, 0);
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#0e1216";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Could not render the edited image.")), "image/png",
    ));
    if (blob.size > 10 * 1024 * 1024) throw new Error("The edited image exceeds 10 MB. Reduce the image size and try again.");
    return new File([blob], "xray-edited.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
