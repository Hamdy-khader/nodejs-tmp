import {
  Check,
  AlertCircle,
  UserPlus,
  Users as UsersIcon,
  Wallet,
  HelpCircle,
  MessageCircle,
  FileText,
  FolderOpen,
  Lightbulb,
  UserCog,
  Workflow,
  CreditCard,
  Play,
  Bell,
  Search,
} from "lucide-react";

const steps = [
  { n: 1, title: "Synopsis", state: "done" as const },
  { n: 2, title: "Your First Plan", state: "done" as const },
  { n: 3, title: "Watch the Tutorials", state: "todo" as const },
];

const tiles = [
  { title: "New Patient", icon: UserPlus, primary: true },
  { title: "All Patients", icon: UsersIcon },
  { title: "Your Clinic Fees", icon: Wallet },
  { title: "Help Center", icon: HelpCircle },
  { title: "Live Support", icon: MessageCircle },
];

const utilities = [
  { title: "PDF Settings", desc: "Edit the appearance of the cover and the pages", icon: FileText },
  { title: "Documents, Videos", desc: "About your clinic, dentists, treatments, etc.", icon: FolderOpen },
  { title: "Smart Plans", desc: "Create complex plans with just a few clicks", icon: Lightbulb },
  { title: "User Manager", desc: "Add users and manage permissions", icon: UserCog },
  { title: "Integrations", desc: "Connect BrightPlans to your other systems", icon: Workflow },
  { title: "Subscription", desc: "Manage your BrightPlans subscription", icon: CreditCard },
];

const tutorials = [
  { title: "Create Plans", duration: "3:55", state: "new" as const },
  { title: "Setup", duration: "3:33", state: "watched" as const },
  { title: "Smart Plans", duration: "2:06", state: "watched" as const },
];

export function Dashboard() {
  const progress = 89;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, Dr. Khaled
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Let's keep your clinic shining today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search patients, plans..."
              className="h-10 w-72 rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
            <Bell className="h-4 w-4" />
          </button>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-accent)] text-sm font-semibold text-accent-foreground">
            KH
          </div>
        </div>
      </div>

      {/* Hero / Onboarding */}
      <section
        className="relative overflow-hidden rounded-3xl p-8 shadow-[var(--shadow-soft)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative grid items-center gap-8 lg:grid-cols-[auto_1fr]">
          {/* Progress ring */}
          <div className="flex items-center justify-center">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="fill-none stroke-white/15"
                  strokeWidth="8"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="fill-none stroke-accent"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-white">{progress}%</span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                  Onboarding
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
                  Incomplete
                </span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-2">
            {steps.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`grid h-10 w-10 place-items-center rounded-full ring-4 ring-white/10 ${
                      s.state === "done"
                        ? "bg-success text-success-foreground"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {s.state === "done" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mt-2 hidden h-px w-full bg-white/15 sm:block" />
                  )}
                </div>
                <div className="pt-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Step {s.n}
                  </div>
                  <div className="mt-0.5 text-base font-semibold text-white">
                    {s.title}
                  </div>
                  {s.state === "done" ? (
                    <span className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                      Completed
                    </span>
                  ) : (
                    <button className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition hover:opacity-90">
                      Let's begin!
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Tiles */}
          <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {tiles.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.title}
                    className={`group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-0.5 ${
                      t.primary
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                        : "bg-secondary text-secondary-foreground hover:bg-primary/5"
                    }`}
                  >
                    <Icon
                      className={`mb-3 h-7 w-7 ${
                        t.primary ? "text-accent" : "text-primary/70"
                      }`}
                    />
                    <span className="text-sm font-semibold leading-tight">
                      {t.title}
                    </span>
                    {t.primary && (
                      <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Utility cards */}
          <div className="rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {utilities.map((u) => {
                const Icon = u.icon;
                return (
                  <button
                    key={u.title}
                    className="group flex items-start gap-3 rounded-xl border border-border/60 bg-background p-4 text-left transition hover:border-primary/30 hover:bg-primary/[0.03]"
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {u.title}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {u.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tutorials */}
        <aside className="rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Tutorials</h2>
            <button className="text-xs font-medium text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {tutorials.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition hover:border-primary/30 hover:bg-primary/[0.03]"
              >
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    t.state === "new"
                      ? "bg-[image:var(--gradient-accent)] text-accent-foreground shadow-[var(--shadow-glow)]"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    {t.title}
                  </div>
                  <div
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      t.state === "new" ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {t.state === "new" ? "Watch now" : "Watch again"}
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {t.duration}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
