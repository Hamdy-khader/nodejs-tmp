import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { adminApi, adminTokenStore, clinicApi, clinicTokenStore } from "@/lib/admin/api";
import { Route as rootRoute } from "@/routes/__root";

vi.mock("@/components/admin/AdminLayout", () => ({ AdminShell: ({ children }: any) => children }));
vi.mock("@/components/AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("@/components/PatientTabs", () => ({ PatientTabs: () => null }));
vi.mock("@/components/ui/sidebar", () => ({ SidebarProvider: ({ children }: any) => children, SidebarTrigger: () => null }));
vi.mock("@/lib/admin/api", async (original) => {
  const actual = await original<typeof import("@/lib/admin/api")>();
  return { ...actual, adminApi: { ...actual.adminApi, me: vi.fn() }, clinicApi: { ...actual.clinicApi, me: vi.fn() } };
});

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});
afterEach(cleanup);

function setup(kind: "admin" | "clinic", path: string) {
  const login = vi.fn(() => <div>Login form</div>);
  const dashboard = vi.fn(() => <div>Dashboard content</div>);
  const loginPath = `/${kind}/login`;
  const dashboardPath = kind === "admin" ? "/admin/dashboard" : "/clinic";
  const routeTree = rootRoute.addChildren([
    createRoute({ getParentRoute: () => rootRoute, path: loginPath, component: login }),
    createRoute({ getParentRoute: () => rootRoute, path: dashboardPath, component: dashboard }),
  ]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }), context: { queryClient: new QueryClient() } });
  render(<RouterProvider router={router} />);
  return { router, login, dashboard, loginPath, dashboardPath };
}

it.each(["admin", "clinic"] as const)("never mounts the %s login form while validating or redirecting a valid session", async (kind) => {
  const store = kind === "admin" ? adminTokenStore : clinicTokenStore;
  const api = kind === "admin" ? adminApi : clinicApi;
  store.set("test-session");
  let resolve!: (value: any) => void;
  vi.mocked(api.me).mockReturnValue(new Promise((r) => { resolve = r; }));
  const { login, dashboard, router, dashboardPath } = setup(kind, `/${kind}/login`);
  await waitFor(() => expect(api.me).toHaveBeenCalled());
  expect(login).not.toHaveBeenCalled();
  expect(dashboard).not.toHaveBeenCalled();
  await act(async () => resolve({ id: 1 }));
  await screen.findByText("Dashboard content");
  expect(router.state.location.pathname).toBe(dashboardPath);
  expect(login).not.toHaveBeenCalled();
});

it.each(["admin", "clinic"] as const)("never mounts the %s dashboard for a rejected session", async (kind) => {
  const api = kind === "admin" ? adminApi : clinicApi;
  const store = kind === "admin" ? adminTokenStore : clinicTokenStore;
  store.set("expired-session");
  vi.mocked(api.me).mockRejectedValue(new Error("Expired"));
  const { dashboard, router, loginPath } = setup(kind, kind === "admin" ? "/admin/dashboard" : "/clinic");
  await screen.findByText("Login form");
  expect(router.state.location.pathname).toBe(loginPath);
  expect(dashboard).not.toHaveBeenCalled();
});

it.each(["admin", "clinic"] as const)("keeps a new %s session pending instead of redirecting back to login", async (kind) => {
  const api = kind === "admin" ? adminApi : clinicApi;
  const store = kind === "admin" ? adminTokenStore : clinicTokenStore;
  const { dashboard, router, dashboardPath } = setup(kind, `/${kind}/login`);
  await screen.findByText("Login form");
  let resolve!: (value: any) => void;
  vi.mocked(api.me).mockReturnValue(new Promise((r) => { resolve = r; }));
  await act(async () => { store.set("new-session"); await router.navigate({ to: dashboardPath }); });
  expect(router.state.location.pathname).toBe(dashboardPath);
  expect(dashboard).not.toHaveBeenCalled();
  expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  await act(async () => resolve({ id: 1 }));
  await screen.findByText("Dashboard content");
});


it.each(["admin", "clinic"] as const)("redirects a signed-out %s visitor without mounting the dashboard", async (kind) => {
  const { dashboard, router, loginPath } = setup(kind, kind === "admin" ? "/admin/dashboard" : "/clinic");
  await screen.findByText("Login form");
  expect(router.state.location.pathname).toBe(loginPath);
  expect(dashboard).not.toHaveBeenCalled();
});
