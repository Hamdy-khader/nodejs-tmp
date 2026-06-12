import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  CalendarRange,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  RefreshCcw,
  Users,
} from "lucide-react";
import { Cell, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import {
  clinicApi,
  type ClinicOverviewStats,
  type ClinicRevenuePoint,
} from "@/lib/admin/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Statistics - Treatly" },
      {
        name: "description",
        content: "Clinic statistics, revenue trends, and plan activity for Treatly.",
      },
    ],
  }),
  component: StatisticsPage,
});

type PeriodPreset = "30d" | "90d" | "12m" | "ytd";
type RevenueGroup = "day" | "week" | "month";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
];

const GROUP_OPTIONS: { value: RevenueGroup; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const REVENUE_CHART_CONFIG = {
  revenue: { label: "Revenue", color: "#0f766e" },
} as const;

const PLAN_MIX_CHART_CONFIG = {
  active: { label: "Active plans", color: "#0ea5e9" },
  completed: { label: "Completed plans", color: "#22c55e" },
} as const;

function StatisticsPage() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("90d");
  const [groupBy, setGroupBy] = useState<RevenueGroup>("month");

  const range = useMemo(() => resolveRange(periodPreset), [periodPreset]);

  const statsQuery = useQuery({
    queryKey: ["statistics", "stats"],
    queryFn: () => clinicApi.overview.stats(),
  });

  const revenueQuery = useQuery({
    queryKey: ["statistics", "revenue", range.from, range.to, groupBy],
    queryFn: () =>
      clinicApi.overview.revenue({
        from: range.from,
        to: range.to,
        group: groupBy,
      }),
  });

  const stats = statsQuery.data;
  const revenue = revenueQuery.data ?? [];
  const currency = stats?.currency ?? "USD";
  const revenueTotal = revenue.reduce((sum, item) => sum + item.revenue, 0);
  const totalPlans = (stats?.activePlans ?? 0) + (stats?.completedPlans ?? 0);
  const completionRate = totalPlans > 0 ? Math.round(((stats?.completedPlans ?? 0) / totalPlans) * 100) : 0;
  const averageRevenue = revenue.length > 0 ? revenueTotal / revenue.length : 0;
  const topRevenuePeriod = revenue.reduce<ClinicRevenuePoint | null>(
    (best, current) => (!best || current.revenue > best.revenue ? current : best),
    null,
  );

  const planMix = [
    { name: "active", label: "Active plans", value: stats?.activePlans ?? 0, fill: "#0ea5e9" },
    {
      name: "completed",
      label: "Completed plans",
      value: stats?.completedPlans ?? 0,
      fill: "#22c55e",
    },
  ];

  const loadError = statsQuery.error ?? revenueQuery.error;
  const isLoading = statsQuery.isLoading || revenueQuery.isLoading;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <section className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-soft)] lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              <ChartNoAxesCombined className="h-3.5 w-3.5" />
              Clinic intelligence
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Statistics</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Monitor patients, treatment plan activity, and revenue trends from the clinic
                backend in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={periodPreset} onValueChange={(value) => setPeriodPreset(value as PeriodPreset)}>
              <SelectTrigger className="w-full min-w-[180px] bg-background sm:w-[190px]">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as RevenueGroup)}>
              <SelectTrigger className="w-full min-w-[160px] bg-background sm:w-[170px]">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                void statsQuery.refetch();
                void revenueQuery.refetch();
              }}
            >
              <RefreshCcw className={cn("h-4 w-4", (statsQuery.isFetching || revenueQuery.isFetching) && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {(loadError as Error).message || "Statistics could not be loaded."}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <MetricSkeleton key={index} />)
          ) : stats ? (
            <>
              <MetricCard
                title="Total patients"
                value={formatNumber(stats.totalPatients)}
                description={`Reporting period ${stats.period || formatRange(range.from, range.to)}`}
                icon={Users}
                tone="sky"
              />
              <MetricCard
                title="Active plans"
                value={formatNumber(stats.activePlans)}
                description={`${completionRate}% completion rate`}
                icon={Activity}
                tone="cyan"
              />
              <MetricCard
                title="Completed plans"
                value={formatNumber(stats.completedPlans)}
                description={`${formatNumber(totalPlans)} total tracked plans`}
                icon={ClipboardCheck}
                tone="emerald"
              />
              <MetricCard
                title="Total revenue"
                value={formatCurrency(stats.totalRevenue, currency)}
                description={`Average ${formatCurrency(averageRevenue, currency)} per ${groupLabel(groupBy).toLowerCase()}`}
                icon={CircleDollarSign}
                tone="amber"
              />
            </>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <Card className="border-border/60 shadow-[var(--shadow-soft)]">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Revenue trend</CardTitle>
                <CardDescription>
                  Revenue grouped by {groupLabel(groupBy).toLowerCase()} from {formatRange(range.from, range.to)}.
                </CardDescription>
              </div>
              <div className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                {revenue.length} points
              </div>
            </CardHeader>
            <CardContent>
              {revenueQuery.isLoading ? (
                <Skeleton className="h-[320px] w-full rounded-2xl" />
              ) : revenue.length === 0 ? (
                <EmptyState
                  title="No revenue points yet"
                  description="The backend returned an empty revenue series for this filter combination."
                />
              ) : (
                <ChartContainer config={REVENUE_CHART_CONFIG} className="h-[320px] w-full">
                  <LineChart data={revenue}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                      tickFormatter={compactPeriod}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={72}
                      tickFormatter={(value: number) => compactCurrency(value, currency)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => (
                            <span className="font-medium text-foreground">
                              {formatCurrency(Number(value), currency)}
                            </span>
                          )}
                        />
                      }
                    />
                    <Line
                      dataKey="revenue"
                      type="monotone"
                      stroke="var(--color-revenue)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "var(--color-revenue)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-border/60 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle>Plans distribution</CardTitle>
                <CardDescription>How current plans are split between active and completed.</CardDescription>
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <Skeleton className="h-[260px] w-full rounded-2xl" />
                ) : totalPlans === 0 ? (
                  <EmptyState
                    title="No plans found"
                    description="As soon as the backend reports active or completed plans, the split appears here."
                  />
                ) : (
                  <ChartContainer config={PLAN_MIX_CHART_CONFIG} className="mx-auto h-[260px] w-full max-w-[300px]">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex w-full items-center justify-between gap-4">
                                <span className="text-muted-foreground">{String(name)}</span>
                                <span className="font-medium text-foreground">
                                  {formatNumber(Number(value))}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={planMix}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={4}
                      >
                        {planMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-[var(--shadow-soft)]">
              <CardHeader>
                <CardTitle>Highlights</CardTitle>
                <CardDescription>Quick readout from the selected statistics window.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <HighlightRow
                  label="Selected range"
                  value={formatRange(range.from, range.to)}
                />
                <HighlightRow
                  label="Average revenue"
                  value={formatCurrency(averageRevenue, currency)}
                />
                <HighlightRow
                  label="Best period"
                  value={
                    topRevenuePeriod
                      ? `${topRevenuePeriod.period} (${formatCurrency(topRevenuePeriod.revenue, currency)})`
                      : "No data"
                  }
                />
                <HighlightRow
                  label="Completion rate"
                  value={`${completionRate}%`}
                />
                <HighlightRow
                  label="Backend source"
                  value="/clinic/overview/stats + /clinic/overview/revenue"
                  mono
                />
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
  tone: "sky" | "cyan" | "emerald" | "amber";
}) {
  const toneClasses: Record<typeof tone, string> = {
    sky: "bg-sky-500/10 text-sky-700",
    cyan: "bg-cyan-500/10 text-cyan-700",
    emerald: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
  };

  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{title}</CardDescription>
            <CardTitle className="mt-2 text-3xl tracking-tight">{value}</CardTitle>
          </div>
          <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card className="border-border/60 shadow-[var(--shadow-soft)]">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <BarChart3 className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function HighlightRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm font-medium text-foreground", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

function resolveRange(preset: PeriodPreset) {
  const now = new Date();
  const to = formatDate(now);

  if (preset === "30d") {
    return { from: shiftDays(now, -30), to };
  }

  if (preset === "90d") {
    return { from: shiftDays(now, -90), to };
  }

  if (preset === "12m") {
    const date = new Date(now);
    date.setMonth(date.getMonth() - 12);
    return { from: formatDate(date), to };
  }

  return { from: `${now.getFullYear()}-01-01`, to };
}

function shiftDays(base: Date, amount: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatRange(from: string, to: string) {
  return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function compactPeriod(value: string) {
  const [year, month, day] = value.split("-");
  if (year && month && day) {
    return `${month}/${day}`;
  }
  if (year && month) {
    return `${month}/${year.slice(-2)}`;
  }
  return value;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function compactCurrency(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function groupLabel(value: RevenueGroup) {
  return GROUP_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
