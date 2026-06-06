import { useEffect, useState } from "react";
import { clinicApi } from "@/lib/admin/api";

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
  | string;

export interface Permission {
  key: string;
  group: string;
  label: string;
}

export interface Role {
  key: RoleKey;
  name: string;
  description: string;
  color: string;
  builtIn: boolean;
  permissions: string[];
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

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  details?: string;
}

export const ALL_PERMISSIONS: Permission[] = [];
export const DEFAULT_ROLES: Role[] = [];
export const BRANCHES = ["Main Branch", "Downtown", "North Clinic", "Marina"];

interface State {
  users: ClinicUser[];
  roles: Role[];
  logs: AuditLog[];
  permissions: Permission[];
}

interface UserPasswordPayload {
  password: string;
  password_confirmation: string;
}

let state: State = {
  users: [],
  roles: [],
  logs: [],
  permissions: [],
};

const listeners = new Set<() => void>();
let loaded = false;
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function toUser(raw: Record<string, unknown>): ClinicUser {
  return {
    id: String(raw.id ?? ""),
    firstName: String(raw.first_name ?? raw.firstName ?? ""),
    lastName: String(raw.last_name ?? raw.lastName ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    avatarUrl: raw.avatar_url ? String(raw.avatar_url) : undefined,
    role: String(raw.role ?? "viewer"),
    status: String(raw.status ?? "active") as UserStatus,
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

function toRole(raw: Record<string, unknown>): Role {
  return {
    key: String(raw.key ?? raw.id ?? ""),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    color: String(raw.color ?? "from-slate-400 to-slate-500"),
    builtIn: Boolean(raw.built_in),
    permissions: Array.isArray(raw.permissions) ? raw.permissions.map(String) : [],
  };
}

function toPermission(raw: Record<string, unknown>): Permission {
  return {
    key: String(raw.key ?? ""),
    group: String(raw.group ?? raw.group_name ?? "General"),
    label: String(raw.label ?? ""),
  };
}

function toAudit(raw: Record<string, unknown>): AuditLog {
  return {
    id: String(raw.id ?? ""),
    at: String(raw.at ?? raw.created_at ?? new Date().toISOString()),
    actor: String(raw.actor ?? ""),
    action: String(raw.action ?? ""),
    target: raw.target ? String(raw.target) : undefined,
    details: raw.details ? String(raw.details) : undefined,
  };
}

async function load(force = false) {
  if (!force && loaded) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [usersRes, rolesRes, permissionsRes, logsRes] = await Promise.all([
        clinicApi.users.list({ limit: 200 }),
        clinicApi.roles.list(),
        clinicApi.permissions.list(),
        clinicApi.auditLogs.list({ limit: 200 }),
      ]);

      const rolesData = Array.isArray(rolesRes) ? rolesRes : (rolesRes.data ?? []);
      const permissionsData = Array.isArray(permissionsRes) ? permissionsRes : (permissionsRes.data ?? []);

      const mappedRoles = rolesData.map((item) => toRole(item));
      const mappedPermissions = permissionsData.map((item) => toPermission(item));
      state = {
        users: usersRes.data.map((item) => toUser(item)),
        roles: mappedRoles,
        permissions: mappedPermissions,
        logs: logsRes.data.map((item) => toAudit(item)),
      };
      DEFAULT_ROLES.splice(0, DEFAULT_ROLES.length, ...mappedRoles);
      ALL_PERMISSIONS.splice(0, ALL_PERMISSIONS.length, ...mappedPermissions);

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
    return () => listeners.delete(listener);
  },

  async reload() {
    await load(true);
  },

  async upsertUser(user: ClinicUser, passwordPayload?: UserPasswordPayload) {
    if (user.id) {
      await clinicApi.users.update(user.id, {
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
      });
    } else {
      await clinicApi.users.create({
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        ...passwordPayload,
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
      });
    }
    await load(true);
  },

  async deleteUsers(ids: string[]) {
    await Promise.all(ids.map((id) => clinicApi.users.delete(id)));
    await load(true);
  },

  async setStatus(ids: string[], status: UserStatus) {
    await clinicApi.users.bulkStatus({ user_ids: ids, status });
    await load(true);
  },

  async changeRole(ids: string[], role: RoleKey) {
    await clinicApi.users.bulkRole({ user_ids: ids, role });
    await load(true);
  },

  async resetPassword(id: string) {
    await clinicApi.users.resetPassword(id);
  },

  async upsertRole(role: Role) {
    if (state.roles.some((item) => item.key === role.key)) {
      await clinicApi.roles.update(role.key, {
        key: role.key,
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
      });
    } else {
      await clinicApi.roles.create({
        key: role.key,
        name: role.name,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
      });
    }
    await load(true);
  },

  async deleteRole(key: string) {
    await clinicApi.roles.delete(key);
    await load(true);
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
