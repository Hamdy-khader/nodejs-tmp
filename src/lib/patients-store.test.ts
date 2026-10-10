import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const patientsListMock = vi.fn();
const patientsCreateMock = vi.fn();
const plansListMock = vi.fn();
const plansCreateMock = vi.fn();
const plansGetMock = vi.fn();
const updateItemMock = vi.fn();
const setRowsMock = vi.fn();
const deleteXrayMock = vi.fn();

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
        get: plansGetMock,
        create: plansCreateMock,
        update: vi.fn(),
        delete: vi.fn(),
        saveTeeth: vi.fn(),
        updateTooth: vi.fn(),
        listXrays: vi.fn(),
        addXray: vi.fn(),
        deleteXray: deleteXrayMock,
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
  it("only removes an X-ray after the server confirms deletion", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", xrays: [{ id: "x", url: "/x.png", sort_order: 1 }, { id: "y", url: "/y.png", sort_order: 2 }] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    deleteXrayMock.mockRejectedValueOnce(new Error("Delete failed"));
    await expect(mod.patientsStore.removeXray("plan-1", "x")).rejects.toThrow("Delete failed");
    const { result } = renderHook(() => mod.usePlansFor("p-1"));
    expect(result.current[0].xrays?.map(xray => xray.id)).toEqual(["x", "y"]);
    await act(async () => { await mod.patientsStore.removeXray("plan-1", "x"); });
    expect(result.current[0].xrays?.map(xray => xray.id)).toEqual(["y"]);
    expect(deleteXrayMock).toHaveBeenCalledWith("plan-1", "x");
  });

  it("preserves price modes and other visits when editing assigned teeth", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "v", kind: "visit", items: [
        { id: "a", name: "Veneer", tooth_number: 11, amount: 1, unit_price: 500, price_mode: "package" },
        { id: "b", name: "Veneer", tooth_number: 12, amount: 1, unit_price: 500, price_mode: "package" },
        { id: "c", name: "Filling", tooth_number: 13, amount: 1, unit_price: 100, price_mode: "free" },
      ] },
      { id: "v2", kind: "visit", items: [{ id: "d", name: "Review", amount: 1, unit_price: 50, price_mode: "in-package" }] },
    ] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    await mod.patientsStore.setTreatmentItemTeeth("plan-1", "v", ["a", "b"], [11, 12, 21]);
    const saved = setRowsMock.mock.calls[0][1];
    expect(saved[0].items).toMatchObject([
      { id: "a", tooth_number: 11, price_mode: "package", amount: 1 },
      { id: "b", tooth_number: 12, price_mode: "package", amount: 1 },
      { tooth_number: 21, price_mode: "package", amount: 1 },
      { id: "c", price_mode: "free" },
    ]);
    expect(saved[1].items[0]).toMatchObject({ id: "d", price_mode: "in-package" });
  });
  it("saves grouped price changes atomically and deletes the full group without losing other treatments", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "v", kind: "visit", items: [
        { id: "a", name: "Veneer", tooth_number: 11, amount: 1, unit_price: 265 },
        { id: "b", name: "Veneer", tooth_number: 12, amount: 1, unit_price: 265 },
        { id: "c", name: "Filling", tooth_number: 13, amount: 1, unit_price: 100 },
      ] },
    ] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    mod.patientsStore.updateTreatmentItems("plan-1", "v", { a: { unitPrice: 200 }, b: { unitPrice: 200 } });
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    expect(setRowsMock.mock.calls[0][1][0].items).toMatchObject([
      { id: "a", tooth_number: 11, unit_price: 200, manual_price_override: true },
      { id: "b", tooth_number: 12, unit_price: 200, manual_price_override: true },
      { id: "c", tooth_number: 13, unit_price: 100 },
    ]);
    mod.patientsStore.removeTreatmentItems("plan-1", "v", ["a", "b"]);
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(2));
    expect(setRowsMock.mock.calls[1][1][0].items).toMatchObject([{ id: "c", unit_price: 100 }]);
    expect(setRowsMock.mock.calls[1][1][0].items).toHaveLength(1);
  });
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
    plansGetMock.mockReset();
    updateItemMock.mockReset().mockResolvedValue({});
    setRowsMock.mockReset().mockResolvedValue({});
    deleteXrayMock.mockReset().mockResolvedValue(undefined);
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

  it("waits for all saved visits before exposing a summary plan for editing", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", name: "Summary" }]);
    let finish!: (plan: unknown) => void;
    plansGetMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    const { result } = renderHook(() => mod.usePlan("plan-1", "p-1"));
    expect(result.current).toBeUndefined();
    await act(async () => finish({ id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "v1", kind: "visit", items: [{ id: "a", name: "Old treatment", amount: 1, unit_price: 100 }] },
    ] }));
    expect(result.current?.treatments?.[0]).toMatchObject({ id: "v1", items: [{ name: "Old treatment" }] });
  });

  it("appends across visits during slow saves and keeps the final server IDs", async () => {
    plansListMock.mockResolvedValueOnce([{ id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "1", kind: "visit", items: [{ id: "10", name: "Filling", tooth_number: 11, amount: 1, unit_price: 100 }] },
    ] }]);
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    let finish!: (response: unknown) => void;
    setRowsMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Root canal", toothNumber: 11, amount: 1, unitPrice: 200 });
    mod.patientsStore.addTreatmentRow("plan-1", { id: "new-visit", kind: "visit", items: [] });
    mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Crown", toothNumber: 11, amount: 1, unitPrice: 300 });
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    const finalRows = [
      { id: 1, kind: "visit", items: [
        { id: 10, name: "Filling", tooth_number: 11, amount: 1, unit_price: 100 },
        { id: 11, name: "Root canal", tooth_number: 11, amount: 1, unit_price: 200 },
      ] },
      { id: 2, kind: "visit", items: [{ id: 12, name: "Crown", tooth_number: 11, amount: 1, unit_price: 300 }] },
    ];
    setRowsMock.mockResolvedValueOnce({ treatment_rows: [] }).mockResolvedValueOnce({ treatment_rows: finalRows });
    finish({ treatment_rows: [finalRows[0]] });
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(3));
    const saved = setRowsMock.mock.calls[2][1];
    expect(saved[0].items.map((item: { name: string }) => item.name)).toEqual(["Filling", "Root canal"]);
    expect(saved[1].items.map((item: { name: string }) => item.name)).toEqual(["Crown"]);
    mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Veneer", toothNumber: 12, amount: 1, unitPrice: 400 });
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(4));
    expect(setRowsMock.mock.calls[3][1][1]).toMatchObject({ id: "2", items: [{ id: "12", name: "Crown" }, { name: "Veneer" }] });
  });

  it("does not erase an added treatment when an older plan fetch finishes late", async () => {
    const serverPlan = { id: "plan-1", patient_id: "p-1", treatment_rows: [
      { id: "visit", kind: "visit", items: [{ id: "old", name: "Filling", tooth_number: 11, amount: 1, unit_price: 100 }] },
    ] };
    plansListMock.mockResolvedValueOnce([serverPlan]);
    let finish!: (plan: typeof serverPlan) => void;
    plansGetMock.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const mod = await loadModule();
    await mod.patientsStore.ensurePlanFor("p-1");
    const { result } = renderHook(() => mod.usePlan("plan-1", "p-1"));
    act(() => mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Root canal", toothNumber: 11, amount: 1, unitPrice: 200 }));
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(1));
    await act(async () => finish(serverPlan));
    const row = result.current?.treatments?.[0];
    expect(row?.kind === "visit" && row.items.map((item) => item.name)).toEqual(["Filling", "Root canal"]);
    act(() => mod.patientsStore.addTreatmentItemToLastVisit("plan-1", { name: "Crown", toothNumber: 11, amount: 1, unitPrice: 300 }));
    await waitFor(() => expect(setRowsMock).toHaveBeenCalledTimes(2));
    expect(setRowsMock.mock.calls[1][1][0].items.map((item: { name: string }) => item.name)).toEqual(["Filling", "Root canal", "Crown"]);
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
