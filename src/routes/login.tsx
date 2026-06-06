import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";

import { clinicApi, clinicTokenStore, ApiError } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — BrightPlans" },
      {
        name: "description",
        content: "Sign in to BrightPlans to manage patients, treatment plans, and clinic workflow.",
      },
    ],
  }),
});

function cleanClinicRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value === "/login" || value === "/clinic/login" || value === "/admin/login") return "/";
  if (value.startsWith("/admin")) return "/";
  return value;
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = cleanClinicRedirect(search.redirect);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (clinicTokenStore.exists()) navigate({ to: redirectTo });
  }, [navigate, redirectTo]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required"); return; }
    if (!password)      { setError("Password is required"); return; }

    setLoading(true);
    try {
      await clinicApi.login(email.trim(), password);
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "CLINIC_SUSPENDED") {
          setError("Access to this clinic is currently suspended. Please contact your administrator.");
        } else if (err.code === "ACCOUNT_INACTIVE") {
          setError("Your account has been deactivated. Contact your clinic administrator.");
        } else if (err.code === "TOO_MANY_ATTEMPTS") {
          setError(err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError("Unable to connect. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(600px 400px at 15% 10%, rgba(37,99,235,0.12), transparent 60%), radial-gradient(500px 380px at 85% 90%, rgba(45,212,167,0.12), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(13,21,32,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(13,21,32,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="group inline-flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-white shadow-[0_8px_24px_-12px_rgba(37,99,235,0.5)]">
              <span className="font-serif text-lg leading-none">B</span>
            </span>
            <span className="font-serif text-2xl tracking-tight text-foreground">
              BrightPlans
            </span>
          </Link>
          <h1 className="mt-6 font-serif text-3xl tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue to your clinic workspace.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_60px_-30px_rgba(13,21,32,0.25)]">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="group h-11 w-full gradient-brand text-white shadow-[0_10px_30px_-10px_rgba(37,99,235,0.45)] transition-shadow hover:shadow-[0_14px_36px_-10px_rgba(45,212,167,0.5)]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
