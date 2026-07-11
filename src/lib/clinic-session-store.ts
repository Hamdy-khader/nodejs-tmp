import { useEffect, useSyncExternalStore } from "react";
import { clinicApi, type Clinic, type ClinicUser } from "@/lib/admin/api";

interface ClinicSessionState {
  clinic: Clinic | null;
  clinicUser: ClinicUser | null;
}

let state: ClinicSessionState = {
  clinic: null,
  clinicUser: null,
};

const listeners = new Set<() => void>();
let loaded = false;
let inflight: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function loadSession(force = false) {
  if (!force && loaded) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { clinic, clinic_user } = await clinicApi.me();
      state = {
        clinic,
        clinicUser: clinic_user,
      };
      loaded = true;
      emit();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useClinicSession() {
  useEffect(() => {
    void loadSession();
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const clinicSessionStore = {
  async reload() {
    await loadSession(true);
  },
};
