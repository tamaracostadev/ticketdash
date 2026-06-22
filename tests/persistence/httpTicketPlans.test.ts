import { describe, expect, it, vi } from "vitest";

import { HttpTicketPlanRepository } from "../../src/persistence/httpTicketPlanRepository";
import { LocalStorageTicketPlanRepository } from "../../src/persistence/localStorageTicketPlanRepository";
import { MigratingTicketPlanRepository } from "../../src/persistence/migratingTicketPlanRepository";
import { createPlan } from "../fixtures/domain";
import { MemoryStorage } from "../fixtures/memoryStorage";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("HttpTicketPlanRepository", () => {
  it("lists, saves, removes, clears and imports through the local API", async () => {
    const plan = createPlan("APP-100", { notes: "private note" });
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ "APP-100": plan }))
      .mockResolvedValue(new Response(null, { status: 204 }));
    const repository = new HttpTicketPlanRepository(fetcher);

    expect(await repository.load()).toEqual({ "APP-100": plan });
    await repository.save(plan);
    await repository.remove("app-100");
    await repository.reorder(["APP-200", "APP-100"]);
    await repository.clear();
    await repository.import({ "APP-100": plan });

    expect(fetcher.mock.calls.map(([path, init]) => [path, init?.method])).toEqual([
      ["/api/planning/ticket-plans", undefined],
      ["/api/planning/ticket-plans/APP-100", "PUT"],
      ["/api/planning/ticket-plans/APP-100", "DELETE"],
      ["/api/planning/ticket-plans/reorder", "POST"],
      ["/api/planning/ticket-plans", "DELETE"],
      ["/api/planning/ticket-plans/import", "POST"],
    ]);
  });

  it("rejects public API errors and invalid response data", async () => {
    const unavailable = new HttpTicketPlanRepository(
      vi.fn().mockResolvedValue(jsonResponse({ message: "Unavailable." }, 503)),
    );
    await expect(unavailable.load()).rejects.toThrow("Unavailable.");

    const invalid = new HttpTicketPlanRepository(
      vi.fn().mockResolvedValue(jsonResponse({ invalid: true })),
    );
    await expect(invalid.load()).rejects.toThrow("invalid data");
  });
});

describe("MigratingTicketPlanRepository", () => {
  it("imports local plans once and clears them only after success", async () => {
    const storage = new MemoryStorage();
    const local = new LocalStorageTicketPlanRepository(storage);
    const plan = createPlan("APP-100", { isPlanned: true });
    await local.save(plan);
    const remote = {
      clear: vi.fn(),
      import: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue({ "APP-100": plan }),
      remove: vi.fn(),
      reorder: vi.fn(),
      save: vi.fn(),
    };
    const repository = new MigratingTicketPlanRepository(remote, local);

    expect(await repository.load()).toEqual({ "APP-100": plan });
    expect(remote.import).toHaveBeenCalledWith({ "APP-100": plan });
    expect(await local.load()).toEqual({});

    await repository.load();
    expect(remote.import).toHaveBeenCalledOnce();
  });

  it("preserves local plans when import fails", async () => {
    const local = new LocalStorageTicketPlanRepository(new MemoryStorage());
    const plan = createPlan("APP-100", { notes: "keep me" });
    await local.save(plan);
    const remote = {
      clear: vi.fn(),
      import: vi.fn().mockRejectedValue(new Error("API unavailable")),
      load: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
      save: vi.fn(),
    };

    await expect(
      new MigratingTicketPlanRepository(remote, local).load(),
    ).rejects.toThrow("API unavailable");
    expect(await local.load()).toEqual({ "APP-100": plan });
  });
});
