import { useEffect, useSyncExternalStore } from "react";
import { clinicApi } from "@/lib/admin/api";

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
  diagnosis?: string[];
}

export interface TreatmentItem {
  id: string;
  name: string;
  toothNumber?: number;
  amount: number;
  unitPrice: number;
}

export type TreatmentRow =
  | { id: string; kind: "visit"; label?: string; note?: string; items: TreatmentItem[] }
  | { id: string; kind: "healing"; label?: string; note?: string; days?: number }
  | { id: string; kind: "discount"; note?: string; mode: "amount" | "percent"; value: number };

export interface TreatmentPlan {
  id: string;
  patientId: string;
  name: string;
  notes: string;
  teeth: Record<number, ToothState>;
  xrays?: string[];
  generalStatuses?: string[];
  treatments?: TreatmentRow[];
  treatmentNote?: string;
  billingMode?: "insurance" | "payment";
  insurance?: { unusedMax: number; deductible: number };
  paymentPlan?: { amount: number; term: number; interest: number };
  createdAt: number;
  updatedAt: number;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  language?: string;
  currency?: string;
  createdAt: number;
}

export interface PatientInput {
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface StoreData {
  patients: Patient[];
  plans: TreatmentPlan[];
}

const FDI_NUMBERS = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function defaultTeeth(): Record<number, ToothState> {
  const out: Record<number, ToothState> = {};
  for (const n of FDI_NUMBERS) out[n] = { number: n, status: "intact" };
  return out;
}

let state: StoreData = { patients: [], plans: [] };
const listeners = new Set<() => void>();
let patientsLoaded = false;
const plansLoadedFor = new Set<string>();
const planLoaded = new Set<string>();
let patientsInflight: Promise<void> | null = null;
const plansInflight = new Map<string, Promise<void>>();
const EMPTY_PLANS: TreatmentPlan[] = [];
const plansSnapshotCache = new Map<
  string,
  { plansRef: TreatmentPlan[]; result: TreatmentPlan[] }
>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function toPatient(raw: Record<string, unknown>): Patient {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: raw.email ? String(raw.email) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    dateOfBirth: raw.date_of_birth ? String(raw.date_of_birth) : undefined,
    language: raw.language ? String(raw.language) : undefined,
    currency: raw.currency ? String(raw.currency) : undefined,
    createdAt: new Date(String(raw.created_at ?? new Date().toISOString())).getTime(),
  };
}

function toTooth(raw: Record<string, unknown>): ToothState {
  return {
    number: Number(raw.tooth_number ?? raw.number ?? 0),
    status: String(raw.status ?? "intact") as ToothStatus,
    note: raw.note ? String(raw.note) : undefined,
    diagnosis: Array.isArray(raw.diagnosis) ? raw.diagnosis.map(String) : undefined,
  };
}

function toTreatmentItem(raw: Record<string, unknown>): TreatmentItem {
  return {
    id: String(raw.id ?? uid()),
    name: String(raw.name ?? ""),
    toothNumber:
      raw.tooth_number === null || raw.tooth_number === undefined
        ? undefined
        : Number(raw.tooth_number),
    amount: Number(raw.amount ?? 1),
    unitPrice: Number(raw.unit_price ?? 0),
  };
}

function toTreatmentRow(raw: Record<string, unknown>): TreatmentRow {
  const kind = String(raw.kind ?? "visit") as TreatmentRow["kind"];
  if (kind === "visit") {
    return {
      id: String(raw.id ?? uid()),
      kind,
      label: raw.label ? String(raw.label) : undefined,
      note: raw.note ? String(raw.note) : undefined,
      items: Array.isArray(raw.items)
        ? raw.items.map((item) => toTreatmentItem(item as Record<string, unknown>))
        : [],
    };
  }
  if (kind === "healing") {
    return {
      id: String(raw.id ?? uid()),
      kind,
      label: raw.label ? String(raw.label) : undefined,
      note: raw.note ? String(raw.note) : undefined,
      days: raw.days === null || raw.days === undefined ? undefined : Number(raw.days),
    };
  }
  return {
    id: String(raw.id ?? uid()),
    kind,
    note: raw.note ? String(raw.note) : undefined,
    mode: String(raw.mode ?? "amount") as "amount" | "percent",
    value: Number(raw.value ?? 0),
  };
}

function mergePlan(plan: TreatmentPlan) {
  const next = state.plans.filter((item) => item.id !== plan.id);
  state = { ...state, plans: [plan, ...next] };
  emit();
}

