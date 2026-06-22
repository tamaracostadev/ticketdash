import { describe, expect, it } from "vitest";

import { parseLastSeen } from "../../src/utils/lastSeenValidation";

describe("last seen validation", () => {
  it("normalizes keys and timestamps", () => {
    expect(parseLastSeen({
      "app-100": "2026-06-18T09:00:00-03:00",
    })).toEqual({
      "APP-100": "2026-06-18T12:00:00.000Z",
    });
  });

  it("rejects invalid keys, timestamps and duplicate normalized keys", () => {
    expect(parseLastSeen({ invalid: "2026-06-18T12:00:00Z" })).toBeNull();
    expect(parseLastSeen({ "APP-100": "2026-06-18T12:00:00" })).toBeNull();
    expect(parseLastSeen({
      "APP-100": "2026-06-18T12:00:00Z",
      "app-100": "2026-06-18T13:00:00Z",
    })).toBeNull();
  });
});
