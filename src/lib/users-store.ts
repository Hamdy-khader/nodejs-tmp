import { useEffect, useState } from "react";

export type UserStatus = "active" | "inactive" | "suspended";

export type RoleKey =
  | "super_admin"
  | "admin"
  | "dentist"
  | "assistant"
  | "receptionist"
  | "accountant"
  | "lab_technician"
  | "viewer"
  | string; // custom

export interface Permission {
  key: string;
  group: string;
  label: string;
}

export interface Role {
  key: RoleKey;
  name: string;
  description: string;
  color: string; // tailwind class fragment
  builtIn: boolean;
  permissions: string[]; // permission keys
}

export interface ClinicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: RoleKey;
  status: UserStatus;
  branch: string;
  department?: string;
  specialty?: string;
  licenseNumber?: string;
  experienceYears?: number;
  gender?: "male" | "female" | "other";
  dob?: string;
  workingHours?: string;
  calendarColor?: string;
  lastLogin?: string; // ISO
  createdAt: string; // ISO
  notes?: string;
  tags?: string[];
  twoFactor?: boolean;
  online?: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  details?: string;
}

export const ALL_PERMISSIONS: Permission[] = [
  { group: "Patients", key: "patients.view", label: "View Patients" },
  { group: "Patients", key: "patients.add", label: "Add Patients" },
  { group: "Patients", key: "patients.edit", label: "Edit Patients" },
  { group: "Patients", key: "patients.delete", label: "Delete Patients" },
  { group: "Appointments", key: "appt.view", label: "View Appointments" },
  { group: "Appointments", key: "appt.create", label: "Create Appointments" },
  { group: "Appointments", key: "appt.edit", label: "Edit Appointments" },
  { group: "Appointments", key: "appt.cancel", label: "Cancel Appointments" },
  { group: "Treatments", key: "tx.view", label: "View Treatments" },
  { group: "Treatments", key: "tx.create", label: "Create Treatments" },
  { group: "Treatments", key: "tx.edit", label: "Edit Treatments" },
  { group: "Treatments", key: "tx.delete", label: "Delete Treatments" },
  { group: "Billing", key: "billing.view", label: "View Invoices" },
  { group: "Billing", key: "billing.create", label: "Create Invoice" },
  { group: "Billing", key: "billing.refund", label: "Refund" },
  { group: "Billing", key: "billing.export", label: "Export Financial Reports" },
  { group: "Inventory", key: "inv.view", label: "View Inventory" },
  { group: "Inventory", key: "inv.add", label: "Add Products" },
  { group: "Inventory", key: "inv.edit", label: "Edit Products" },
  { group: "Inventory", key: "inv.delete", label: "Delete Products" },
  { group: "Reports", key: "rep.view", label: "View Reports" },
  { group: "Reports", key: "rep.export", label: "Export Reports" },
  { group: "Reports", key: "rep.financial", label: "Financial Reports" },
  { group: "Reports", key: "rep.analytics", label: "Analytics Access" },
  { group: "Admin", key: "admin.users", label: "Manage Users" },
  { group: "Admin", key: "admin.roles", label: "Manage Roles" },
  { group: "Admin", key: "admin.audit", label: "View Audit Logs" },
  { group: "Admin", key: "admin.settings", label: "System Settings" },
];

