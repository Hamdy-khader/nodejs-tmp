import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicUsersPanel } from "./ClinicUsersPanel";
import { adminApi } from "@/lib/admin/api";

vi.mock("@/lib/admin/api", () => ({
  ApiError: class extends Error {},
  adminApi: { clinicUsers: { list: vi.fn(), update: vi.fn(), create: vi.fn(), activate: vi.fn(), deactivate: vi.fn(), delete: vi.fn() } },
}));
const user = { id: 12, full_name: "Clinic Owner", email: "owner@example.com", phone: "123", role: "clinic_owner", status: "active", created_at: "2026-01-01" };
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(adminApi.clinicUsers.list).mockResolvedValue({ data: [user], meta: { total: 1 } } as never);
  vi.mocked(adminApi.clinicUsers.update).mockResolvedValue(user as never);
});

describe("ClinicUsersPanel", () => {
  it("creates a user, sends the clinic ID and reloads the list", async () => {
    const { container } = render(<ClinicUsersPanel clinicId={42} />);
    await screen.findByText("owner@example.com");
    fireEvent.click(screen.getByRole("button", { name: "+ Add User" }));
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "QA Staff" } });
    fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: "staff@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Test-password-123" } });
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "Test-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    await waitFor(() => expect(adminApi.clinicUsers.create).toHaveBeenCalledWith(42, expect.objectContaining({ email: "staff@example.com" })));
    await waitFor(() => expect(adminApi.clinicUsers.list).toHaveBeenCalledTimes(2));
  });
  it("deactivates and reactivates the selected user", async () => {
    render(<ClinicUsersPanel clinicId={42} />);
    await screen.findByText("owner@example.com");
    vi.mocked(adminApi.clinicUsers.list).mockResolvedValue({ data: [{ ...user, status: "inactive" }], meta: { total: 1 } } as never);
    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    fireEvent.click(await screen.findByRole("button", { name: "Activate" }));
    await waitFor(() => expect(adminApi.clinicUsers.activate).toHaveBeenCalledWith(12));
    expect(adminApi.clinicUsers.deactivate).toHaveBeenCalledWith(12);
  });
  it("requires confirmation before deletion and preserves the user when deletion fails", async () => {
    const { container } = render(<ClinicUsersPanel clinicId={42} />);
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(adminApi.clinicUsers.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(adminApi.clinicUsers.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    vi.mocked(adminApi.clinicUsers.delete).mockRejectedValueOnce(new Error("Offline"));
    fireEvent.click(container.querySelector<HTMLButtonElement>('.adm-modal-footer .adm-btn.danger')!);
    await waitFor(() => expect(adminApi.clinicUsers.delete).toHaveBeenCalledWith(12));
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('.adm-modal-footer .adm-btn.danger')).not.toBeDisabled());
    vi.mocked(adminApi.clinicUsers.delete).mockResolvedValue(undefined);
    fireEvent.click(container.querySelector<HTMLButtonElement>('.adm-modal-footer .adm-btn.danger')!);
    await waitFor(() => expect(adminApi.clinicUsers.list).toHaveBeenCalledTimes(2));
  });
  it("loads the selected clinic and saves details without replacing an unchanged password", async () => {
    render(<ClinicUsersPanel clinicId={42} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit / Password" }));
    expect(adminApi.clinicUsers.list).toHaveBeenCalledWith(42, expect.anything());
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "New owner" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(adminApi.clinicUsers.update).toHaveBeenCalledWith(12, expect.objectContaining({ full_name: "New owner" })));
    expect(vi.mocked(adminApi.clinicUsers.update).mock.calls[0][1]).not.toHaveProperty("password");
  });
  it("rejects mismatched passwords then saves a matching new password", async () => {
    render(<ClinicUsersPanel clinicId={42} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit / Password" }));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(adminApi.clinicUsers.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "new-password-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(adminApi.clinicUsers.update).toHaveBeenCalledWith(12, expect.objectContaining({ password: "new-password-123", confirm_password: "new-password-123" })));
  });
  it("shows a retry when users cannot load", async () => {
    vi.mocked(adminApi.clinicUsers.list).mockRejectedValueOnce(new Error("Offline"));
    render(<ClinicUsersPanel clinicId={42} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByText("owner@example.com")).toBeInTheDocument();
  });
});
