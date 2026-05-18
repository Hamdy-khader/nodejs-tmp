/**
 * BrightPlans — Admin & Clinic API Client
 *
 * Two completely separate auth systems:
 *  - Admin:  uses 'bp_admin_token' → /api/admin/*
 *  - Clinic: uses 'bp_clinic_token' → /api/clinic/*
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

// ─── Token stores (separate keys) ────────────────────────────────────────────

export const adminTokenStore = {
  key: "bp_admin_token",
  get: (): string | null => localStorage.getItem("bp_admin_token"),
  set: (t: string): void => localStorage.setItem("bp_admin_token", t),
  clear: (): void => localStorage.removeItem("bp_admin_token"),
  exists: (): boolean => Boolean(localStorage.getItem("bp_admin_token")),
};

export const clinicTokenStore = {
  key: "bp_clinic_token",
  get: (): string | null => localStorage.getItem("bp_clinic_token"),
  set: (t: string): void => localStorage.setItem("bp_clinic_token", t),
  clear: (): void => localStorage.removeItem("bp_clinic_token"),
  exists: (): boolean => Boolean(localStorage.getItem("bp_clinic_token")),
};

// ─── Error class ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export interface Clinic {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  website_url: string | null;
  logo: string | null;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  status: "active" | "suspended";
  notes: string | null;
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicUser {
  id: number;
  clinic_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: "clinic_owner" | "clinic_admin" | "clinic_staff";
  status: "active" | "inactive";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  clinic?: {
    id: number;
    name: string;
    status: string;
  };
}

export interface Pagination {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: Pagination;
}

export interface DashboardStats {
  totalClinics: number;
  activeClinics: number;
  suspendedClinics: number;
  totalClinicUsers: number;
  newClinicsThisMonth: number;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const e = json?.error ?? {};
    throw new ApiError(
      e.code ?? "UNKNOWN_ERROR",
      e.message ?? `Request failed (${res.status})`,
      res.status,
      e.errors,
    );
  }

  // Paginated response: backend returns { success, data: [...], meta: {...} }
  if (json?.meta !== undefined) {
    return { data: json.data, meta: json.meta } as T;
  }

  return (json?.data ?? json) as T;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

function adminReq<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  return request<T>(method, path, adminTokenStore.get(), body, params);
}

export const adminApi = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; admin: AdminUser }> => {
    const res = await request<{ token: string; admin: AdminUser }>(
      "POST",
      "/admin/login",
      null,
      { email, password },
    );
    adminTokenStore.set(res.token);
    return res;
  },

  logout: async (): Promise<void> => {
    await adminReq("POST", "/admin/logout").catch(() => null);
    adminTokenStore.clear();
  },

  me: (): Promise<AdminUser> => adminReq("GET", "/admin/me"),

  dashboard: (): Promise<DashboardStats> => adminReq("GET", "/admin/stats"),

  // Clinics
  clinics: {
    list: (params?: {
      q?: string;
      status?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Clinic>> =>
      adminReq("GET", "/admin/clinics", undefined, params as Record<string, string | number | boolean | undefined>),

    get: (id: number): Promise<Clinic> =>
      adminReq("GET", `/admin/clinics/${id}`),

    create: (data: Record<string, unknown>): Promise<Clinic> =>
      adminReq("POST", "/admin/clinics", data),

    update: (id: number, data: Record<string, unknown>): Promise<Clinic> =>
      adminReq("PUT", `/admin/clinics/${id}`, data),

    delete: (id: number): Promise<void> =>
      adminReq("DELETE", `/admin/clinics/${id}`),

    suspend: (id: number): Promise<Clinic> =>
      adminReq("PATCH", `/admin/clinics/${id}/suspend`),

    activate: (id: number): Promise<Clinic> =>
      adminReq("PATCH", `/admin/clinics/${id}/activate`),
  },

  // Clinic Users
  clinicUsers: {
    list: (
      clinicId: number,
      params?: { q?: string; status?: string; role?: string; page?: number; limit?: number },
    ): Promise<PaginatedResponse<ClinicUser>> =>
      adminReq("GET", `/admin/clinics/${clinicId}/users`, undefined, params as Record<string, string | number | boolean | undefined>),

    get: (id: number): Promise<ClinicUser> =>
      adminReq("GET", `/admin/clinic-users/${id}`),

    create: (clinicId: number, data: Record<string, unknown>): Promise<ClinicUser> =>
      adminReq("POST", `/admin/clinics/${clinicId}/users`, data),

    update: (id: number, data: Record<string, unknown>): Promise<ClinicUser> =>
      adminReq("PUT", `/admin/clinic-users/${id}`, data),

    delete: (id: number): Promise<void> =>
      adminReq("DELETE", `/admin/clinic-users/${id}`),

    activate: (id: number): Promise<ClinicUser> =>
      adminReq("PATCH", `/admin/clinic-users/${id}/activate`),

    deactivate: (id: number): Promise<ClinicUser> =>
      adminReq("PATCH", `/admin/clinic-users/${id}/deactivate`),
  },
};

// ─── Clinic User API ──────────────────────────────────────────────────────────

function clinicReq<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(method, path, clinicTokenStore.get(), body);
}

export interface ClinicAuthData {
  token: string;
  clinic_user: ClinicUser;
  clinic: Clinic;
}

// ─── Pricelist Types ──────────────────────────────────────────────────────────

export interface PricelistSettings {
  language: string;
  currency_code: string;
  currency_label: string;
  currency_symbol: string;
}

export interface PricelistItem {
  id: string;
  name: string;
  price: number;
  note: string;
}

export interface PricelistGroup {
  id: string;
  title: string;
  price_label: string | null;
  items: PricelistItem[];
}

export interface PricelistSection {
  id: string;
  n: number | null;
  label: string;
  icon: string;
  groups: PricelistGroup[];
}

export interface PricelistData {
  settings: PricelistSettings;
  sections: PricelistSection[];
}

// ─── Clinic API ───────────────────────────────────────────────────────────────

export const clinicApi = {
  login: async (email: string, password: string): Promise<ClinicAuthData> => {
    const res = await request<ClinicAuthData>("POST", "/clinic/login", null, { email, password });
    clinicTokenStore.set(res.token);
    return res;
  },

  logout: async (): Promise<void> => {
    await clinicReq("POST", "/clinic/logout").catch(() => null);
    clinicTokenStore.clear();
  },

  me: (): Promise<{ clinic_user: ClinicUser; clinic: Clinic }> =>
    clinicReq("GET", "/clinic/me"),

  pricelist: {
    get: (): Promise<PricelistData> =>
      clinicReq("GET", "/clinic/pricelist"),

    save: (data: PricelistData): Promise<PricelistData> =>
      clinicReq("PUT", "/clinic/pricelist", data),

    addItem: (body: { group_id: string; name: string; price: number; note: string }): Promise<PricelistItem> =>
      clinicReq("POST", "/clinic/pricelist/items", body),

    updateItem: (id: string, patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>): Promise<PricelistItem> =>
      clinicReq("PATCH", `/clinic/pricelist/items/${id}`, patch),

    deleteItem: (id: string): Promise<void> =>
      clinicReq("DELETE", `/clinic/pricelist/items/${id}`),
  },
};
