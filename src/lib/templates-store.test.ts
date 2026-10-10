import { beforeEach, expect, it, vi } from "vitest";

const list = vi.fn();
const remove = vi.fn();
beforeEach(() => { vi.resetModules(); list.mockReset(); remove.mockReset().mockResolvedValue(undefined); });

it("protects diagnosis and treatment descriptions while allowing other templates to be deleted", async () => {
  vi.doMock("@/lib/admin/api", () => ({ clinicApi: { templates: { list, delete: remove } } }));
  list.mockResolvedValue([
    { id: "dx", title: "Caries", category: "diagnosis" },
    { id: "tx", title: "Implant", category: "treatments" },
    { id: "other", title: "Custom letter", category: "other" },
  ]);
  const { templatesStore, isProtectedTemplate } = await import("./templates-store");
  await templatesStore.reload();
  for (const id of ["dx", "tx"]) await expect(templatesStore.remove(id)).rejects.toThrow("cannot be deleted");
  expect(remove).not.toHaveBeenCalled();
  expect(isProtectedTemplate("diagnosis")).toBe(true);
  expect(isProtectedTemplate("treatments")).toBe(true);
  await templatesStore.remove("other");
  expect(remove).toHaveBeenCalledWith("other");
});
