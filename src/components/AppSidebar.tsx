import { Link, useRouterState } from "@tanstack/react-router";
import {
  User,
  Users,
  UserPlus,
  Tag,
  LayoutTemplate,
  FileText,
  Settings,
  BarChart3,
  Sparkles,
  LifeBuoy,
  LogOut,
  Sparkle,
} from "lucide-react";
import { clinicApi } from "@/lib/admin/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Account", url: "/", icon: User },
  { title: "Patients", url: "/patients", icon: UserPlus },
  { title: "Users", url: "/users", icon: Users },
  { title: "Price list", url: "/clinic-fees", icon: Tag },
  { title: "Templates", url: "/templates", icon: LayoutTemplate },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Overview", url: "/overview", icon: FileText },
  { title: "Plan settings", url: "/plan-settings", icon: Settings },
  { title: "Statistics", url: "/statistics", icon: BarChart3 },
  { title: "What's new", url: "/whats-new", icon: Sparkles },
  { title: "Support", url: "/support", icon: LifeBuoy },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = async () => {
    await clinicApi.logout();
    window.location.href = "/login";
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/40 px-4 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-accent)] shadow-[var(--shadow-glow)]">
            <Sparkle className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              BrightPlans
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Dental Suite
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-10 rounded-lg text-sidebar-foreground/80 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[var(--shadow-glow)] hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    >
                      <Link to={item.url}>
                        <item.icon className="h-[18px] w-[18px]" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/40 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="h-10 rounded-lg text-sidebar-foreground/70 hover:bg-destructive/15 hover:text-destructive cursor-pointer"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
