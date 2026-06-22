import { describe, expect, it } from "vitest";

import {
  normalizeTicketReflection,
  parseTicketReflections,
} from "../../src/utils/reflectionValidation";

describe("reflection validation", () => {
  it("normalizes a valid reflection", () => {
    expect(normalizeTicketReflection({
      blockers: "",
      difficulty: "medium",
      learnings: "Keep PRs smaller",
      notes: "Useful note",
      outcome: "partial",
      ticketKey: "app-100",
    })).toEqual({
      blockers: "",
      difficulty: "medium",
      learnings: "Keep PRs smaller",
      notes: "Useful note",
      outcome: "partial",
      ticketKey: "APP-100",
    });
  });

  it("rejects invalid enums and oversized text", () => {
    expect(normalizeTicketReflection({
      blockers: "x".repeat(1001),
      difficulty: "hard",
      learnings: "",
      notes: "",
      outcome: null,
      ticketKey: "APP-100",
    })).toBeNull();
  });

  it("parses a dictionary of reflections", () => {
    expect(parseTicketReflections({
      "APP-100": {
        blockers: "",
        difficulty: null,
        learnings: "",
        notes: "",
        outcome: "done",
        ticketKey: "APP-100",
      },
    })["APP-100"]?.outcome).toBe("done");
  });
});