function toPlan(raw: Record<string, unknown>, fallbackPatientId?: string): TreatmentPlan {
  const teeth = defaultTeeth();
  const rawTeeth = Array.isArray(raw.teeth)
    ? raw.teeth
    : Object.values((raw.teeth ?? {}) as Record<string, unknown>);
  rawTeeth.forEach((item) => {
    const tooth = toTooth(item as Record<string, unknown>);
    if (tooth.number) teeth[tooth.number] = tooth;
  });

  const xraysRaw = Array.isArray(raw.xrays) ? raw.xrays : [];
  const generalStatusesRaw = Array.isArray(raw.general_statuses) ? raw.general_statuses : [];
  const treatmentRowsRaw = Array.isArray(raw.treatment_rows)
    ? raw.treatment_rows
    : Array.isArray(raw.treatments)
      ? raw.treatments
      : [];

  return {
    id: String(raw.id ?? uid()),
    patientId: String(raw.patient_id ?? fallbackPatientId ?? ""),
    name: String(raw.name ?? "Your suggested treatment"),
    notes: String(raw.notes ?? ""),
    teeth,
    xrays: xraysRaw
      .map((item) =>
        typeof item === "string" ? item : String((item as Record<string, unknown>).file_url ?? ""),
      )
      .filter(Boolean),
    generalStatuses: generalStatusesRaw
      .map((item) =>
        typeof item === "string" ? item : String((item as Record<string, unknown>).label ?? ""),
      )
      .filter(Boolean),
    treatments: treatmentRowsRaw.map((item) => toTreatmentRow(item as Record<string, unknown>)),
    treatmentNote: raw.treatment_note ? String(raw.treatment_note) : undefined,
    billingMode: raw.billing_mode
      ? (String(raw.billing_mode) as "insurance" | "payment")
      : undefined,
    insurance:
      raw.insurance && typeof raw.insurance === "object"
        ? {
            unusedMax: Number((raw.insurance as Record<string, unknown>).unused_max ?? 0),
            deductible: Number((raw.insurance as Record<string, unknown>).deductible ?? 0),
          }
        : undefined,
    paymentPlan:
      raw.payment_plan && typeof raw.payment_plan === "object"
        ? {
            amount: Number((raw.payment_plan as Record<string, unknown>).amount ?? 0),
            term: Number((raw.payment_plan as Record<string, unknown>).term ?? 0),
            interest: Number((raw.payment_plan as Record<string, unknown>).interest ?? 0),
          }
        : undefined,
    createdAt: new Date(String(raw.created_at ?? new Date().toISOString())).getTime(),
    updatedAt: new Date(
      String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
    ).getTime(),
  };
}

function serializePlan(plan: TreatmentPlan) {
  return {
    name: plan.name,
    notes: plan.notes,
    billing_mode: plan.billingMode ?? null,
    insurance: plan.insurance
      ? {
          unused_max: plan.insurance.unusedMax,
          deductible: plan.insurance.deductible,
        }
      : null,
    payment_plan: plan.paymentPlan
      ? {
          amount: plan.paymentPlan.amount,
          term: plan.paymentPlan.term,
          interest: plan.paymentPlan.interest,
        }
      : null,
    treatment_note: plan.treatmentNote ?? null,
  };
}

function serializeTreatmentRows(treatments: TreatmentRow[]) {
  return treatments.map((row, index) => ({
    id: row.id,
    kind: row.kind,
    label: "label" in row ? (row.label ?? null) : null,
    note: row.note ?? null,
    days: row.kind === "healing" ? (row.days ?? null) : null,
    mode: row.kind === "discount" ? row.mode : null,
    value: row.kind === "discount" ? row.value : null,
    sort_order: index + 1,
    items:
      row.kind === "visit"
        ? row.items.map((item, itemIndex) => ({
            id: item.id,
            name: item.name,
            tooth_number: item.toothNumber ?? null,
            amount: item.amount,
            unit_price: item.unitPrice,
            sort_order: itemIndex + 1,
          }))
        : [],
  }));
}

function serializeTeeth(teeth: Record<number, ToothState>) {
  return Object.values(teeth).map((tooth) => ({
    tooth_number: tooth.number,
    status: tooth.status,
    note: tooth.note ?? null,
    diagnosis: tooth.diagnosis ?? [],
  }));
}

async function loadPatients(force = false) {
  if (!force && patientsLoaded) return;
  if (patientsInflight) return patientsInflight;
  patientsInflight = (async () => {
    try {
      const res = await clinicApi.patients.list({ limit: 200 });
      state = { ...state, patients: res.data.map((item) => toPatient(item)) };
      patientsLoaded = true;
      emit();
    } finally {
      patientsInflight = null;
    }
  })();
  return patientsInflight;
}

