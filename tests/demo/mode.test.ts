import { describe, expect, it } from "vitest";

import { DEMO_CONFIG, DEMO_ISSUES, DEMO_LAST_SEEN, DEMO_PRS, DEMO_TICKET_PLANS } from "../../src/demo/demoData";
import { createDashboardData } from "../../src/utils/dashboard";
import { isDemoMode } from "../../src/demo/mode";

describe("demo mode query parsing", () => {
  it("activates only for demo=true", () => {
    expect(isDemoMode("?demo=true")).toBe(true);
    expect(isDemoMode("?demo=false")).toBe(false);
    expect(isDemoMode("?other=value")).toBe(false);
    expect(isDemoMode("")).toBe(false);
  });
});

describe("demo dataset validity", () => {
  it("keeps merge-conflict tickets out of code review", () => {
    const tickets = createDashboardData(
      DEMO_ISSUES,
      DEMO_PRS,
      DEMO_LAST_SEEN,
      DEMO_TICKET_PLANS,
      new Date("2026-06-22T12:00:00.000Z"),
      DEMO_CONFIG,
    );

    const conflictTickets = tickets.tickets.filter((ticket) => ticket.hasConflict);
    expect(conflictTickets.length).toBeGreaterThan(0);
    expect(conflictTickets.every((ticket) => ticket.workflow.column !== "code-review")).toBe(true);
  });

  it("includes a linked duplicate sync action for release screenshots", () => {
    const dashboard = createDashboardData(
      DEMO_ISSUES,
      DEMO_PRS,
      DEMO_LAST_SEEN,
      DEMO_TICKET_PLANS,
      new Date("2026-06-22T12:00:00.000Z"),
      DEMO_CONFIG,
    );

    expect(
      dashboard.actions.some((action) => action.type === "linked-duplicate-sync"),
    ).toBe(true);
  });
});
