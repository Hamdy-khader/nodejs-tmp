import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "BrightPlans — Smart Dental Treatment Planning" },
      {
        name: "description",
        content:
          "BrightPlans helps dental clinics create professional treatment plans, manage patients and documents — all in one place.",
      },
    ],
  }),
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[oklch(0.18_0.03_240)] via-[oklch(0.22_0.04_220)] to-[oklch(0.16_0.05_260)] px-6 text-white">
      {/* Orbs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "oklch(0.65 0.22 160)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full opacity-15 blur-3xl"
          style={{ background: "oklch(0.55 0.18 245)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
            <Sparkle className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            Bright<span className="text-[oklch(0.75_0.2_160)]">Plans</span>
          </span>
        </div>

        {/* Headline */}
        <div className="max-w-xl space-y-3">
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Smart Dental<br />
            <span className="text-[oklch(0.75_0.2_160)]">Treatment Planning</span>
          </h1>
          <p className="text-base text-white/70 sm:text-lg">
            Professional treatment plans, patient management, and beautiful
            documents — built for modern dental clinics.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/clinic/login"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[oklch(0.18_0.03_240)] shadow-lg transition hover:bg-white/90"
          >
            Clinic login →
          </Link>
          <Link
            to="/admin/login"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            Admin login
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 text-[11px] font-medium uppercase tracking-widest text-white/50">
          {[
            "Treatment plans",
            "Patient records",
            "PDF export",
            "Templates",
            "Team management",
          ].map((f) => (
            <span key={f} className="rounded-full border border-white/10 px-3 py-1">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