const ALL_KEYS = ALL_PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLES: Role[] = [
  {
    key: "super_admin",
    name: "Super Admin",
    description: "Full unrestricted access. Cannot be deleted.",
    color: "from-rose-500 to-orange-500",
    builtIn: true,
    permissions: ALL_KEYS,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manages clinic operations and staff.",
    color: "from-violet-500 to-indigo-500",
    builtIn: true,
    permissions: ALL_KEYS.filter((k) => !k.startsWith("admin.settings")),
  },
  {
    key: "dentist",
    name: "Dentist",
    description: "Clinical workflow and treatment plans.",
    color: "from-emerald-500 to-teal-500",
    builtIn: true,
    permissions: [
      "patients.view","patients.edit","appt.view","appt.create","appt.edit",
      "tx.view","tx.create","tx.edit","billing.view","rep.view",
    ],
  },
  {
    key: "assistant",
    name: "Assistant",
    description: "Supports dentists, manages chairside tasks.",
    color: "from-cyan-500 to-sky-500",
    builtIn: true,
    permissions: ["patients.view","appt.view","tx.view","inv.view"],
  },
  {
    key: "receptionist",
    name: "Receptionist",
    description: "Front desk, scheduling, patient intake.",
    color: "from-amber-500 to-yellow-500",
    builtIn: true,
    permissions: ["patients.view","patients.add","patients.edit","appt.view","appt.create","appt.edit","appt.cancel","billing.view"],
  },
  {
    key: "accountant",
    name: "Accountant",
    description: "Billing, invoices and financial reports.",
    color: "from-lime-500 to-green-500",
    builtIn: true,
    permissions: ["billing.view","billing.create","billing.refund","billing.export","rep.view","rep.export","rep.financial"],
  },
  {
    key: "lab_technician",
    name: "Lab Technician",
    description: "Lab orders and prosthetics tracking.",
    color: "from-fuchsia-500 to-pink-500",
    builtIn: true,
    permissions: ["tx.view","inv.view","inv.add","inv.edit"],
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only access across the clinic.",
    color: "from-slate-400 to-slate-500",
    builtIn: true,
    permissions: ALL_KEYS.filter((k) => k.endsWith(".view")),
  },
];

export const BRANCHES = ["Main Branch", "Downtown", "North Clinic", "Marina"];

const seed = (): { users: ClinicUser[]; roles: Role[]; logs: AuditLog[] } => {
  const now = Date.now();
  const day = 86400000;
  const users: ClinicUser[] = [
    { id: "u1", firstName: "Layla", lastName: "Hassan", email: "layla@brightplans.io", phone: "+971 50 111 2233", role: "super_admin", status: "active", branch: "Main Branch", department: "Management", lastLogin: new Date(now - 2 * 3600_000).toISOString(), createdAt: new Date(now - 400 * day).toISOString(), online: true, twoFactor: true },
    { id: "u2", firstName: "Omar", lastName: "Al-Sayed", email: "omar@brightplans.io", phone: "+971 50 222 3344", role: "dentist", status: "active", branch: "Main Branch", specialty: "Orthodontics", licenseNumber: "DDS-3382", experienceYears: 9, lastLogin: new Date(now - day).toISOString(), createdAt: new Date(now - 300 * day).toISOString(), online: true, calendarColor: "#10b981" },
    { id: "u3", firstName: "Sara", lastName: "Khalil", email: "sara@brightplans.io", phone: "+971 55 333 4455", role: "receptionist", status: "active", branch: "Downtown", lastLogin: new Date(now - 3 * 3600_000).toISOString(), createdAt: new Date(now - 220 * day).toISOString() },
    { id: "u4", firstName: "Yusuf", lastName: "Mahmoud", email: "yusuf@brightplans.io", phone: "+971 56 444 5566", role: "assistant", status: "inactive", branch: "Main Branch", lastLogin: new Date(now - 14 * day).toISOString(), createdAt: new Date(now - 180 * day).toISOString() },
    { id: "u5", firstName: "Noor", lastName: "Tariq", email: "noor@brightplans.io", phone: "+971 52 555 6677", role: "accountant", status: "active", branch: "North Clinic", lastLogin: new Date(now - 6 * 3600_000).toISOString(), createdAt: new Date(now - 120 * day).toISOString() },
    { id: "u6", firstName: "Hadi", lastName: "Saleh", email: "hadi@brightplans.io", phone: "+971 54 666 7788", role: "lab_technician", status: "active", branch: "Marina", lastLogin: new Date(now - 2 * day).toISOString(), createdAt: new Date(now - 90 * day).toISOString() },
    { id: "u7", firstName: "Mona", lastName: "Idris", email: "mona@brightplans.io", phone: "+971 50 777 8899", role: "viewer", status: "suspended", branch: "Downtown", lastLogin: new Date(now - 30 * day).toISOString(), createdAt: new Date(now - 60 * day).toISOString() },
    { id: "u8", firstName: "Karim", lastName: "Fares", email: "karim@brightplans.io", phone: "+971 58 888 9900", role: "admin", status: "active", branch: "Main Branch", lastLogin: new Date(now - 30 * 60_000).toISOString(), createdAt: new Date(now - 45 * day).toISOString(), online: true, twoFactor: true },
  ];
  const logs: AuditLog[] = [
    { id: "l1", at: new Date(now - 60_000).toISOString(), actor: "Layla Hassan", action: "Updated role", target: "Karim Fares", details: "dentist → admin" },
    { id: "l2", at: new Date(now - 3600_000).toISOString(), actor: "System", action: "Login", target: "Omar Al-Sayed", details: "IP 92.114.5.18" },
    { id: "l3", at: new Date(now - 5 * 3600_000).toISOString(), actor: "Layla Hassan", action: "Suspended user", target: "Mona Idris" },
    { id: "l4", at: new Date(now - 24 * 3600_000).toISOString(), actor: "Karim Fares", action: "Created user", target: "Hadi Saleh" },
  ];
  return { users, roles: DEFAULT_ROLES, logs };
};

