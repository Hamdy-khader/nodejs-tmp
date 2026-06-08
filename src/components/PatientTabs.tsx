import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { X, Sparkle, FileText } from "lucide-react";
import { useTabs, tabsStore } from "@/lib/tabs-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

export function PatientTabs() {
  const tabs = useTabs();
  const hydrated = useHydrated();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  if (!hydrated || tabs.length === 0) return null;

  return (
    <div className="flex items-end gap-1 overflow-x-auto bg-[image:var(--gradient-hero)] px-3 pt-2">
      <Link
        to="/clinic"
        className="flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-bold text-white/90 hover:text-white"
      >
        <Sparkle className="h-4 w-4 fill-current" />
        BrightPlans
      </Link>
      {tabs.map((tab) => {
        const base = `/patients/${tab.patientId}`;
        const planActive = tab.planId && pathname.startsWith(`${base}/plans/`);
        return (
          <div key={tab.patientId} className="flex items-end gap-1">
            <TabButton
              active={pathname === base && !planActive}
              onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: tab.patientId } })}
              onClose={() => {
                tabsStore.close(tab.patientId);
                if (pathname.startsWith(base)) navigate({ to: "/patients" });
              }}
              label={tab.name}
              icon={null}
            />
            {tab.planId && (
              <TabButton
                active={!!planActive}
                onClick={() =>
                  navigate({
                    to: "/patients/$patientId/plans/$planId",
                    params: { patientId: tab.patientId, planId: tab.planId! },
                  })
                }
                onClose={() => {
                  tabsStore.open({ ...tab, planId: undefined, planName: undefined });
                  if (planActive) navigate({ to: "/patients/$patientId", params: { patientId: tab.patientId } });
                }}
                label={tab.planName || "Plan"}
                icon={<FileText className="h-3.5 w-3.5" />}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  onClose,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  onClose: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex max-w-[220px] cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-[0_-2px_0_var(--accent)_inset]"
          : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
      )}
      onClick={onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={cn(
          "grid h-5 w-5 place-items-center rounded transition-colors",
          active ? "hover:bg-muted" : "hover:bg-white/20",
        )}
        aria-label="Close tab"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
