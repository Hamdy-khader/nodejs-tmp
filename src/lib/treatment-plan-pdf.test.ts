import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanSettings } from "@/lib/plan-settings-store";

const mocks = vi.hoisted(() => ({
  html2canvas: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}));

vi.mock("html2canvas-pro", () => ({ default: mocks.html2canvas }));
vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => ({
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
    addImage: mocks.addImage,
    addPage: mocks.addPage,
    save: mocks.save,
  })),
}));

import { saveTreatmentPlanPdf } from "@/lib/treatment-plan-pdf";

describe("treatment plan PDF export", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.html2canvas.mockResolvedValue({
      width: 595,
      height: 842,
      toDataURL: () => "data:image/png;base64,page",
    });
  });

  it("exports every part of long treatment content at its original aspect ratio", async () => {
    mocks.html2canvas.mockResolvedValueOnce({ width: 595, height: 1900 });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,slice",
    );
    const page = document.createElement("article");
    await saveTreatmentPlanPdf({
      fileName: "long.pdf",
      pageElements: [page],
      settings: { pageSize: "A4" } as PlanSettings,
    });
    expect(mocks.addImage).toHaveBeenCalledTimes(3);
    expect(mocks.addPage).toHaveBeenCalledTimes(2);
    expect(drawImage.mock.calls.map((call) => [call[2], call[4]])).toEqual([
      [0, 842],
      [842, 842],
      [1684, 216],
    ]);
    expect(mocks.addImage.mock.calls[2][5]).toBe(216);
  });

  it("captures the original styled page without stripping its classes, content, or SVG", async () => {
    const page = document.createElement("article");
    page.className = "grid grid-cols-4 bg-white";
    page.innerHTML = '<svg data-tooth-chart="true"></svg><p>Patient treatment content</p>';
    document.body.appendChild(page);

    await saveTreatmentPlanPdf({
      fileName: "treatment-plan.pdf",
      pageElements: [page],
      settings: { pageSize: "A4" } as PlanSettings,
    });

    expect(mocks.html2canvas).toHaveBeenCalledWith(
      page,
      expect.objectContaining({ backgroundColor: "#ffffff", scale: 2, useCORS: true }),
    );
    expect(page.className).toBe("grid grid-cols-4 bg-white");
    expect(page.querySelector('[data-tooth-chart="true"]')).not.toBeNull();
    expect(page.textContent).toContain("Patient treatment content");
    expect(mocks.addImage).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith("treatment-plan.pdf");

    page.remove();
  });
});
