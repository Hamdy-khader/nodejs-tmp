import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicApi } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("rate-limit responses", () => {
  it.each([
    ["12", 12_000],
    ["0", 0],
    ["Mon, 19 Oct 2026 10:00:30 GMT", 30_000],
    ["Mon, 19 Oct 2026 09:59:00 GMT", 0],
    ["invalid", undefined],
    [null, undefined],
  ])("preserves Retry-After %s on the API error", async (retryAfter, expected) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "Too Many Attempts." }),
      { status: 429, headers: retryAfter === null ? {} : { "Retry-After": retryAfter } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(clinicApi.plans.setRows("1", [])).rejects.toMatchObject({
      name: "ApiError",
      status: 429,
      message: "Too Many Attempts.",
      retryAfterMs: expected,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves a non-JSON rate-limit response for the save queue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": "10" },
    })));
    await expect(clinicApi.plans.setRows("1", [])).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 10_000,
    });
  });
});
