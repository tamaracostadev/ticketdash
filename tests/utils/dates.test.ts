import { describe, expect, it } from "vitest";

import {
  isSameInstant,
  normalizeIsoTimestamp,
} from "../../src/utils/dates";

describe("domain timestamps", () => {
  it("normalizes timezone representations to canonical UTC", () => {
    expect(normalizeIsoTimestamp("2026-06-18T08:52:11-03:00")).toBe(
      "2026-06-18T11:52:11.000Z",
    );
  });

  it("compares equivalent representations by instant", () => {
    expect(
      isSameInstant(
        "2026-06-18T11:52:11Z",
        "2026-06-18T11:52:11.000Z",
      ),
    ).toBe(true);
  });

  it("rejects timestamps without a timezone", () => {
    expect(normalizeIsoTimestamp("2026-06-18T11:52:11")).toBeNull();
  });
});
