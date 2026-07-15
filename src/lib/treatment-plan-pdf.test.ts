import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.html2canvas.mockResolvedValue({ toDataURL: () => "data:image/png;base64,page" });
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
