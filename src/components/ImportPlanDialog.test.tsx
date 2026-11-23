import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImportPlanDialog } from "./ImportPlanDialog";
import { ApiError, clinicApi } from "@/lib/admin/api";
import { patientsStore } from "@/lib/patients-store";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("previews before saving and invalidates review when the file changes", async () => {
  const analyze = vi.spyOn(clinicApi.plans, "importPdf").mockResolvedValue({ teeth: [{ tooth_number: 16, status: "bridge", note: "Missing , Bridge" }, { tooth_number: 22, status: "not-specified", note: "Not specified in source PDF" }], rows: [], currency_symbol: "$", total: 300, warnings: [] });
  const save = vi.spyOn(patientsStore, "importPdf").mockResolvedValue({ id: "42" } as never);
  const opened = vi.fn();
  render(<ImportPlanDialog patientId="7" patientName="Test Patient" onImported={opened} />);
  fireEvent.click(screen.getByText("Import PDF"));
  const file = new File(["%PDF"], "report.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText("Treatment report (PDF)"), { target: { files: [file] } });
  fireEvent.click(screen.getByText("Analyze PDF"));
  expect(await screen.findByText("Missing , Bridge")).toBeInTheDocument();
  expect(screen.getByText("Not specified in source PDF")).toBeInTheDocument();
  expect(analyze).toHaveBeenCalledWith("7", file, true);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByText("Save and open plan")).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Treatment report (PDF)"), { target: { files: [file] } });
  expect(screen.queryByText("Save and open plan")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Analyze PDF"));
  await screen.findByText("Save and open plan");
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("Save and open plan"));
  await waitFor(() => expect(opened).toHaveBeenCalledWith("42"));
});

it("shows extraction errors and allows another file without creating a plan", async () => {
  vi.spyOn(clinicApi.plans, "importPdf").mockRejectedValue(new ApiError("VALIDATION_ERROR", "Validation failed", 422, { file: ["Scanned PDF is not supported."] }));
  const save = vi.spyOn(patientsStore, "importPdf");
  render(<ImportPlanDialog patientId="7" patientName="Test Patient" onImported={vi.fn()} />);
  fireEvent.click(screen.getByText("Import PDF"));
  fireEvent.change(screen.getByLabelText("Treatment report (PDF)"), { target: { files: [new File(["x"], "scan.pdf")] } });
  fireEvent.click(screen.getByText("Analyze PDF"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Scanned PDF is not supported.");
  expect(screen.getByText("Analyze PDF")).toBeEnabled();
  expect(save).not.toHaveBeenCalled();
});

it("imports multiple PDFs separately, resets review and opens only after the batch", async () => {
  const preview = { teeth: [], rows: [], currency_symbol: "$", total: 0, warnings: [] };
  const analyze = vi.spyOn(clinicApi.plans, "importPdf").mockResolvedValue(preview);
  const save = vi.spyOn(patientsStore, "importPdf").mockResolvedValueOnce({ id: "41" } as never).mockResolvedValueOnce({ id: "42" } as never);
  const opened = vi.fn();
  render(<ImportPlanDialog patientId="7" patientName="Test Patient" onImported={opened} />);
  fireEvent.click(screen.getByText("Import PDF"));
  const files = [new File(["x"], "first.pdf"), new File(["x"], "second.pdf")];
  expect(screen.getByLabelText("Treatment report (PDF)")).toHaveAttribute("multiple");
  fireEvent.change(screen.getByLabelText("Treatment report (PDF)"), { target: { files } });
  for (const file of files) {
    fireEvent.click(screen.getByText("Analyze PDF"));
    await screen.findByText("Save and continue");
    expect(screen.getByText("Save and continue")).toBeDisabled();
    expect(analyze).toHaveBeenLastCalledWith("7", file, true);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Save and continue"));
    await waitFor(() => expect(screen.queryByText("Save and continue")).not.toBeInTheDocument());
    expect(save).toHaveBeenLastCalledWith("7", file, file.name.replace(".pdf", ""));
    expect(opened).not.toHaveBeenCalled();
  }
  expect(screen.getByText("2 saved · 0 skipped · 0 remaining")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Open last saved plan"));
  expect(opened).toHaveBeenCalledWith("42");
});

it("skips invalid files and preserves the current review after a save failure", async () => {
  vi.spyOn(clinicApi.plans, "importPdf").mockResolvedValue({ teeth: [], rows: [], total: 0, currency_symbol: "$", warnings: [] });
  const save = vi.spyOn(patientsStore, "importPdf").mockRejectedValueOnce(new Error("Upload failed")).mockResolvedValueOnce({ id: "42" } as never);
  render(<ImportPlanDialog patientId="7" patientName="Test Patient" onImported={vi.fn()} />);
  fireEvent.click(screen.getByText("Import PDF"));
  fireEvent.change(screen.getByLabelText("Treatment report (PDF)"), { target: { files: [new File(["x"], "wrong.txt"), new File(["x"], "valid.pdf")] } });
  fireEvent.click(screen.getByText("Analyze PDF"));
  expect(await screen.findByRole("alert")).toHaveTextContent("10 MB");
  fireEvent.click(screen.getByText("Skip this file"));
  fireEvent.click(screen.getByText("Analyze PDF"));
  await screen.findByText("Save and continue");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByText("Save and continue"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByText("0 saved · 1 skipped · 1 remaining")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Save and continue"));
  await screen.findByText("1 saved · 1 skipped · 0 remaining");
  expect(save).toHaveBeenCalledTimes(2);
});
