import {
  UserPlus,
  Users as UsersIcon,
  Wallet,
  FileText,
  LayoutTemplate,
  Settings,
  Bell,
  Search,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  Stethoscope,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clinicApi, type ClinicUser } from "@/lib/admin/api";
import { usePatients } from "@/lib/patients-store";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const quickActions: {
  title: string;
  desc: string;
  icon: typeof UserPlus;
  to: string;
  accent?: boolean;
}[] = [
  { title: "New Patient", desc: "Register a new patient", icon: UserPlus, to: "/patients", accent: true },
  { title: "All Patients", desc: "Browse patient records", icon: UsersIcon, to: "/patients" },
  { title: "Clinic Fees", desc: "Manage your price list", icon: Wallet, to: "/clinic-fees" },
  { title: "Templates", desc: "Edit document templates", icon: LayoutTemplate, to: "/templates" },
  { title: "Documents", desc: "Patient documents & PDFs", icon: FileText, to: "/documents" },
  { title: "Plan Settings", desc: "Customize PDF output", icon: Settings, to: "/plan-settings" },
];

export function Dashboard() {
  const [clinicUser, setClinicUser] = useState<ClinicUser | null>(null);
  const patients = usePatients();

  useEffect(() => {
    clinicApi
      .me()
      .then(({ clinic_user }) => setClinicUser(clinic_user))
      .catch(() => null);
  }, []);

  const displayName = clinicUser?.full_name ?? "";
  const initials = displayName ? getInitials(displayName) : "??";
  const clinicName = clinicUser?.clinic?.name ?? "Your Clinic";

  const stats = [
    {
      label: "Total patients",
      value: patients.length,
      icon: UsersIcon,
      color: "bg-blue-50 text-blue-600",
      trend: null,
    },
    {
      label: "Active plans",
      value: "—",
      icon: ClipboardList,
      color: "bg-emerald-50 text-emerald-600",
      trend: null,
    },
    {
      label: "This month",
      value: new Date().toLocaleString("default", { month: "long" }),
      icon: CalendarDays,
      color: "bg-violet-50 text-violet-600",
      trend: null,
    },
    {
      label: "Diagnosis types",
      value: "8",
      icon: Stethoscope,
      color: "bg-amber-50 text-amber-600",
      trend: null,
    },
  ];

  // Recent patients (last 5)
  const recent = [...patients].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {clinicName}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {greeting()}{displayName ? `, ${displayName.split(" ")[0]}` : ""}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search patients, plans…"
              className="h-10 w-64 rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <div
            className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-accent)] text-sm font-semibold text-accent-foreground"
            title={displayName}
          >
            {initials}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </span>
                <div className={`grid h-8 w-8 place-items-center rounded-lg text-sm ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                {s.value}
              </div>
              {s.trend && (
                <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <TrendingUp className="h-3 w-3" /> {s.trend}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                to={a.to}
                key={a.title}
                className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  a.accent
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "border-border/60 bg-card text-foreground hover:border-primary/30 hover:bg-primary/[0.03]"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${a.accent ? "text-accent" : "text-primary/70 group-hover:text-primary"}`}
                />
                <span className="text-xs font-semibold leading-tight">{a.title}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Recent patients */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h2 className="font-semibold text-foreground">Recent Patients</h2>
            <Link
              to="/patients"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <UsersIcon className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">No patients yet.</p>
              <Link
                to="/patients"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add first patient
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: p.id }}
                    className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-muted/40"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                      {p.phone && (
                        <div className="truncate text-xs text-muted-foreground">{p.phone}</div>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right panel: Clinic summary */}
        <aside className="space-y-4">
          {/* Clinic info card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clinic
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground truncate ml-2 text-right">{clinicName}</span>
              </div>
              {clinicUser?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground truncate ml-2 text-right">{clinicUser.email}</span>
                </div>
              )}
              {clinicUser?.role && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">
                    {clinicUser.role}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)]">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </h3>
            <div className="space-y-1">
              {[
                { label: "Plan Settings", to: "/plan-settings", icon: Settings },
                { label: "Users", to: "/users", icon: UsersIcon },
                { label: "Templates", to: "/templates", icon: LayoutTemplate },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/80 transition hover:bg-muted/60 hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50" />
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
