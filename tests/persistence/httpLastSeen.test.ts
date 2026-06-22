import { describe, expect, it, vi } from "vitest";

import { HttpLastSeenRepository } from "../../src/persistence/httpLastSeenRepository";
import { LocalStorageLastSeenRepository } from "../../src/persistence/localStorageLastSeenRepository";
import { MigratingLastSeenRepository } from "../../src/persistence/migratingLastSeenRepository";
import { STORAGE_KEYS } from "../../src/persistence/storageKeys";
import { MemoryStorage } from "../fixtures/memoryStorage";

const SEEN_AT = "2026-06-18T12:00:00.000Z";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("HttpLastSeenRepository", () => {
  it("lists, marks, clears and imports through the local API", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ "APP-100": SEEN_AT }))
      .mockResolvedValue(new Response(null, { status: 204 }));
    const repository = new HttpLastSeenRepository(fetcher);

    expect(await repository.load()).toEqual({ "APP-100": SEEN_AT });
    await repository.markSeen("app-100", SEEN_AT);
    await repository.clear();
    await repository.import({ "APP-100": SEEN_AT });

    expect(fetcher.mock.calls.map(([path, init]) => [path, init?.method]))
      .toEqual([
        ["/api/last-seen", undefined],
        ["/api/last-seen/APP-100", "PUT"],
        ["/api/last-seen", "DELETE"],
        ["/api/last-seen/import", "POST"],
      ]);
  });

  it("rejects public API errors and invalid response data", async () => {
    const unavailable = new HttpLastSeenRepository(
      vi.fn().mockResolvedValue(jsonResponse({ message: "Unavailable." }, 503)),
    );
    await expect(unavailable.load()).rejects.toThrow("Unavailable.");

    const invalid = new HttpLastSeenRepository(
      vi.fn().mockResolvedValue(jsonResponse({ "APP-100": "not-a-date" })),
    );
    await expect(invalid.load()).rejects.toThrow("invalid data");
  });
});

describe("MigratingLastSeenRepository", () => {
  it("imports local values once and clears them only after success", async () => {
    const storage = new MemoryStorage();
    const local = new LocalStorageLastSeenRepository(storage);
    await local.markSeen("APP-100", SEEN_AT);
    const remote = {
      clear: vi.fn(),
      import: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue({ "APP-100": SEEN_AT }),
      markSeen: vi.fn(),
    };
    const repository = new MigratingLastSeenRepository(remote, local);

    expect(await repository.load()).toEqual({ "APP-100": SEEN_AT });
    expect(remote.import).toHaveBeenCalledWith({ "APP-100": SEEN_AT });
    expect(storage.getItem(STORAGE_KEYS.lastSeen)).toBeNull();

    await repository.load();
    expect(remote.import).toHaveBeenCalledOnce();
  });

  it("preserves local values when import fails", async () => {
    const storage = new MemoryStorage();
    const local = new LocalStorageLastSeenRepository(storage);
    await local.markSeen("APP-100", SEEN_AT);
    const remote = {
      clear: vi.fn(),
      import: vi.fn().mockRejectedValue(new Error("API unavailable")),
      load: vi.fn(),
      markSeen: vi.fn(),
    };

    await expect(
      new MigratingLastSeenRepository(remote, local).load(),
    ).rejects.toThrow("API unavailable");
    expect(await local.load()).toEqual({ "APP-100": SEEN_AT });
  });
});
