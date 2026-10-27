export interface ResizeOptions {
  /** The longest side of the result, in pixels. */
  maxSize: number;
  /** PNG keeps transparency (logos); JPEG keeps photos small (covers). */
  type: "image/jpeg" | "image/png";
  quality?: number;
}

/**
 * Loads an image for drawing on a canvas. Waits for the load event rather than
 * decode(), which some browsers hold back while the page is not painted.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the image."));
    image.src = url;
  });
}

/** The size an image is drawn at so its longest side fits `maxSize`. */
export function fitWithin(width: number, height: number, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Shrinks a picked image before it is uploaded, so the PDF stays light. A file
 * that already fits and has the wanted type is sent as it is.
 */
export async function resizeImage(file: File, { maxSize, type, quality = 0.88 }: ResizeOptions): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const size = fitWithin(image.naturalWidth, image.naturalHeight, maxSize);
    if (file.type === type && size.width === image.naturalWidth && size.height === image.naturalHeight) {
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    if (type === "image/jpeg") {
      // JPEG has no transparency; keep transparent areas white, not black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(image, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/png" ? ".png" : ".jpg");
    return new File([blob], name, { type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
