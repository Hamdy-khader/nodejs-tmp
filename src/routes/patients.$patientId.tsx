import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Pencil, Plus, Trash2, Calendar, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { patientsStore, usePatient, usePlansFor } from "@/lib/patients-store";
import { tabsStore } from "@/lib/tabs-store";
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

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientPage,
  notFoundComponent: () => <div className="p-8">Patient not found</div>,
});

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

function PatientPage() {
  const { patientId } = useParams({ from: "/patients/$patientId" });
  const patient = usePatient(patientId);
  const plans = usePlansFor(patientId);
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("Your suggested treatment");
  const [delPlanId, setDelPlanId] = useState<string | null>(null);

  if (!patient) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Patient not found.</p>
        <Link to="/patients" className="mt-4 inline-block text-primary underline">
          ← Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <Link
        to="/patients"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All patients
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-soft)]">
        <div className="relative bg-[image:var(--gradient-hero)] p-6 text-primary-foreground sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur">
                {initials(patient.name)}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  {patient.currency} · {patient.language.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-destructive/90 text-destructive-foreground hover:bg-destructive"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Date of birth" value={patient.dateOfBirth || "—"} />
            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email || "—"} />
            <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={patient.phone || "—"} />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Treatment plans</h2>
          <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length === 1 ? "" : "s"}</p>
        </div>
        <Button onClick={() => { setNewPlanName("Your suggested treatment"); setNewPlanOpen(true); }} className="rounded-full">
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border/60 bg-card/50 px-6 py-16 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No treatment plans yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a plan to start charting teeth.</p>
          </div>
        )}
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Link
              to="/patients/$patientId/plans/$planId"
              params={{ patientId: patient.id, planId: plan.id }}
              className="block"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Plan {plans.length - i}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Updated {new Date(plan.updatedAt).toLocaleDateString()}
              </p>
            </Link>
            <button
              onClick={() => setDelPlanId(plan.id)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              aria-label="Delete plan"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} patient={patient} />

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this patient and all their treatment plans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                patientsStore.deletePatient(patient.id);
                toast.success("Patient deleted");
                navigate({ to: "/patients" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New treatment plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="planName">Plan name</Label>
            <Input id="planName" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewPlanOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newPlanName.trim()) return;
                const plan = patientsStore.createPlan(patient.id, newPlanName.trim());
                setNewPlanOpen(false);
                toast.success("Plan created");
                navigate({
                  to: "/patients/$patientId/plans/$planId",
                  params: { patientId: patient.id, planId: plan.id },
                });
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delPlanId} onOpenChange={(v) => !v && setDelPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (delPlanId) {
                  patientsStore.deletePlan(delPlanId);
                  toast.success("Plan deleted");
                  setDelPlanId(null);
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

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
        {icon} {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
