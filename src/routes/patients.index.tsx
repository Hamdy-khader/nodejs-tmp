import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { patientsStore, usePatients, type Patient } from "@/lib/patients-store";
import { useHydrated } from "@/lib/use-hydrated";
import { PatientFormDialog } from "@/components/PatientFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/patients/")({
  component: PatientsList,
  head: () => ({ meta: [{ title: "Patients — BrightPlans" }] }),
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PatientsList() {
  const hydrated = useHydrated();
  const patientsRaw = usePatients();
  const patients = hydrated ? patientsRaw : [];
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 3) return patients;
    return patients.filter((p) =>
      [p.name, p.email, p.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(s)),
    );
  }, [patients, q]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">{patients.length} total</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center">
        <Button onClick={() => setOpenNew(true)} className="rounded-full shadow-[var(--shadow-glow)]">
          <Plus className="h-4 w-4" /> New patient
        </Button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for a patient (min. 3 chars)"
            className="pl-9"
          />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <UsersIcon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">No patients yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first patient to start creating treatment plans.
            </p>
            <Button onClick={() => setOpenNew(true)} className="mt-2 rounded-full">
              <Plus className="h-4 w-4" /> New patient
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((p) => (
              <li
                key={p.id}
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-primary-soft/40 sm:px-6"
              >
              <button
                type="button"
                onClick={() => {
                  const plan = patientsStore.ensurePlanFor(p.id);
                  navigate({
                    to: "/patients/$patientId/plans/$planId",
                    params: { patientId: p.id, planId: plan.id },
                  });
                }}
                className="flex flex-1 items-center gap-4 text-left"
              >
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--gradient-hero)] text-sm font-semibold text-primary-foreground">
                  {initials(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email || p.phone || "—"}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {p.currency} · {p.language.toUpperCase()}
                </span>
              </button>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(p)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleting(p)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PatientFormDialog
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={(p) => navigate({ to: "/patients/$patientId", params: { patientId: p.id } })}
      />
      <PatientFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        patient={editing ?? undefined}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium">{deleting?.name}</span> and all of their treatment plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) {
                  patientsStore.deletePatient(deleting.id);
                  toast.success("Patient deleted");
                  setDeleting(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
