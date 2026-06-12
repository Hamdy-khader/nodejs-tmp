import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const patientsListMock = vi.fn();
const patientsCreateMock = vi.fn();
const plansListMock = vi.fn();
const plansCreateMock = vi.fn();
const updateItemMock = vi.fn();

async function loadModule() {
  vi.resetModules();
  vi.doMock("@/lib/admin/api", () => ({
    clinicApi: {
      patients: {
        list: patientsListMock,
        create: patientsCreateMock,
        update: vi.fn(),
        delete: vi.fn(),
      },
      plans: {
        list: plansListMock,
        get: vi.fn(),
        create: plansCreateMock,
        update: vi.fn(),
        delete: vi.fn(),
        saveTeeth: vi.fn(),
        updateTooth: vi.fn(),
        listXrays: vi.fn(),
        addXray: vi.fn(),
        deleteXray: vi.fn(),
        setGeneralStatuses: vi.fn(),
        setRows: vi.fn(),
        createRow: vi.fn(),
        updateRow: vi.fn(),
        deleteRow: vi.fn(),
        createItem: vi.fn(),
        updateItem: updateItemMock,
        deleteItem: vi.fn(),
      },
    },
  }));

  return import("@/lib/patients-store");
}

describe("patients-store", () => {
  beforeEach(() => {
    patientsListMock.mockReset().mockResolvedValue({ data: [] });
    patientsCreateMock.mockReset();
    plansListMock.mockReset().mockResolvedValue([]);
    plansCreateMock.mockReset();
    updateItemMock.mockReset().mockResolvedValue({});
  });

  it("creates a patient and exposes it through the patients hook", async () => {
    patientsCreateMock.mockResolvedValueOnce({
      id: "p-1",
      name: "Alice Smith",
      email: "alice@example.com",
      created_at: "2026-06-12T10:00:00.000Z",
    });

    const mod = await loadModule();
    const { result } = renderHook(() => mod.usePatients());

    await waitFor(() => expect(patientsListMock).toHaveBeenCalled());

    await act(async () => {
      await mod.patientsStore.createPatient({
        name: "Alice Smith",
        email: "alice@example.com",
      });
    });

    expect(result.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "p-1",
          name: "Alice Smith",
          email: "alice@example.com",
        }),
      ]),
    );
  });

  it("creates a default plan when a patient has no plans", async () => {
    plansCreateMock.mockResolvedValueOnce({
      id: "plan-1",
      patient_id: "p-1",
      name: "Your suggested treatment",
      notes: "",
      created_at: "2026-06-12T10:00:00.000Z",
      updated_at: "2026-06-12T10:00:00.000Z",
    });

    const mod = await loadModule();

    const plan = await mod.patientsStore.ensurePlanFor("p-1");

    expect(plansListMock).toHaveBeenCalledWith("p-1");
    expect(plansCreateMock).toHaveBeenCalledWith("p-1", {
      name: "Your suggested treatment",
      notes: "",
    });
    expect(plan).toMatchObject({
      id: "plan-1",
      patientId: "p-1",
      name: "Your suggested treatment",
    });
    expect(plan.teeth[11]).toEqual({ number: 11, status: "intact" });
  });

  it("marks manual price overrides when an item price is edited", async () => {
    plansListMock.mockResolvedValueOnce([
      {
        id: "plan-1",
        patient_id: "p-1",
        name: "Plan A",
        notes: "",
        treatment_rows: [
          {
            id: "row-1",
            kind: "visit",
            items: [
              {
                id: "item-1",
                name: "Filling",
                amount: 1,
                unit_price: 150,
              },
            ],
          },
        ],
        created_at: "2026-06-12T10:00:00.000Z",
        updated_at: "2026-06-12T10:00:00.000Z",
      },
    ]);

    const mod = await loadModule();
    const { result } = renderHook(() => mod.usePlansFor("p-1"));

    await waitFor(() => expect(result.current).toHaveLength(1));

    act(() => {
      mod.patientsStore.updateTreatmentItem("plan-1", "row-1", "item-1", {
        unitPrice: 275,
      });
    });

    const visitRow = result.current[0]?.treatments?.[0];
    if (!visitRow || visitRow.kind !== "visit") {
      throw new Error("Expected a visit row in the test fixture");
    }

    expect(visitRow.items[0]).toMatchObject({
      unitPrice: 275,
      manualPriceOverride: true,
    });
    expect(updateItemMock).toHaveBeenCalledWith("plan-1", "row-1", "item-1", {
      name: "Filling",
      tooth_number: null,
      amount: 1,
      unit_price: 275,
      manual_price_override: true,
    });
  });
});
