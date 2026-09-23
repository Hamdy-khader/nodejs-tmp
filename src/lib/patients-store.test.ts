import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const patientsListMock = vi.fn();
const patientsCreateMock = vi.fn();
const plansListMock = vi.fn();
const plansCreateMock = vi.fn();
const updateItemMock = vi.fn();
const setRowsMock = vi.fn();

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
        setRows: setRowsMock,
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
  it("adds treatments to a real visit rather than the total adjustment", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "visit", kind: "visit", items: [] },
      { id: "adjustment", kind: "visit", note: "Manual total adjustment", items: [{ id: "fee", name: "Price adjustment", amount: 1, unit_price: 100 }] },
    ] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Filling", amount: 1, unitPrice: 150 });
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    const saved = setRowsMock.mock.calls[0][1];
    expect(saved[0].items[0].name).toBe("Filling");
    expect(saved[1].items).toHaveLength(1);
    expect(saved[1].items[0].unit_price).toBe(100);
  });
  beforeEach(() => {
    patientsListMock.mockReset().mockResolvedValue({ data: [] });
    patientsCreateMock.mockReset();
    plansListMock.mockReset().mockResolvedValue([]);
    plansCreateMock.mockReset();
    updateItemMock.mockReset().mockResolvedValue({});
    setRowsMock.mockReset().mockResolvedValue({});
  });

  it("serializes rapid reorder saves and preserves item ordering in the payload", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", name: "Plan", treatment_rows: [
      { id: "v", kind: "visit", sort_order: 1, items: [
        { id: "a", name: "Implant", amount: 1, unit_price: 400, sort_order: 1 },
        { id: "b", name: "Crown", amount: 1, unit_price: 200, sort_order: 2 },
      ] },
      { id: "h", kind: "healing", days: 30, sort_order: 2 },
    ] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    let release!: () => void;
    setRowsMock.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    const first = mod.patientsStore.moveTreatment("plan-1", { kind: "row", id: "h" }, { kind: "row", id: "v" }, "before");
    const second = mod.patientsStore.moveTreatment("plan-1", { kind: "row", id: "h" }, { kind: "row", id: "v" }, "after");
    const third = mod.patientsStore.moveTreatment("plan-1", { kind: "item", id: "b" }, { kind: "item", id: "a" }, "before");
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    expect(setRowsMock.mock.calls[0][1].map((r: { id: string }) => r.id)).toEqual(["h", "v"]);
    release();
    await Promise.all([first, second, third]);
    const saved = setRowsMock.mock.calls[2][1];
    expect(saved.map((r: { id: string }) => r.id)).toEqual(["v", "h"]);
    expect(saved[0].items).toMatchObject([{ id: "b", sort_order: 1 }, { id: "a", sort_order: 2 }]);
    expect(saved[1]).toMatchObject({ days: 30, sort_order: 2 });
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

  it("preserves a price edited while a new visit is still saving", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", treatment_rows: [] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    let release!: () => void;
    setRowsMock.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    mod.patientsStore.addTreatmentRow("plan-1", { id: "visit", kind: "visit", items: [] });
    mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Filling", amount: 2, unitPrice: 150 });
    const { result } = renderHook(() => mod.usePlansFor("p-1"));
    const visit = result.current[0].treatments![0];
    if (visit.kind !== "visit") throw new Error("Expected visit");
    act(() => mod.patientsStore.updateTreatmentItem("plan-1", "visit", visit.items[0].id, { unitPrice: 125.5 }));
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    release();
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(3));
    expect(setRowsMock.mock.calls[2][1][0].items[0]).toMatchObject({
      unit_price: 125.5, amount: 2, manual_price_override: true,
    });
    expect(updateItemMock).not.toHaveBeenCalled();
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
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledWith("plan-1", [expect.objectContaining({
      id: "row-1",
      items: [expect.objectContaining({ name: "Filling", unit_price: 275, manual_price_override: true })],
    })]));

  });
});
