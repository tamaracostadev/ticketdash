import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { captureActivity } from "../api/activity";
import { createActivityCapture } from "../utils/activityCapture";
import { createDashboardData } from "../utils/dashboard";
import { useActivityStates } from "./useActivityStates";
import { useIntegrationStatus } from "./useIntegrationStatus";
import { useLastSeen } from "./useLastSeen";
import { usePRs } from "./usePRs";
import { useReflections } from "./useReflections";
import { useTickets } from "./useTickets";
import { useTicketPlans } from "./useTicketPlans";

function getMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

export function useDashboard() {
  const [now, setNow] = useState(() => new Date());
  const [activityError, setActivityError] = useState<string | null>(null);
  const lastCapture = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const activityStates = useActivityStates();
  const integrations = useIntegrationStatus();
  const tickets = useTickets();
  const prs = usePRs();
  const reflections = useReflections();
  const lastSeen = useLastSeen();
  const ticketPlans = useTicketPlans();

  useEffect(() => {
    if (!lastSeen.isHydrated) {
      void lastSeen.hydrate();
    }
  }, [lastSeen]);

  useEffect(() => {
    if (!ticketPlans.isHydrated) {
      void ticketPlans.hydrate();
    }
  }, [ticketPlans]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const data = useMemo(
    () =>
      createDashboardData(
        tickets.data ?? [],
        prs.data?.prs ?? [],
        lastSeen.lastSeen,
        ticketPlans.plans,
        now,
        integrations.data?.config,
        activityStates.data,
        reflections.data,
      ),
    [
      integrations.data?.config,
      activityStates.data,
      reflections.data,
      lastSeen.lastSeen,
      now,
      prs.data,
      ticketPlans.plans,
      tickets.data,
    ],
  );

  useEffect(() => {
    const jiraReady =
      integrations.data?.jira === true && tickets.isSuccess;
    const githubReady =
      integrations.data?.github !== true || prs.isSuccess;
    if (!jiraReady || !githubReady || !ticketPlans.isHydrated) return;

    const observations = createActivityCapture(
      data.tickets,
      new Date().toISOString(),
    );
    const fingerprint = JSON.stringify(
      observations.map(({ observedAt: _, ...observation }) => observation),
    );
    if (lastCapture.current === fingerprint) return;
    lastCapture.current = fingerprint;

    void captureActivity(observations)
      .then(async () => {
        setActivityError(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["activity", "state"] }),
          ticketPlans.hydrate(),
        ]);
      })
      .catch((error: unknown) => {
        lastCapture.current = null;
        setActivityError(getMessage(error));
      });
  }, [
    data.tickets,
    integrations.data?.github,
    integrations.data?.jira,
    prs.isSuccess,
    queryClient,
    ticketPlans,
    tickets.isSuccess,
  ]);

  const errors = [
    getMessage(activityStates.error),
    activityError,
    getMessage(integrations.error),
    getMessage(tickets.error),
    getMessage(prs.error),
    getMessage(reflections.error),
    lastSeen.error,
    ticketPlans.error,
  ].filter((message): message is string => message !== null);

  const isLoading =
    integrations.isPending ||
    !lastSeen.isHydrated ||
    !ticketPlans.isHydrated ||
    (integrations.data?.jira === true && tickets.isPending) ||
    (integrations.data?.github === true && prs.isPending) ||
    reflections.isLoading;

  return {
    data,
    errors,
    githubWarnings: prs.data?.warnings ?? [],
    integrations: integrations.data,
    isLoading,
    markSeen: lastSeen.markSeen,
    removeReflection: reflections.remove,
    removePlan: ticketPlans.remove,
    reorderPlans: ticketPlans.reorder,
    saveReflection: reflections.save,
    savePlan: ticketPlans.save,
  };
}
