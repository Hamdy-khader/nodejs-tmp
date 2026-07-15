import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToothNumberTable } from "@/components/ToothNumberTable";

describe("ToothNumberTable", () => {
  it("renders all 32 FDI tooth numbers and highlights treated teeth", () => {
    render(<ToothNumberTable treatmentCounts={{ 12: 1, 46: 2 }} />);

    expect(screen.getAllByRole("cell")).toHaveLength(32);
    expect(screen.getByText("12")).toHaveClass("bg-emerald-100");
    expect(screen.getByText("46")).toHaveClass("bg-emerald-100");
  });
});
