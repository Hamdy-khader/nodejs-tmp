import { useEffect, useState } from "react";
import { clinicApi } from "@/lib/admin/api";

export type UserStatus = "active" | "inactive" | "suspended";
export type RoleKey = "dentist" | "assistant";

export interface Role {
  key: RoleKey;
  name: string;
  color: string;
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
  lastLogin?: string;
  createdAt: string;
  notes?: string;
  tags?: string[];
  twoFactor?: boolean;
  online?: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  loggedAt: string;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failed";
  failureReason?: string;
}

export const SIMPLE_ROLES: Role[] = [
  { key: "dentist", name: "Dentist", color: "from-cyan-600 to-blue-600" },
  { key: "assistant", name: "Assistant", color: "from-emerald-600 to-teal-600" },
];

export const BRANCHES = ["Main Branch", "Downtown", "North Clinic", "Marina"];

interface State {
  users: ClinicUser[];
}

interface UserPasswordPayload {
  password: string;
  password_confirmation: string;
}

let state: State = {
  users: [],
};

const listeners = new Set<() => void>();
let loaded = false;
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function normalizeRole(value: unknown): RoleKey {
  return value === "dentist" ? "dentist" : "assistant";
}

function normalizeStatus(value: unknown): UserStatus {
  return value === "inactive" || value === "suspended" ? value : "active";
}

function toUser(raw: Record<string, unknown>): ClinicUser {
  return {
    id: String(raw.id ?? ""),
    firstName: String(raw.first_name ?? raw.firstName ?? ""),
    lastName: String(raw.last_name ?? raw.lastName ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : undefined,
    role: normalizeRole(raw.role),
    status: normalizeStatus(raw.status),
    branch: String(raw.branch ?? ""),
    department: raw.department ? String(raw.department) : undefined,
    specialty: raw.specialty ? String(raw.specialty) : undefined,
    licenseNumber: raw.license_number ? String(raw.license_number) : undefined,
    experienceYears: raw.experience_years === undefined ? undefined : Number(raw.experience_years),
    gender: raw.gender ? String(raw.gender) as ClinicUser["gender"] : undefined,
    dob: raw.dob ? String(raw.dob) : undefined,
    workingHours: raw.working_hours ? String(raw.working_hours) : undefined,
    calendarColor: raw.calendar_color ? String(raw.calendar_color) : undefined,
    lastLogin: raw.last_login ? String(raw.last_login) : raw.last_login_at ? String(raw.last_login_at) : undefined,
    createdAt: String(raw.created_at ?? new Date().toISOString()),
    notes: raw.notes ? String(raw.notes) : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : undefined,
    twoFactor: Boolean(raw.two_factor),
    online: Boolean(raw.online),
  };
}

function toLoginHistory(raw: Record<string, unknown>): LoginHistoryEntry {
  return {
    id: String(raw.id ?? ""),
    loggedAt: String(raw.logged_at ?? raw.created_at ?? new Date().toISOString()),
    ipAddress: raw.ip_address ? String(raw.ip_address) : undefined,
    userAgent: raw.user_agent ? String(raw.user_agent) : undefined,
    status: raw.status === "failed" ? "failed" : "success",
    failureReason: raw.failure_reason ? String(raw.failure_reason) : undefined,
  };
}

async function load(force = false) {
  if (!force && loaded) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const usersRes = await clinicApi.users.list({ limit: 200 });
      state = {
        users: usersRes.data.map((item) => toUser(item)),
      };
      loaded = true;
      emit();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export const usersStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  async reload() {
    await load(true);
  },

  async upsertUser(user: ClinicUser, passwordPayload?: UserPasswordPayload) {
    const body = {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatarUrl ?? null,
      role: user.role,
      status: user.status,
      branch: user.branch,
      department: user.department ?? null,
      specialty: user.specialty ?? null,
      license_number: user.licenseNumber ?? null,
      experience_years: user.experienceYears ?? null,
      gender: user.gender ?? null,
      dob: user.dob ?? null,
      working_hours: user.workingHours ?? null,
      calendar_color: user.calendarColor ?? null,
      notes: user.notes ?? null,
      tags: user.tags ?? [],
      two_factor: user.twoFactor ?? false,
    };

    if (user.id) {
      await clinicApi.users.update(user.id, body);
    } else {
      await clinicApi.users.create({ ...body, ...passwordPayload });
    }

    await load(true);
  },

  async deleteUser(id: string) {
    await clinicApi.users.delete(id);
    await load(true);
  },

  async setStatus(id: string, status: UserStatus) {
    await clinicApi.users.update(id, { status });
    await load(true);
  },

  async changePassword(id: string, password: string, passwordConfirmation: string) {
    await clinicApi.users.changePassword(id, {
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async getLoginHistory(id: string) {
    const response = await clinicApi.users.loginHistory(id, { limit: 50 });
    return response.data.map((item) => toLoginHistory(item));
  },
};

export function useUsersStore(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = usersStore.subscribe(() => force((count) => count + 1));
    void load();
    return unsub;
  }, []);
  return usersStore.get();
}

export const roleByKey = (key: RoleKey) => SIMPLE_ROLES.find((role) => role.key === key);
export const fullName = (user: ClinicUser) => `${user.firstName} ${user.lastName}`.trim();
export const initials = (user: ClinicUser) =>
  `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";

export const formatRelative = (iso?: string) => {
  if (!iso) return "-";
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