async function loadPlansFor(patientId: string, force = false) {
  if (!patientId) return;
  if (!force && plansLoadedFor.has(patientId)) return;
  if (plansInflight.has(patientId)) return plansInflight.get(patientId);
  const promise = (async () => {
    try {
      const res = await clinicApi.plans.list(patientId);
      const rows = Array.isArray(res) ? res : (res.data ?? []);
      const plans = rows.map((item) => toPlan(item, patientId));
      const rest = state.plans.filter((plan) => plan.patientId !== patientId);
      state = { ...state, plans: [...plans, ...rest] };
      plansLoadedFor.add(patientId);
      plans.forEach((plan) => planLoaded.add(plan.id));
      emit();
    } finally {
      plansInflight.delete(patientId);
    }
  })();
  plansInflight.set(patientId, promise);
  return promise;
}

async function loadPlan(patientId: string, id: string, force = false) {
  if (!patientId || !id) return;
  if (!force && planLoaded.has(id)) return;
  const raw = await clinicApi.plans.get(patientId, id);
  const plan = toPlan(raw, patientId);
  mergePlan(plan);
  plansLoadedFor.add(patientId);
  planLoaded.add(id);
}

function updateLocalPatient(id: string, patch: Partial<Patient>) {
  state = {
    ...state,
    patients: state.patients.map((patient) =>
      patient.id === id ? { ...patient, ...patch } : patient,
    ),
  };
  emit();
}

function updateLocalPlan(id: string, patch: Partial<TreatmentPlan>) {
  state = {
    ...state,
    plans: state.plans.map((plan) =>
      plan.id === id ? { ...plan, ...patch, updatedAt: Date.now() } : plan,
    ),
  };
  emit();
}

function getPlanById(id: string | undefined) {
  return state.plans.find((plan) => plan.id === id);
}

function getPlansForPatientId(patientId: string | undefined) {
  if (!patientId) return EMPTY_PLANS;

  const cached = plansSnapshotCache.get(patientId);
  if (cached && cached.plansRef === state.plans) {
    return cached.result;
  }

  const result = state.plans.filter((plan) => plan.patientId === patientId);
  plansSnapshotCache.set(patientId, { plansRef: state.plans, result });
  return result;
}

