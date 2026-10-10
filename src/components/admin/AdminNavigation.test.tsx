import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adminApi, adminTokenStore, clinicTokenStore } from "@/lib/admin/api";
import { routeTree } from "@/routeTree.gen";

vi.mock("@/lib/admin/api", async (original) => {
  const actual = await original<typeof import("@/lib/admin/api")>();
  return { ...actual,
    adminTokenStore: { ...actual.adminTokenStore, exists: vi.fn(), get: vi.fn() },
    clinicTokenStore: { ...actual.clinicTokenStore, exists: vi.fn() },
    adminApi: { ...actual.adminApi,
    me: vi.fn(), logout: vi.fn(), dashboard: vi.fn(),
    clinics: { ...actual.adminApi.clinics, list: vi.fn(), get: vi.fn(), suspend: vi.fn(), activate: vi.fn(), delete: vi.fn() },
    clinicUsers: { ...actual.adminApi.clinicUsers, list: vi.fn() },
  } };
});
const clinic = { id: 42, name: "Navigation Clinic", email: "qa@example.com", status: "active", created_at: "2026-01-01", users_count: 0 };
afterEach(cleanup);
beforeEach(() => {
  vi.mocked(adminTokenStore.exists).mockReturnValue(true);
  vi.mocked(adminTokenStore.get).mockReturnValue("test-session");
  vi.mocked(clinicTokenStore.exists).mockReturnValue(false);
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.mocked(adminApi.me).mockResolvedValue({ id: 1, name: "QA Admin", email: "qa-admin@example.com", status: "active" } as never);
  vi.mocked(adminApi.dashboard).mockResolvedValue({ totalClinics: 1, activeClinics: 1 } as never);
  vi.mocked(adminApi.clinics.list).mockResolvedValue({ data: [clinic], meta: { total: 1 } } as never);
  vi.mocked(adminApi.clinics.get).mockResolvedValue(clinic as never);
  vi.mocked(adminApi.clinicUsers.list).mockResolvedValue({ data: [], meta: { total: 0 } } as never);
});

it("retains the same sidebar and header across every admin page and validates the session only once", async () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() }, history: createMemoryHistory({ initialEntries: ["/admin/dashboard"] }) });
  const { container } = render(<RouterProvider router={router} />);
  await screen.findByText("QA Admin");
  const sidebar = container.querySelector(".adm-sidebar");
  const header = container.querySelector(".adm-topbar");
  expect(sidebar).not.toBeNull();
  for (const path of ["/admin/clinics", "/admin/clinics/create", "/admin/subscriptions", "/admin/financial",
    "/admin/users", "/admin/support-center", "/admin/branch-statistics", "/admin/backups", "/admin/settings",
    "/admin/clinics/42", "/admin/clinics/42/edit", "/admin/clinics/42/users", "/admin/dashboard"]) {
    await act(async () => { await router.navigate({ to: path }); });
    await waitFor(() => expect(router.state.location.pathname).toBe(path));
    expect(container.querySelector(".adm-sidebar")).toBe(sidebar);
    expect(container.querySelector(".adm-topbar")).toBe(header);
    expect(container.querySelectorAll(".adm-layout")).toHaveLength(1);
    expect(screen.queryByText("This page didn't load")).not.toBeInTheDocument();
  }
  expect(adminApi.me).toHaveBeenCalledTimes(1);
});

it("searches and filters clinics, confirms suspension and activation, and cancels or confirms deletion", async () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() }, history: createMemoryHistory({ initialEntries: ["/admin/clinics"] }) });
  const { container } = render(<RouterProvider router={router} />);
  await screen.findByText("qa@example.com");
  fireEvent.change(screen.getByPlaceholderText("Search by clinic name, owner, email, or phone..."), { target: { value: "Navigation" } });
  await waitFor(() => expect(adminApi.clinics.list).toHaveBeenCalledWith(expect.objectContaining({ q: "Navigation" })));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "active" } });
  await waitFor(() => expect(adminApi.clinics.list).toHaveBeenCalledWith(expect.objectContaining({ status: "active" })));
  fireEvent.click(await screen.findByRole("button", { name: "Suspend" }));
  expect(adminApi.clinics.suspend).not.toHaveBeenCalled();
  vi.mocked(adminApi.clinics.list).mockResolvedValue({ data: [{ ...clinic, status: "suspended" }], meta: { total: 1 } } as never);
  fireEvent.click(container.querySelector<HTMLButtonElement>('.adm-modal-footer .adm-btn.danger')!);
  fireEvent.click(await screen.findByRole("button", { name: "Activate" }));
  expect(adminApi.clinics.suspend).toHaveBeenCalledWith(42);
  vi.mocked(adminApi.clinics.list).mockResolvedValue({ data: [clinic], meta: { total: 1 } } as never);
  fireEvent.click(container.querySelector<HTMLButtonElement>('.adm-modal-footer .adm-btn.primary')!);
  await screen.findByRole("button", { name: "Suspend" });
  expect(adminApi.clinics.activate).toHaveBeenCalledWith(42);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(adminApi.clinics.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  vi.mocked(adminApi.clinics.list).mockResolvedValue({ data: [], meta: { total: 0 } } as never);
  fireEvent.click(container.querySelector<HTMLButtonElement>('.adm-modal-footer .adm-btn.danger')!);
  await screen.findByText("No clinics found.");
  expect(adminApi.clinics.delete).toHaveBeenCalledWith(42);
});

it("redirects a rejected session without mounting protected admin pages", async () => {
  vi.mocked(adminApi.me).mockRejectedValue(new Error("Session expired"));
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() }, history: createMemoryHistory({ initialEntries: ["/admin/clinics"] }) });
  const { container } = render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.location.pathname).toBe("/admin/login"));
  await screen.findByRole("button", { name: "Sign in to Admin Panel" });
  expect(container.querySelector(".adm-sidebar")).not.toBeInTheDocument();
  expect(adminApi.clinics.list).not.toHaveBeenCalled();
});
