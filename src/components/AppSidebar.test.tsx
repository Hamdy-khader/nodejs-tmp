import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => "/patients",
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("@/lib/admin/api", () => ({ clinicApi: { logout: vi.fn() } }));
afterEach(cleanup);

it("keeps all dashboard sections reachable and can close and reopen the sidebar", () => {
  const { container } = render(<SidebarProvider><AppSidebar /><SidebarTrigger /></SidebarProvider>);
  for (const [name, href] of [
    ["Account", "/clinic"], ["Patients", "/patients"], ["Users", "/users"],
    ["Price list", "/clinic-fees"], ["Templates", "/templates"], ["Documents", "/documents"],
    ["Plan settings", "/plan-settings"], ["Statistics", "/statistics"], ["Support", "/support"],
  ]) {
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
  }
  // The overview lives in each plan's Overview step, not in the menu.
  expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
  expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Close sidebar" })[0]);
  expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Open sidebar" })[1]);
  expect(container.querySelector('[data-state="expanded"]')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "b", ctrlKey: true });
  expect(container.querySelector('[data-state="collapsed"]')).toBeInTheDocument();
});
