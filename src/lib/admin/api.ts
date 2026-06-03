/**
 * BrightPlans - Admin & Clinic API Client
 *
 * Two separate auth systems:
 *  - Admin  -> /admin/*
 *  - Clinic -> /clinic/*
 */

const API_BASE = import.meta.env.VITE_API_URL ?? "https://backend.treatlyonline.de/api";

function storageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const adminTokenStore = {
  key: "bp_admin_token",
  get: (): string | null => (storageAvailable() ? window.localStorage.getItem("bp_admin_token") : null),
  set: (t: string): void => {
    if (storageAvailable()) window.localStorage.setItem("bp_admin_token", t);
  },
  clear: (): void => {
    if (storageAvailable()) window.localStorage.removeItem("bp_admin_token");
  },
  exists: (): boolean => Boolean(adminTokenStore.get()),
};

export const clinicTokenStore = {
  key: "bp_clinic_token",
  get: (): string | null => (storageAvailable() ? window.localStorage.getItem("bp_clinic_token") : null),
  set: (t: string): void => {
    if (storageAvailable()) window.localStorage.setItem("bp_clinic_token", t);
  },
  clear: (): void => {
    if (storageAvailable()) window.localStorage.removeItem("bp_clinic_token");
  },
  exists: (): boolean => Boolean(clinicTokenStore.get()),
};

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
  role: string;
  status: string;
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

export interface ClinicAuthData {
  token: string;
  clinic_user: ClinicUser;
  clinic: Clinic;
}

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { bodyEncoding?: "json" | "form" },
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const bodyEncoding = options?.bodyEncoding ?? "json";

  if (body != null) {
    headers["Content-Type"] =
      bodyEncoding === "form"
        ? "application/x-www-form-urlencoded;charset=UTF-8"
        : "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const requestBody =
    body == null
      ? undefined
      : bodyEncoding === "form"
        ? new URLSearchParams(
            Object.entries(body as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
              if (value != null) acc[key] = String(value);
              return acc;
            }, {}),
          ).toString()
        : JSON.stringify(body);

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: requestBody,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = json?.error ?? json ?? {};
    throw new ApiError(
      err.code ?? "UNKNOWN_ERROR",
      err.message ?? `Request failed (${res.status})`,
      res.status,
      err.errors,
    );
  }

  if (json?.meta !== undefined) {
    return { data: json.data ?? [], meta: json.meta } as T;
  }

  return (json?.data ?? json) as T;
}

function adminReq<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  return request<T>(method, path, adminTokenStore.get(), body, params);
}

function clinicReq<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  return request<T>(method, path, clinicTokenStore.get(), body, params);
}