const KEY = "bp.users.v1";

interface State {
  users: ClinicUser[];
  roles: Role[];
  logs: AuditLog[];
}

const listeners = new Set<() => void>();
let state: State | null = null;

const load = (): State => {
  if (state) return state;
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      // ensure default roles exist
      const keys = new Set(parsed.roles.map((r) => r.key));
      for (const r of DEFAULT_ROLES) if (!keys.has(r.key)) parsed.roles.push(r);
      state = parsed;
      return state;
    }
  } catch {}
  state = seed();
  persist();
  return state;
};

const persist = () => {
  if (typeof window === "undefined" || !state) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
};

const emit = () => { listeners.forEach((l) => l()); };

const log = (entry: Omit<AuditLog, "id" | "at">) => {
  const s = load();
  s.logs.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), ...entry });
  s.logs = s.logs.slice(0, 200);
};

export const usersStore = {
  get: () => load(),
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },

  upsertUser(user: ClinicUser, actor = "Admin") {
    const s = load();
    const idx = s.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      s.users[idx] = user;
      log({ actor, action: "Updated user", target: `${user.firstName} ${user.lastName}` });
    } else {
      s.users.unshift(user);
      log({ actor, action: "Created user", target: `${user.firstName} ${user.lastName}` });
    }
    persist(); emit();
  },

  deleteUsers(ids: string[], actor = "Admin") {
    const s = load();
    const removed = s.users.filter((u) => ids.includes(u.id) && u.role !== "super_admin");
    s.users = s.users.filter((u) => !removed.includes(u));
    removed.forEach((u) => log({ actor, action: "Deleted user", target: `${u.firstName} ${u.lastName}` }));
    persist(); emit();
  },

  setStatus(ids: string[], status: UserStatus, actor = "Admin") {
    const s = load();
    s.users = s.users.map((u) => ids.includes(u.id) ? { ...u, status } : u);
    log({ actor, action: `Set status → ${status}`, target: `${ids.length} user(s)` });
    persist(); emit();
  },

  changeRole(ids: string[], role: RoleKey, actor = "Admin") {
    const s = load();
    s.users = s.users.map((u) => ids.includes(u.id) && u.role !== "super_admin" ? { ...u, role } : u);
    log({ actor, action: `Changed role → ${role}`, target: `${ids.length} user(s)` });
    persist(); emit();
  },

  resetPassword(id: string, actor = "Admin") {
    const s = load();
    const u = s.users.find((x) => x.id === id);
    if (u) log({ actor, action: "Reset password", target: `${u.firstName} ${u.lastName}` });
    persist(); emit();
  },

  upsertRole(role: Role, actor = "Admin") {
    const s = load();
    const idx = s.roles.findIndex((r) => r.key === role.key);
    if (idx >= 0) s.roles[idx] = role; else s.roles.push(role);
    log({ actor, action: idx >= 0 ? "Updated role" : "Created role", target: role.name });
    persist(); emit();
  },

  deleteRole(key: string, actor = "Admin") {
    const s = load();
    const r = s.roles.find((x) => x.key === key);
    if (!r || r.builtIn) return;
    s.roles = s.roles.filter((x) => x.key !== key);
    log({ actor, action: "Deleted role", target: r.name });
    persist(); emit();
  },
};

export function useUsersStore(): State {
  const [, force] = useState(0);
  useEffect(() => usersStore.subscribe(() => force((n) => n + 1)), []);
  return usersStore.get();
}

export const fullName = (u: ClinicUser) => `${u.firstName} ${u.lastName}`.trim();
export const initials = (u: ClinicUser) =>
  `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "U";

export const formatRelative = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};
