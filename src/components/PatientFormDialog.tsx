import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patientsStore, type Patient } from "@/lib/patients-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  patient?: Patient;
  onCreated?: (p: Patient) => void;
}

const LANGS = [
  { v: "en", l: "English (EN)" },
  { v: "ar", l: "العربية (AR)" },
  { v: "fr", l: "Français (FR)" },
  { v: "es", l: "Español (ES)" },
  { v: "de", l: "Deutsch (DE)" },
];
const CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED", "TRY"];

export function PatientFormDialog({ open, onOpenChange, patient, onCreated }: Props) {
  const editing = !!patient;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(patient?.name ?? "");
      setEmail(patient?.email ?? "");
      setPhone(patient?.phone ?? "");
      setDob(patient?.dateOfBirth ?? "");
      setLanguage(patient?.language ?? "en");
      setCurrency(patient?.currency ?? "USD");
      setTouched(false);
    }
  }, [open, patient]);

  async function submit() {
    setTouched(true);
    if (!name.trim()) return;
    if (editing && patient) {
      patientsStore.updatePatient(patient.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        dateOfBirth: dob || undefined,
        language,
        currency,
      });
      toast.success("Patient updated");
      onOpenChange(false);
    } else {
      const created = await patientsStore.createPatient({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        dateOfBirth: dob || undefined,
        language,
        currency,
      });
      toast.success("Patient added");
      onOpenChange(false);
      onCreated?.(created);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit patient" : "New patient"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-xl bg-primary-soft/40 p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              {touched && !name.trim() && (
                <p className="text-xs font-medium text-destructive">Required field</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Contact number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Next →"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