export const adminApi = {
  login: async (email: string, password: string): Promise<{ token: string; admin: AdminUser }> => {
    const res = await request<{ token: string; admin: AdminUser }>(
      "POST",
      "/admin/login",
      null,
      { email, password },
      undefined,
      { bodyEncoding: "form" },
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

  clinics: {
    list: (params?: {
      q?: string;
      status?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Clinic>> =>
      adminReq(
        "GET",
        "/admin/clinics",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),

    get: (id: number): Promise<Clinic> => adminReq("GET", `/admin/clinics/${id}`),
    create: (data: Record<string, unknown>): Promise<Clinic> => adminReq("POST", "/admin/clinics", data),
    update: (id: number, data: Record<string, unknown>): Promise<Clinic> =>
      adminReq("PUT", `/admin/clinics/${id}`, data),
    delete: (id: number): Promise<void> => adminReq("DELETE", `/admin/clinics/${id}`),
    suspend: (id: number): Promise<Clinic> => adminReq("PATCH", `/admin/clinics/${id}/suspend`),
    activate: (id: number): Promise<Clinic> => adminReq("PATCH", `/admin/clinics/${id}/activate`),
  },

  clinicUsers: {
    list: (
      clinicId: number,
      params?: { q?: string; status?: string; role?: string; page?: number; limit?: number },
    ): Promise<PaginatedResponse<ClinicUser>> =>
      adminReq(
        "GET",
        `/admin/clinics/${clinicId}/users`,
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
    get: (id: number): Promise<ClinicUser> => adminReq("GET", `/admin/clinic-users/${id}`),
    create: (clinicId: number, data: Record<string, unknown>): Promise<ClinicUser> =>
      adminReq("POST", `/admin/clinics/${clinicId}/users`, data),
    update: (id: number, data: Record<string, unknown>): Promise<ClinicUser> =>
      adminReq("PUT", `/admin/clinic-users/${id}`, data),
    delete: (id: number): Promise<void> => adminReq("DELETE", `/admin/clinic-users/${id}`),
    activate: (id: number): Promise<ClinicUser> => adminReq("PATCH", `/admin/clinic-users/${id}/activate`),
    deactivate: (id: number): Promise<ClinicUser> =>
      adminReq("PATCH", `/admin/clinic-users/${id}/deactivate`),
  },
};

export const clinicApi = {
  login: async (email: string, password: string): Promise<ClinicAuthData> => {
    const res = await request<ClinicAuthData>(
      "POST",
      "/clinic/login",
      null,
      { email, password },
      undefined,
      { bodyEncoding: "form" },
    );
    clinicTokenStore.set(res.token);
    return res;
  },

  logout: async (): Promise<void> => {
    await clinicReq("POST", "/clinic/logout").catch(() => null);
    clinicTokenStore.clear();
  },

  me: (): Promise<{ clinic_user: ClinicUser; clinic: Clinic }> => clinicReq("GET", "/clinic/me"),

  pricelist: {
    get: (): Promise<PricelistData> => clinicReq("GET", "/clinic/pricelist"),
    save: (data: PricelistData): Promise<PricelistData> => clinicReq("PUT", "/clinic/pricelist", data),
    addItem: (body: { group_id: string; name: string; price: number; note: string }): Promise<PricelistItem> =>
      clinicReq("POST", "/clinic/pricelist/items", body),
    updateItem: (
      id: string,
      patch: Partial<Pick<PricelistItem, "name" | "price" | "note">>,
    ): Promise<PricelistItem> => clinicReq("PATCH", `/clinic/pricelist/items/${id}`, patch),
    deleteItem: (id: string): Promise<void> => clinicReq("DELETE", `/clinic/pricelist/items/${id}`),
  },

  patients: {
    list: (params?: {
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
      order?: string;
    }): Promise<PaginatedResponse<Record<string, unknown>>> =>
      clinicReq(
        "GET",
        "/clinic/patients",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
    get: (id: string): Promise<Record<string, unknown>> => clinicReq("GET", `/clinic/patients/${id}`),
    create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", "/clinic/patients", body),
    update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", `/clinic/patients/${id}`, body),
    delete: (id: string): Promise<void> => clinicReq("DELETE", `/clinic/patients/${id}`),
  },

  plans: {
    list: (patientId: string): Promise<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]> =>
      clinicReq("GET", `/clinic/patients/${patientId}/plans`),
    get: (patientId: string, planId: string): Promise<Record<string, unknown>> =>
      clinicReq("GET", `/clinic/patients/${patientId}/plans/${planId}`),
    create: (patientId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", `/clinic/patients/${patientId}/plans`, body),
    update: (patientId: string, planId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", `/clinic/patients/${patientId}/plans/${planId}`, body),
    delete: (patientId: string, planId: string): Promise<void> =>
      clinicReq("DELETE", `/clinic/patients/${patientId}/plans/${planId}`),
    saveTeeth: (planId: string, teeth: unknown[]): Promise<unknown> =>
      clinicReq("PUT", `/clinic/plans/${planId}/teeth`, { teeth }),
    updateTooth: (planId: string, toothNumber: number, body: Record<string, unknown>): Promise<unknown> =>
      clinicReq("PATCH", `/clinic/plans/${planId}/teeth/${toothNumber}`, body),
    addXray: (planId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", `/clinic/plans/${planId}/xrays`, body),
    deleteXray: (planId: string, xrayId: string): Promise<void> =>
      clinicReq("DELETE", `/clinic/plans/${planId}/xrays/${xrayId}`),
    setGeneralStatuses: (planId: string, items: { label: string }[]): Promise<unknown> =>
      clinicReq("PUT", `/clinic/plans/${planId}/general-statuses`, { items }),
    setRows: (planId: string, rows: unknown[]): Promise<unknown> =>
      clinicReq("PUT", `/clinic/plans/${planId}/rows`, { rows }),
    createRow: (planId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", `/clinic/plans/${planId}/rows`, body),
    updateRow: (planId: string, rowId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PATCH", `/clinic/plans/${planId}/rows/${rowId}`, body),
    deleteRow: (planId: string, rowId: string): Promise<void> =>
      clinicReq("DELETE", `/clinic/plans/${planId}/rows/${rowId}`),
    createItem: (planId: string, rowId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", `/clinic/plans/${planId}/rows/${rowId}/items`, body),
    updateItem: (
      planId: string,
      rowId: string,
      itemId: string,
      body: Record<string, unknown>,
    ): Promise<Record<string, unknown>> =>
      clinicReq("PATCH", `/clinic/plans/${planId}/rows/${rowId}/items/${itemId}`, body),
    deleteItem: (planId: string, rowId: string, itemId: string): Promise<void> =>
      clinicReq("DELETE", `/clinic/plans/${planId}/rows/${rowId}/items/${itemId}`),
  },

  templates: {
    list: (params?: { category?: string; language?: string }): Promise<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]> =>
      clinicReq(
        "GET",
        "/clinic/templates",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
    get: (id: string): Promise<Record<string, unknown>> => clinicReq("GET", `/clinic/templates/${id}`),
    create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", "/clinic/templates", body),
    update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", `/clinic/templates/${id}`, body),
    delete: (id: string): Promise<void> => clinicReq("DELETE", `/clinic/templates/${id}`),
    reorder: (body: { category: string; ordered_ids: string[] }): Promise<unknown> =>
      clinicReq("PUT", "/clinic/templates/reorder", body),
  },

  documents: {
    get: (): Promise<Record<string, unknown>> => clinicReq("GET", "/clinic/document-presets"),
    save: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", "/clinic/document-presets", body),
    reset: (): Promise<Record<string, unknown>> => clinicReq("POST", "/clinic/document-presets/reset"),
  },

  planSettings: {
    get: (): Promise<Record<string, unknown>> => clinicReq("GET", "/clinic/plan-settings"),
    update: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", "/clinic/plan-settings", body),
  },

  users: {
    list: (params?: {
      role?: string;
      status?: string;
      branch?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Record<string, unknown>>> =>
      clinicReq(
        "GET",
        "/clinic/users",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
    get: (id: string): Promise<Record<string, unknown>> => clinicReq("GET", `/clinic/users/${id}`),
    create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", "/clinic/users", body),
    update: (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", `/clinic/users/${id}`, body),
    delete: (id: string): Promise<void> => clinicReq("DELETE", `/clinic/users/${id}`),
    bulkStatus: (body: { user_ids: string[]; status: string }): Promise<unknown> =>
      clinicReq("POST", "/clinic/users/bulk-status", body),
    bulkRole: (body: { user_ids: string[]; role: string }): Promise<unknown> =>
      clinicReq("POST", "/clinic/users/bulk-role", body),
    resetPassword: (id: string): Promise<unknown> =>
      clinicReq("POST", `/clinic/users/${id}/reset-password`),
  },

  roles: {
    list: (): Promise<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]> =>
      clinicReq("GET", "/clinic/roles"),
    create: (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("POST", "/clinic/roles", body),
    update: (roleKey: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
      clinicReq("PUT", `/clinic/roles/${roleKey}`, body),
    delete: (roleKey: string): Promise<void> => clinicReq("DELETE", `/clinic/roles/${roleKey}`),
  },

  permissions: {
    list: (): Promise<{ data?: Record<string, unknown>[] } | Record<string, unknown>[]> =>
      clinicReq("GET", "/clinic/permissions"),
  },

  auditLogs: {
    list: (params?: {
      actor?: string;
      action?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Record<string, unknown>>> =>
      clinicReq(
        "GET",
        "/clinic/audit-logs",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
  },

  overview: {
    stats: (): Promise<Record<string, unknown>> => clinicReq("GET", "/clinic/overview/stats"),
    revenue: (params?: { from?: string; to?: string; group?: string }): Promise<Record<string, unknown>> =>
      clinicReq(
        "GET",
        "/clinic/overview/revenue",
        undefined,
        params as Record<string, string | number | boolean | undefined>,
      ),
  },
};
