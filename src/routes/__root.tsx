import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  redirect,
  useRouterState,
  useRouter,
} from "@tanstack/react-router";
import { adminTokenStore, clinicTokenStore } from "@/lib/admin/api";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

function cleanRedirectTarget(value: unknown, fallback: string, scope: "admin" | "clinic") {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value === "/login" || value === "/clinic/login" || value === "/admin/login") return fallback;
  if (scope === "admin") return value.startsWith("/admin") ? value : fallback;
  return value.startsWith("/admin") ? fallback : value;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: ({ location, search }) => {
    const pathname = location.pathname;
    const isAdminRoute = pathname.startsWith("/admin");
    const isAdminLogin = pathname === "/admin/login";
    const isAdminIndex = pathname === "/admin" || pathname === "/admin/";
    const isClinicLogin = pathname === "/clinic/login";
    const isLogin = pathname === "/login";
    const hasAdminToken = adminTokenStore.exists();
    const hasClinicToken = clinicTokenStore.exists();
    const redirectSearch = (search as { redirect?: unknown } | undefined)?.redirect;

    if (isAdminLogin) {
      if (hasAdminToken) {
        throw redirect({
          to: cleanRedirectTarget(redirectSearch, "/admin/dashboard", "admin"),
          replace: true,
        });
      }
      return;
    }

    if (isClinicLogin || isLogin) {
      if (hasClinicToken) {
        throw redirect({
          to: cleanRedirectTarget(redirectSearch, "/", "clinic"),
          replace: true,
        });
      }
      return;
    }

    if (isAdminRoute) {
      if (!hasAdminToken) {
        throw redirect({
          to: "/admin/login",
          search: { redirect: location.href },
          replace: true,
        });
      }
      if (isAdminIndex) {
        throw redirect({ to: "/admin/dashboard", replace: true });
      }
      return;
    }

    if (!hasClinicToken) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Dental Clinic Hub is a modern web application designed to manage dental clinic operations." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Dental Clinic Hub is a modern web application designed to manage dental clinic operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "Dental Clinic Hub is a modern web application designed to manage dental clinic operations." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/42df7dc3-72f6-4a6a-a7d3-763c7d9919cb/id-preview-d13c9d21--4542579a-18aa-411e-b6a0-6a10fac26b7a.lovable.app-1778597937608.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/42df7dc3-72f6-4a6a-a7d3-763c7d9919cb/id-preview-d13c9d21--4542579a-18aa-411e-b6a0-6a10fac26b7a.lovable.app-1778597937608.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return children;
}

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { PatientTabs } from "@/components/PatientTabs";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isAdminLogin = pathname === "/admin/login";
  const isClinicLogin = pathname === "/clinic/login";
  const isLogin = pathname === "/login";
  const isAuthPage = isAdminLogin || isClinicLogin || isLogin;

  if (isAuthPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur lg:hidden">
              <SidebarTrigger />
              <span className="text-sm font-semibold">BrightPlans</span>
            </header>
            <PatientTabs />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
