import { CalendarDays, Settings2 } from "lucide-react";
import { useState } from "react";

import { useJiraTransitionAssistant } from "../hooks/useJiraTransitionAssistant";
import type { TicketPlan } from "../types/planning";
import { withPlanChanges } from "../utils/planning";
import { PlanningDialog } from "./PlanningDialog";

interface PlanningActionsProps {
  canPlan: boolean;
  canReturnToDevelopment?: boolean;
  changesRequested?: {
    isPending: boolean;
    reviewAt: string;
  } | null;
  duplicateCandidates?: Array<{
    ticketKey: string;
    title: string;
  }>;
  isInDevelopment?: boolean;
  onRemove: (ticketKey: string) => void;
  onSave: (plan: TicketPlan) => void;
  plan: TicketPlan;
}

export function PlanningActions({
  canPlan,
  canReturnToDevelopment = false,
  changesRequested = null,
  duplicateCandidates = [],
  isInDevelopment = false,
  onRemove,
  onSave,
  plan,
}: PlanningActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { assistant, execute } = useJiraTransitionAssistant(
    plan.ticketKey,
    canReturnToDevelopment,
  );
  const planFor = (plannedPeriod: "today" | "week") =>
    onSave(withPlanChanges(plan, { isPlanned: true, plannedPeriod }));
  const unplan = () =>
    onSave(withPlanChanges(plan, { isPlanned: false, manualOrder: null }));
  const startWork = () =>
    onSave(withPlanChanges(plan, {
      activeDevelopmentSource: "manual",
      activeDevelopmentStartedAt:
        plan.activeDevelopmentStartedAt ?? new Date().toISOString(),
      isActiveDevelopment: true,
    }));
  const pauseWork = () =>
    onSave(withPlanChanges(plan, {
      activeDevelopmentSource: null,
      activeDevelopmentStartedAt: null,
      isActiveDevelopment: false,
    }));

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {canPlan && <button className="rounded bg-sky-500/15 px-2 py-1 text-sky-300" type="button" onClick={() => planFor("today")}><CalendarDays className="inline" size={13} /> Today</button>}
      {canPlan && <button className="rounded bg-slate-800 px-2 py-1 text-slate-300" type="button" onClick={() => planFor("week")}>Week</button>}
      {isInDevelopment && !plan.isActiveDevelopment && (
        <button
          className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300"
          type="button"
          onClick={startWork}
        >
          Start work
        </button>
      )}
      {isInDevelopment && plan.isActiveDevelopment && (
        <button className="text-emerald-300" type="button" onClick={pauseWork}>
          Pause work
        </button>
      )}
      {canReturnToDevelopment && assistant.data?.available && assistant.data.transition && (
        <button
          className="rounded bg-violet-500/15 px-2 py-1 text-violet-300"
          disabled={execute.isPending}
          type="button"
          onClick={() => execute.mutate()}
        >
          {execute.isPending ? "Moving..." : "Move to development"}
        </button>
      )}
      {plan.isPlanned && <button className="text-slate-400" type="button" onClick={unplan}>Unplan</button>}
      {changesRequested && (
        <button
          className={changesRequested.isPending ? "text-emerald-300" : "text-amber-300"}
          type="button"
          onClick={() =>
            onSave(withPlanChanges(plan, {
              resolvedChangesRequestedAt: changesRequested.isPending
                ? changesRequested.reviewAt
                : null,
            }))
          }
        >
          {changesRequested.isPending ? "Mark changes addressed" : "Mark changes unresolved"}
        </button>
      )}
      <button className="text-slate-400 hover:text-white" type="button" onClick={() => setIsEditing(true)}><Settings2 className="inline" size={14} /> More</button>
      {execute.isError && (
        <span className="text-rose-300">
          {execute.error instanceof Error
            ? execute.error.message
            : "Unable to update Jira."}
        </span>
      )}
      {isEditing && (
        <PlanningDialog
          canPlan={canPlan}
          duplicateCandidates={duplicateCandidates}
          onClose={() => setIsEditing(false)}
          onRemove={onRemove}
          onSave={onSave}
          plan={plan}
        />
      )}
    </div>
  );
}
