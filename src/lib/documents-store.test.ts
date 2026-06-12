import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const saveMock = vi.fn();
const getMock = vi.fn();
const resetMock = vi.fn();

async function loadModule() {
  vi.resetModules();
  vi.doMock("@/lib/admin/api", () => ({
    clinicApi: {
      documents: {
        get: getMock,
        save: saveMock,
        reset: resetMock,
      },
    },
  }));

  return import("@/lib/documents-store");
}

describe("documents-store", () => {
  beforeEach(() => {
    saveMock.mockReset().mockResolvedValue({});
    getMock.mockReset().mockResolvedValue({});
    resetMock.mockReset().mockResolvedValue({});
  });

  it("loads remote selected ids and order into the hooks", async () => {
    getMock.mockResolvedValueOnce({
      selected_ids: ["fixed:clinic:demo", "custom:block"],
      order: { clinic: ["custom:block"], treatments: ["tx-1"] },
    });

    const mod = await loadModule();
    const { result } = renderHook(() => ({
      selectedIds: mod.useSelectedIds(),
      order: mod.useSectionOrder(),
    }));

    await waitFor(() => {
      expect(result.current.selectedIds).toEqual(["fixed:clinic:demo", "custom:block"]);
    });

    expect(result.current.order.clinic).toEqual(["custom:block"]);
    expect(result.current.order.treatments).toEqual(["tx-1"]);
  });

  it("toggles items and supports undo/redo history", async () => {
    getMock.mockResolvedValueOnce({});
    const mod = await loadModule();
    const selected = renderHook(() => mod.useSelectedIds());
    const history = renderHook(() => mod.useDocsHistoryState());

    await waitFor(() => expect(selected.result.current.length).toBeGreaterThan(0));

    act(() => {
      mod.documentsStore.toggle("custom:block");
    });

    expect(selected.result.current).toContain("custom:block");
    expect(history.result.current.canUndo).toBe(true);
    expect(saveMock).toHaveBeenCalled();

    act(() => {
      mod.documentsStore.undo();
    });

    expect(selected.result.current).not.toContain("custom:block");
    expect(history.result.current.canRedo).toBe(true);

    act(() => {
      mod.documentsStore.redo();
    });

    expect(selected.result.current).toContain("custom:block");
  });
});
