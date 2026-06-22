import { useMemo, useState } from "react";

import {
  DEMO_ACTIVITY_STATES,
  DEMO_CONFIG,
  DEMO_GITHUB_WARNINGS,
  DEMO_ISSUES,
  DEMO_LAST_SEEN,
  DEMO_PRS,
  DEMO_REFLECTIONS,
  DEMO_TICKET_PLANS,
  DEMO_INTEGRATIONS,
} from "./demoData";
import type { TicketPlan } from "../types/planning";
import type { LastSeenByTicket } from "../types/persistence";
import type { TicketReflection, TicketReflectionsByKey } from "../types/reflections";
import type { TicketPlansByKey } from "../types/planning";
import { createDashboardData } from "../utils/dashboard";

export function useDemoDashboard() {
  const [lastSeen, setLastSeen] = useState<LastSeenByTicket>(DEMO_LAST_SEEN);
  const [plans, setPlans] = useState<TicketPlansByKey>(DEMO_TICKET_PLANS);
  const [reflections, setReflections] = useState<TicketReflectionsByKey>(DEMO_REFLECTIONS);

  const data = useMemo(
    () =>
      createDashboardData(
        DEMO_ISSUES,
        DEMO_PRS,
        lastSeen,
        plans,
        new Date("2026-06-22T12:00:00.000Z"),
        DEMO_CONFIG,
        DEMO_ACTIVITY_STATES,
        reflections,
      ),
    [lastSeen, plans, reflections],
  );

  return {
    data,
    errors: [] as string[],
    githubWarnings: DEMO_GITHUB_WARNINGS,
    integrations: DEMO_INTEGRATIONS,
    isLoading: false,
    markSeen: (ticketKey: string) =>
      setLastSeen((current) => ({
        ...current,
        [ticketKey.toUpperCase()]: new Date().toISOString(),
      })),
    removePlan: (ticketKey: string) =>
      setPlans((current) => {
        const updated = { ...current };
        delete updated[ticketKey.toUpperCase()];
        return updated;
      }),
    removeReflection: async (ticketKey: string) =>
      setReflections((current) => {
        const updated = { ...current };
        delete updated[ticketKey.toUpperCase()];
        return updated;
      }),
    savePlan: (plan: TicketPlan) =>
      setPlans((current) => ({
        ...current,
        [plan.ticketKey.toUpperCase()]: { ...plan, ticketKey: plan.ticketKey.toUpperCase() },
      })),
    saveReflection: async (reflection: TicketReflection) =>
      setReflections((current) => ({
        ...current,
        [reflection.ticketKey.toUpperCase()]: {
          ...reflection,
          ticketKey: reflection.ticketKey.toUpperCase(),
        },
      })),
  };
}
