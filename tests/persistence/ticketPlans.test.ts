import { describe, expect, it } from "vitest";

import { LocalStorageTicketPlanRepository } from "../../src/persistence/localStorageTicketPlanRepository";
import { createPlan } from "../fixtures/domain";
import { MemoryStorage } from "../fixtures/memoryStorage";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from "../../src/persistence/storageKeys";

describe("LocalStorageTicketPlanRepository", () => {
  it("saves, loads and removes a normalized plan", async () => {
    const repository = new LocalStorageTicketPlanRepository(new MemoryStorage());
    await repository.save(createPlan("app-100", { isPlanned: true }));

    expect((await repository.load())["APP-100"]?.isPlanned).toBe(true);
    await repository.reorder(["APP-100"]);
    expect((await repository.load())["APP-100"]?.manualOrder).toBe(1);
    await repository.remove("app-100");
    expect(await repository.load()).toEqual({});
  });

  it("migrates plans created before resolved changes were supported", async () => {
    const storage = new MemoryStorage();
    const {
      activeDevelopmentSource: _activeSource,
      activeDevelopmentStartedAt: _activeStartedAt,
      isActiveDevelopment: _isActiveDevelopment,
      resolvedChangesRequestedAt: _resolved,
      ...legacy
    } = createPlan("APP-100");
    storage.setItem(
      "tc-dashboard:ticket-plans",
      JSON.stringify({ "APP-100": legacy }),
    );

    const plans = await new LocalStorageTicketPlanRepository(storage).load();
    expect(plans["APP-100"]?.isActiveDevelopment).toBe(false);
    expect(plans["APP-100"]?.activeDevelopmentSource).toBeNull();
    expect(plans["APP-100"]?.activeDevelopmentStartedAt).toBeNull();
    expect(plans["APP-100"]?.resolvedChangesRequestedAt).toBeNull();
  });

  it("normalizes persisted timestamps to canonical UTC", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEYS.plans,
      JSON.stringify({
        "APP-100": createPlan("APP-100", {
          deferredUntil: "2026-06-15T06:00:00-03:00",
          resolvedChangesRequestedAt: "2026-06-15T09:00:00Z",
        }),
      }),
    );

    const plan = (await new LocalStorageTicketPlanRepository(storage).load())[
      "APP-100"
    ];
    expect(plan?.deferredUntil).toBe("2026-06-15T09:00:00.000Z");
    expect(plan?.resolvedChangesRequestedAt).toBe(
      "2026-06-15T09:00:00.000Z",
    );
  });

  it("rejects timestamps without a timezone", async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEYS.plans,
      JSON.stringify({
        "APP-100": createPlan("APP-100", {
          resolvedChangesRequestedAt: "2026-06-15T09:00:00",
        }),
      }),
    );

    expect(await new LocalStorageTicketPlanRepository(storage).load()).toEqual(
      {},
    );
  });

  it("migrates the legacy storage namespace once", async () => {
    const storage = new MemoryStorage();
    const plan = createPlan("APP-100", { isPlanned: true });
    storage.setItem(
      LEGACY_STORAGE_KEYS.plans,
      JSON.stringify({ "APP-100": plan }),
    );

    expect(
      (await new LocalStorageTicketPlanRepository(storage).load())["APP-100"],
    ).toEqual(plan);
    expect(storage.getItem(LEGACY_STORAGE_KEYS.plans)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.plans)).not.toBeNull();
  });
});
