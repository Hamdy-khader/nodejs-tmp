import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClinicForm } from "./ClinicForm";
import { adminApi } from "@/lib/admin/api";

vi.mock("@/lib/admin/api", () => ({ ApiError: class extends Error {}, adminApi: {
  clinics: { create: vi.fn(), get: vi.fn(), update: vi.fn() }, clinicUsers: { create: vi.fn() },
} }));
const clinic = { id: 42, name: "QA Clinic", email: "qa@example.com", status: "active" };
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(adminApi.clinics.create).mockResolvedValue(clinic as never);
  vi.mocked(adminApi.clinics.get).mockResolvedValue(clinic as never);
  vi.mocked(adminApi.clinics.update).mockResolvedValue(clinic as never);
});

it("validates required clinic fields and supports cancelling without writing", () => {
  const onCancel = vi.fn();
  render(<ClinicForm onSuccess={vi.fn()} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole("button", { name: "Create clinic" }));
  expect(screen.getByText("Clinic name is required")).toBeInTheDocument();
  expect(adminApi.clinics.create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledOnce();
});

it("creates a clinic and its first account with the server-assigned clinic ID", async () => {
  const onSuccess = vi.fn();
  const { container } = render(<ClinicForm onSuccess={onSuccess} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText("Bright Smile Dental"), { target: { value: clinic.name } });
  fireEvent.change(screen.getByPlaceholderText("hello@clinic.com"), { target: { value: clinic.email } });
  fireEvent.change(screen.getByPlaceholderText("Dr. Owner Name"), { target: { value: "QA Owner" } });
  fireEvent.change(screen.getByPlaceholderText("owner@clinic.com"), { target: { value: "owner@example.com" } });
  for (const input of container.querySelectorAll('input[type="password"]')) fireEvent.change(input, { target: { value: "Test-password-123" } });
  fireEvent.click(screen.getByRole("button", { name: "Create clinic" }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
  expect(adminApi.clinicUsers.create).toHaveBeenCalledWith(42, expect.objectContaining({ email: "owner@example.com" }));
});

it("updates an existing clinic without creating another clinic or user", async () => {
  const onSuccess = vi.fn();
  render(<ClinicForm clinicId={42} onSuccess={onSuccess} onCancel={vi.fn()} />);
  fireEvent.change(await screen.findByDisplayValue("QA Clinic"), { target: { value: "Edited clinic" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
  expect(adminApi.clinics.update).toHaveBeenCalledWith(42, expect.objectContaining({ name: "Edited clinic" }));
  expect(adminApi.clinics.create).not.toHaveBeenCalled();
  expect(adminApi.clinicUsers.create).not.toHaveBeenCalled();
});

it("keeps edits available for retry after a failed save", async () => {
  vi.mocked(adminApi.clinics.update).mockRejectedValueOnce(new Error("Offline"));
  const onSuccess = vi.fn();
  render(<ClinicForm clinicId={42} onSuccess={onSuccess} onCancel={vi.fn()} />);
  fireEvent.change(await screen.findByDisplayValue("QA Clinic"), { target: { value: "Keep my edits" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("An unexpected error occurred.");
  expect(screen.getByDisplayValue("Keep my edits")).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(42));
});
