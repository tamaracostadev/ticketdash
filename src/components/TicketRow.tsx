import { CircleAlert, GitPullRequest, MessageCircleMore } from "lucide-react";

import type { JiraIssue } from "../types/jira";
import type { TicketPlan } from "../types/planning";
import type { PlanningVisibility } from "../utils/planning";
import { getJiraUrl, type DashboardPullRequest } from "../utils/dashboard";
import type { WorkflowClassification } from "../types/workflow";
import { PlanningActions } from "./PlanningActions";
import { PRBadge } from "./PRBadge";
import { StatusBadge } from "./StatusBadge";

interface TicketRowProps {
  changesRequestedAt: string | null;
  hasChangesRequested: boolean;
  hasConflict: boolean;
  hasUnreadComment: boolean;
  issue: JiraIssue;
  linkedDuplicateKeys: string[];
  onMarkSeen: (ticketId: string) => void;
  onRemovePlan: (ticketKey: string) => void;
  onSavePlan: (plan: TicketPlan) => void;
  openThreadCount: number;
  pendingLinkedDuplicateKeys: string[];
  plan: TicketPlan;
  planningVisibility: PlanningVisibility;
  prs: DashboardPullRequest[];
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  duplicateOfTicketKey: string | null;
  workflow: WorkflowClassification;
}

export function TicketRow({
  changesRequestedAt,
  hasChangesRequested,
  hasConflict,
  hasUnreadComment,
  issue,
  linkedDuplicateKeys,
  onMarkSeen,
  onRemovePlan,
  onSavePlan,
  openThreadCount,
  pendingLinkedDuplicateKeys,
  plan,
  planningVisibility,
  prs,
  duplicateCandidates,
  duplicateOfTicketKey,
  workflow,
}: TicketRowProps) {
  return (
    <tr className="border-b border-slate-800 text-sm">
      <td className="px-4 py-3">
        <a className="font-semibold text-sky-300 hover:text-sky-200" href={getJiraUrl(issue)} target="_blank" rel="noreferrer">
          {issue.key}
        </a>
        <p className="mt-1 text-slate-300">{issue.fields.summary}</p>
      </td>
      <td className="px-4 py-3"><StatusBadge status={issue.fields.status} /></td>
      <td className="px-4 py-3">
        {prs.length > 0 ? (
          <ul className="space-y-2">
            {prs.map(({ pr }) => (
              <li key={pr.url}>
                <a className="inline-flex items-center gap-2 text-slate-200 hover:text-white" href={pr.url} target="_blank" rel="noreferrer">
                  <GitPullRequest size={16} />
                  {pr.repository.name} #{pr.number} <PRBadge pr={pr} />
                </a>
              </li>
            ))}
          </ul>
        ) : <span className="text-slate-500">No PR</span>}
      </td>
      <td className="px-4 py-3 text-slate-300">
        <ul className="space-y-1">
          {prs.map(({ hasConflict: prConflict, openThreadCount: threads, pr }) => (
            (prConflict || threads > 0) && (
              <li key={pr.url}>
                <span className="text-xs text-slate-500">{pr.repository.name}: </span>
                {prConflict && <span className="inline-flex items-center gap-1 text-rose-300"><CircleAlert size={16} /> Conflict</span>}
                {threads > 0 && <span className={prConflict ? "ml-3" : ""}>{threads} open threads</span>}
              </li>
            )
          ))}
        </ul>
        {!hasConflict && openThreadCount === 0 && <span className="text-slate-500">No alerts</span>}
      </td>
      <td className="px-4 py-3">
        {hasUnreadComment && <button className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200" type="button" onClick={() => onMarkSeen(issue.key)}><MessageCircleMore size={16} /> Mark seen</button>}
      </td>
      <td className="px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1 text-xs text-slate-400">
          {plan.plannedPeriod && <span>{plan.plannedPeriod === "today" ? "Today" : "This week"}</span>}
          {plan.isBlocked && <span className="text-rose-300">Blocked</span>}
          {duplicateOfTicketKey && <span>Linked to {duplicateOfTicketKey}</span>}
          {linkedDuplicateKeys.length > 0 && (
            <span>
              {linkedDuplicateKeys.length} linked duplicate
              {linkedDuplicateKeys.length === 1 ? "" : "s"}
            </span>
          )}
          {pendingLinkedDuplicateKeys.length > 0 && (
            <span className="text-amber-300">
              Sync {pendingLinkedDuplicateKeys.length} duplicate
              {pendingLinkedDuplicateKeys.length === 1 ? "" : "s"} to release
            </span>
          )}
          {planningVisibility !== "operational" && <span>{planningVisibility}</span>}
        </div>
        <PlanningActions
          canPlan={
            workflow.externalColumn === "backlog" ||
            workflow.externalColumn === "development"
          }
          canReturnToDevelopment={
            workflow.externalColumn !== null &&
            workflow.externalColumn !== "development" &&
            (hasConflict ||
              workflow.externalColumn === "code-review" ||
              workflow.externalColumn === "testing")
          }
          changesRequested={
            prs.some(({ pr }) => pr.reviewDecision === "CHANGES_REQUESTED") &&
            changesRequestedAt !== null
              ? { isPending: hasChangesRequested, reviewAt: changesRequestedAt }
              : null
          }
          duplicateCandidates={duplicateCandidates}
          isInDevelopment={workflow.externalColumn === "development"}
          onRemove={onRemovePlan}
          onSave={onSavePlan}
          plan={plan}
        />
      </td>
    </tr>
  );
}
