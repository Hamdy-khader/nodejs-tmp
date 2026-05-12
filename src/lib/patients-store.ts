import { useSyncExternalStore } from "react";

export type ToothStatus =
  | "intact"
  | "missing"
  | "caries"
  | "filled"
  | "crown"
  | "root-treated"
  | "implant"
  | "bridge";

export interface ToothState {
  number: number;
  status: ToothStatus;
  note?: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  name: string;
  notes: string;
  teeth: Record<number, ToothState>;
  createdAt: number;
  updatedAt: number;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  language: string;
  currency: string;
  createdAt: number;
}

interface StoreData {
  patients: Patient[];
  plans: TreatmentPlan[];
}

const STORAGE_KEY = "brightplans:data:v1";

const FDI_NUMBERS = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function defaultTeeth(): Record<number, ToothState> {
  const out: Record<number, ToothState> = {};
  for (const n of FDI_NUMBERS) out[n] = { number: n, status: "intact" };
  return out;
}

function seedDemo(): StoreData {
  const now = Date.now();
  const mk = (over: Partial<Patient>): Patient => ({
    id: Math.random().toString(36).slice(2, 10) + now.toString(36),
    name: "",
    language: "en",
    currency: "USD",
    createdAt: now,
    ...over,
  });
  const patients: Patient[] = [
    mk({ name: "Sarah Al-Hamadi", email: "sarah.h@example.com", phone: "+971 50 123 4567", dateOfBirth: "1990-04-12", language: "ar", currency: "AED" }),
    mk({ name: "Omar Khaled", email: "omar.k@example.com", phone: "+962 79 555 0199", dateOfBirth: "1985-11-03", language: "ar", currency: "USD" }),
    mk({ name: "Lina Haddad", email: "lina@example.com", phone: "+961 71 222 333", dateOfBirth: "1998-02-21", language: "en", currency: "EUR" }),
    mk({ name: "John Smith", email: "john.smith@example.com", phone: "+1 415 555 0142", dateOfBirth: "1979-08-30", language: "en", currency: "USD" }),
    mk({ name: "Fatima Noor", phone: "+966 55 444 8821", dateOfBirth: "2002-06-17", language: "ar", currency: "SAR" }),
  ];
  const buildTeeth = (overrides: Partial<Record<number, ToothStatus>>) => {
    const t = defaultTeeth();
    for (const [k, v] of Object.entries(overrides)) t[+k] = { number: +k, status: v as ToothStatus };
    return t;
  };
  const plans: TreatmentPlan[] = [
    { id: "p1" + now.toString(36), patientId: patients[0].id, name: "Initial assessment", notes: "Routine checkup with two cavities found.", teeth: buildTeeth({ 16: "caries", 26: "filled", 36: "caries", 46: "crown" }), createdAt: now, updatedAt: now },
    { id: "p2" + now.toString(36), patientId: patients[0].id, name: "Crown replacement", notes: "Plan to replace old crown on 46.", teeth: buildTeeth({ 46: "crown", 47: "filled" }), createdAt: now - 86400000, updatedAt: now - 86400000 },
    { id: "p3" + now.toString(36), patientId: patients[1].id, name: "Implant evaluation", notes: "Missing 36, candidate for implant.", teeth: buildTeeth({ 36: "missing", 37: "intact", 16: "root-treated" }), createdAt: now, updatedAt: now },
    { id: "p4" + now.toString(36), patientId: patients[2].id, name: "Orthodontic baseline", notes: "Pre-ortho mapping.", teeth: buildTeeth({ 11: "intact", 21: "intact", 36: "filled" }), createdAt: now, updatedAt: now },
    { id: "p5" + now.toString(36), patientId: patients[3].id, name: "Bridge planning", notes: "Bridge between 24-26.", teeth: buildTeeth({ 24: "bridge", 25: "missing", 26: "bridge" }), createdAt: now, updatedAt: now },
  ];
  return { patients, plans };
}

function load(): StoreData {
  if (typeof window === "undefined") return { patients: [], plans: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemo();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as StoreData;
  } catch {
    return { patients: [], plans: [] };
  }
}

let state: StoreData = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePatients() {
  return useSyncExternalStore(
    subscribe,
    () => state.patients,
    () => state.patients,
  );
}

export function usePatient(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => state.patients.find((p) => p.id === id),
    () => state.patients.find((p) => p.id === id),
  );
}

export function usePlansFor(patientId: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => state.plans.filter((p) => p.patientId === patientId),
    () => state.plans.filter((p) => p.patientId === patientId),
  );
}

export function usePlan(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => state.plans.find((p) => p.id === id),
    () => state.plans.find((p) => p.id === id),
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export const patientsStore = {
  createPatient(input: Omit<Patient, "id" | "createdAt">) {
    const patient: Patient = { ...input, id: uid(), createdAt: Date.now() };
    state = { ...state, patients: [patient, ...state.patients] };
    persist();
    return patient;
  },
  updatePatient(id: string, input: Partial<Omit<Patient, "id" | "createdAt">>) {
    state = {
      ...state,
      patients: state.patients.map((p) => (p.id === id ? { ...p, ...input } : p)),
    };
    persist();
  },
  deletePatient(id: string) {
    state = {
      patients: state.patients.filter((p) => p.id !== id),
      plans: state.plans.filter((p) => p.patientId !== id),
    };
    persist();
  },
  createPlan(patientId: string, name: string) {
    const plan: TreatmentPlan = {
      id: uid(),
      patientId,
      name,
      notes: "",
      teeth: defaultTeeth(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state = { ...state, plans: [plan, ...state.plans] };
    persist();
    return plan;
  },
  updatePlan(id: string, input: Partial<Omit<TreatmentPlan, "id" | "patientId" | "createdAt">>) {
    state = {
      ...state,
      plans: state.plans.map((p) =>
        p.id === id ? { ...p, ...input, updatedAt: Date.now() } : p,
      ),
    };
    persist();
  },
  setTooth(planId: string, tooth: ToothState) {
    state = {
      ...state,
      plans: state.plans.map((p) =>
        p.id === planId
          ? { ...p, teeth: { ...p.teeth, [tooth.number]: tooth }, updatedAt: Date.now() }
          : p,
      ),
    };
    persist();
  },
  deletePlan(id: string) {
    state = { ...state, plans: state.plans.filter((p) => p.id !== id) };
    persist();
  },
};

export const STATUS_META: Record<ToothStatus, { label: string; color: string; ring: string }> = {
  intact: { label: "Intact", color: "oklch(0.96 0.012 160)", ring: "oklch(0.7 0.04 165)" },
  missing: { label: "Missing", color: "oklch(0.92 0.005 0)", ring: "oklch(0.55 0.02 0)" },
  caries: { label: "Caries", color: "oklch(0.78 0.16 50)", ring: "oklch(0.55 0.18 40)" },
  filled: { label: "Filled", color: "oklch(0.55 0.05 250)", ring: "oklch(0.35 0.04 250)" },
  crown: { label: "Crown", color: "oklch(0.85 0.14 90)", ring: "oklch(0.6 0.13 80)" },
  "root-treated": { label: "Root treated", color: "oklch(0.65 0.18 25)", ring: "oklch(0.45 0.16 25)" },
  implant: { label: "Implant", color: "oklch(0.45 0.04 250)", ring: "oklch(0.25 0.03 250)" },
  bridge: { label: "Bridge", color: "oklch(0.7 0.13 280)", ring: "oklch(0.45 0.13 280)" },
};