export function usePatients() {
  useEffect(() => {
    void loadPatients();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state.patients,
    () => state.patients,
  );
}

export function usePatient(id: string | undefined) {
  useEffect(() => {
    void loadPatients();
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => state.patients.find((patient) => patient.id === id),
    () => state.patients.find((patient) => patient.id === id),
  );
}

export function usePlansFor(patientId: string | undefined) {
  useEffect(() => {
    if (patientId) void loadPlansFor(patientId);
  }, [patientId]);
  return useSyncExternalStore(
    subscribe,
    () => getPlansForPatientId(patientId),
    () => getPlansForPatientId(patientId),
  );
}

export function usePlan(id: string | undefined) {
  const plan = getPlanById(id);
  useEffect(() => {
    if (plan?.patientId && id) void loadPlan(plan.patientId, id);
  }, [plan?.patientId, id]);
  return useSyncExternalStore(
    subscribe,
    () => getPlanById(id),
    () => getPlanById(id),
  );
}

export const patientsStore = {
  async reload() {
    await loadPatients(true);
  },

  async createPatient(input: PatientInput) {
    const raw = await clinicApi.patients.create({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      date_of_birth: input.dateOfBirth ?? null,
    });
    const patient = toPatient(raw);
    state = { ...state, patients: [patient, ...state.patients] };
    emit();
    return patient;
  },

  updatePatient(id: string, input: Partial<PatientInput>) {
    updateLocalPatient(id, input as Partial<Patient>);
    void clinicApi.patients.update(id, {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      date_of_birth: input.dateOfBirth ?? null,
    });
  },

  deletePatient(id: string) {
    state = {
      patients: state.patients.filter((patient) => patient.id !== id),
      plans: state.plans.filter((plan) => plan.patientId !== id),
    };
    emit();
    void clinicApi.patients.delete(id);
  },

  async createPlan(patientId: string, name: string) {
    const raw = await clinicApi.plans.create(patientId, { name, notes: "" });
    const plan = toPlan(raw, patientId);
    mergePlan(plan);
    return plan;
  },

  async ensurePlanFor(patientId: string): Promise<TreatmentPlan> {
    await loadPlansFor(patientId);
    const existing = state.plans
      .filter((plan) => plan.patientId === patientId)
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (existing) return existing;
    return this.createPlan(patientId, "Your suggested treatment");
  },

  updatePlan(id: string, input: Partial<Omit<TreatmentPlan, "id" | "patientId" | "createdAt">>) {
    const plan = getPlanById(id);
    if (!plan) return;
    const next = { ...plan, ...input, updatedAt: Date.now() };
    mergePlan(next);
    if (input.generalStatuses) {
      void clinicApi.plans.setGeneralStatuses(
        plan.id,
        input.generalStatuses.map((label) => ({ label })),
      );
    }
    if (input.teeth) {
      void clinicApi.plans.saveTeeth(plan.id, serializeTeeth(input.teeth));
    }
    void clinicApi.plans.update(plan.patientId, plan.id, serializePlan(next));
  },

  async savePlan(planId: string) {
    const plan = getPlanById(planId);
    if (!plan) throw new Error("Plan not found");

    await Promise.all([
      clinicApi.plans.update(plan.patientId, plan.id, serializePlan(plan)),
      clinicApi.plans.saveTeeth(plan.id, serializeTeeth(plan.teeth)),
      clinicApi.plans.setGeneralStatuses(
        plan.id,
        (plan.generalStatuses ?? []).map((label) => ({ label })),
      ),
      clinicApi.plans.setRows(plan.id, serializeTreatmentRows(plan.treatments ?? [])),
    ]);

    await loadPlan(plan.patientId, plan.id, true);
  },

  setTooth(planId: string, tooth: ToothState) {
    const plan = getPlanById(planId);
    if (!plan) return;
    updateLocalPlan(planId, {
      teeth: { ...plan.teeth, [tooth.number]: tooth },
    });
    void clinicApi.plans.updateTooth(planId, tooth.number, {
      tooth_number: tooth.number,
      status: tooth.status,
      note: tooth.note ?? null,
      diagnosis: tooth.diagnosis ?? [],
    });
  },

  setTreatments(planId: string, treatments: TreatmentRow[]) {
    updateLocalPlan(planId, { treatments });
    void clinicApi.plans.setRows(planId, serializeTreatmentRows(treatments));
  },

  addTreatmentRow(planId: string, row: TreatmentRow) {
    const plan = getPlanById(planId);
    if (!plan) return;
    const next = [...(plan.treatments ?? []), row];
    updateLocalPlan(planId, { treatments: next });
    void clinicApi.plans
      .createRow(planId, {
        kind: row.kind,
        label: "label" in row ? (row.label ?? null) : null,
        note: row.note ?? null,
        days: row.kind === "healing" ? (row.days ?? null) : null,
        mode: row.kind === "discount" ? row.mode : null,
        value: row.kind === "discount" ? row.value : null,
        sort_order: next.length,
      })
      .then(() => loadPlan(plan.patientId, planId, true))
      .catch(() => null);
  },

  updateTreatmentRow(planId: string, rowId: string, patch: Partial<TreatmentRow>) {
    const plan = getPlanById(planId);
    if (!plan) return;
    const treatments = (plan.treatments ?? []).map((row) =>
      row.id === rowId ? ({ ...row, ...patch } as TreatmentRow) : row,
    );
    updateLocalPlan(planId, { treatments });
    const row = treatments.find((item) => item.id === rowId);
    if (!row) return;
    void clinicApi.plans.updateRow(planId, rowId, {
      kind: row.kind,
      label: "label" in row ? (row.label ?? null) : null,
      note: row.note ?? null,
      days: row.kind === "healing" ? (row.days ?? null) : null,
      mode: row.kind === "discount" ? row.mode : null,
      value: row.kind === "discount" ? row.value : null,
    });
  },

  removeTreatmentRow(planId: string, rowId: string) {
    const plan = getPlanById(planId);
    if (!plan) return;
    updateLocalPlan(planId, {
      treatments: (plan.treatments ?? []).filter((row) => row.id !== rowId),
    });
    void clinicApi.plans.deleteRow(planId, rowId);
  },

  addTreatmentItemToLastVisit(planId: string, item: Omit<TreatmentItem, "id">) {
    const plan = getPlanById(planId);
    if (!plan) return;
    const rows = [...(plan.treatments ?? [])];
    let lastVisitIndex = -1;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i].kind === "visit") {
        lastVisitIndex = i;
        break;
      }
    }
    const newItem: TreatmentItem = { ...item, id: uid() };
    if (lastVisitIndex === -1) {
      const newRow: Extract<TreatmentRow, { kind: "visit" }> = {
        id: uid(),
        kind: "visit",
        items: [newItem],
      };
      rows.push(newRow);
      updateLocalPlan(planId, { treatments: rows });
      void clinicApi.plans
        .createRow(planId, { kind: "visit", sort_order: rows.length })
        .then(() => loadPlan(plan.patientId, planId, true))
        .catch(() => null);
      return;
    }

    const row = rows[lastVisitIndex] as Extract<TreatmentRow, { kind: "visit" }>;
    rows[lastVisitIndex] = { ...row, items: [...row.items, newItem] };
    updateLocalPlan(planId, { treatments: rows });
    void clinicApi.plans
      .createItem(planId, row.id, {
        name: newItem.name,
        tooth_number: newItem.toothNumber ?? null,
        amount: newItem.amount,
        unit_price: newItem.unitPrice,
        sort_order: row.items.length + 1,
      })
      .catch(() => null);
  },

  removeTreatmentItem(planId: string, rowId: string, itemId: string) {
    const plan = getPlanById(planId);
    if (!plan) return;
    updateLocalPlan(planId, {
      treatments: (plan.treatments ?? []).map((row) =>
        row.kind === "visit" && row.id === rowId
          ? { ...row, items: row.items.filter((item) => item.id !== itemId) }
          : row,
      ),
    });
    void clinicApi.plans.deleteItem(planId, rowId, itemId);
  },

  updateTreatmentItem(
    planId: string,
    rowId: string,
    itemId: string,
    patch: Partial<TreatmentItem>,
  ) {
    const plan = getPlanById(planId);
    if (!plan) return;
    const treatments = (plan.treatments ?? []).map((row) =>
      row.kind === "visit" && row.id === rowId
        ? {
            ...row,
            items: row.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          }
        : row,
    );
    updateLocalPlan(planId, { treatments });
    const row = treatments.find((item) => item.kind === "visit" && item.id === rowId) as
      | Extract<TreatmentRow, { kind: "visit" }>
      | undefined;
    const item = row?.items.find((entry) => entry.id === itemId);
    if (!item) return;
    void clinicApi.plans.updateItem(planId, rowId, itemId, {
      name: item.name,
      tooth_number: item.toothNumber ?? null,
      amount: item.amount,
      unit_price: item.unitPrice,
    });
  },

  deletePlan(id: string) {
    const plan = getPlanById(id);
    if (!plan) return;
    state = { ...state, plans: state.plans.filter((item) => item.id !== id) };
    emit();
    void clinicApi.plans.delete(plan.patientId, id);
  },

  addXrays(planId: string, dataUrls: string[]) {
    const plan = getPlanById(planId);
    if (!plan) return;
    updateLocalPlan(planId, { xrays: [...(plan.xrays ?? []), ...dataUrls] });
    dataUrls.forEach((fileUrl, index) => {
      void clinicApi.plans.addXray(planId, {
        file_url: fileUrl,
        sort_order: (plan.xrays?.length ?? 0) + index + 1,
      });
    });
  },

  removeXray(planId: string, index: number) {
    const plan = getPlanById(planId);
    if (!plan) return;
    const xrays = [...(plan.xrays ?? [])];
    const removed = xrays[index];
    updateLocalPlan(planId, { xrays: xrays.filter((_, itemIndex) => itemIndex !== index) });
    if (removed) {
      void loadPlan(plan.patientId, planId, true).catch(() => null);
    }
  },
};

export const STATUS_META: Record<ToothStatus, { label: string; color: string; ring: string }> = {
  intact: { label: "Intact", color: "oklch(0.96 0.012 160)", ring: "oklch(0.7 0.04 165)" },
  missing: { label: "Missing", color: "oklch(0.92 0.005 0)", ring: "oklch(0.55 0.02 0)" },
  caries: { label: "Caries", color: "oklch(0.78 0.16 50)", ring: "oklch(0.55 0.18 40)" },
  filled: { label: "Filled", color: "oklch(0.55 0.05 250)", ring: "oklch(0.35 0.04 250)" },
  crown: { label: "Crown", color: "oklch(0.85 0.14 90)", ring: "oklch(0.6 0.13 80)" },
  "root-treated": {
    label: "Root treated",
    color: "oklch(0.65 0.18 25)",
    ring: "oklch(0.45 0.16 25)",
  },
  implant: { label: "Implant", color: "oklch(0.45 0.04 250)", ring: "oklch(0.25 0.03 250)" },
  bridge: { label: "Bridge", color: "oklch(0.7 0.13 280)", ring: "oklch(0.45 0.13 280)" },
};
