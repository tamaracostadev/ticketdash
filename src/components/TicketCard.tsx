import {
  ExternalLink,
  FilePenLine,
  GitPullRequest,
} from "lucide-react";
import { useState } from "react";

import type { TicketPlan } from "../types/planning";
import type { TicketReflection } from "../types/reflections";
import type { TicketCardViewModel } from "../types/ticketCard";
import { PlanningActions } from "./PlanningActions";
import { PriorityReason } from "./PriorityReason";
import { ReflectionDialog } from "./ReflectionDialog";
import { TicketBadge } from "./TicketBadge";

interface TicketCardProps {
  card: TicketCardViewModel;
  onRemovePlan: (ticketKey: string) => void;
  onRemoveReflection: (ticketKey: string) => void | Promise<void>;
  onSavePlan: (plan: TicketPlan) => void;
  onSaveReflection: (reflection: TicketReflection) => void | Promise<void>;
}

export function TicketCard({
  card,
  onRemovePlan,
  onRemoveReflection,
  onSavePlan,
  onSaveReflection,
}: TicketCardProps) {
  const [isEditingReflection, setIsEditingReflection] = useState(false);

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <a
            className="inline-flex items-center gap-1 font-semibold text-sky-300 hover:text-sky-200"
            href={card.jiraUrl}
            rel="noreferrer"
            target="_blank"
          >
            {card.ticketKey} <ExternalLink size={13} />
          </a>
          <h3 className="mt-1 text-sm font-medium text-slate-100">{card.title}</h3>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">Jira: {card.jiraStatus}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.badges.map((badge) => <TicketBadge key={badge.id} badge={badge} />)}
      </div>

      {card.prs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {card.prs.map((pr) => (
            <li key={pr.url}>
              <a
                className="flex items-start gap-2 text-xs text-slate-300 hover:text-white"
                href={pr.url}
                rel="noreferrer"
                target="_blank"
                title={pr.tooltip ?? undefined}
              >
                <GitPullRequest className="mt-0.5 shrink-0" size={14} />
                <span>
                  {pr.repository} #{pr.number} · {pr.label}
                  {pr.hasConflict && (
                    <span className="ml-1 text-rose-300">· Conflict</span>
                  )}
                  {pr.openThreadCount > 0 && (
                    <span className="ml-1 text-amber-300">
                      · {pr.openThreadCount} open threads
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-slate-800 pt-3">
        <p className="text-xs font-medium text-slate-300">
          Automatic priority: {card.priority.automaticLabel} ({card.priority.score})
        </p>
        {card.priority.manualLabel && (
          <p className="mt-1 text-xs text-sky-300">
            Manual priority: {card.priority.manualLabel}
          </p>
        )}
        {card.priority.reasons.length > 0 && (
          <ul className="mt-2 space-y-1">
            {card.priority.reasons.map((reason) => (
              <PriorityReason key={reason.label} reason={reason} />
            ))}
          </ul>
        )}
      </div>

      {card.notes && <p className="mt-3 text-xs text-slate-400">{card.notes}</p>}
      {card.reflectionSummary && (
        <p className="mt-3 text-xs text-slate-400">{card.reflectionSummary}</p>
      )}
      <div className="mt-3">
        <button className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white" type="button" onClick={() => setIsEditingReflection(true)}><FilePenLine size={14} /> Reflection</button>
      </div>
      <div className="mt-4">
        <PlanningActions
          canPlan={card.canPlan}
          canReturnToDevelopment={card.canReturnToDevelopment}
          changesRequested={card.changesRequested}
          duplicateCandidates={card.duplicateCandidates}
          isInDevelopment={card.isInDevelopment}
          onRemove={onRemovePlan}
          onSave={onSavePlan}
          plan={card.plan}
        />
      </div>
      {isEditingReflection && (
        <ReflectionDialog
          onClose={() => setIsEditingReflection(false)}
          onRemove={onRemoveReflection}
          onSave={onSaveReflection}
          reflection={card.reflection ?? {
            blockers: "",
            difficulty: null,
            learnings: "",
            notes: "",
            outcome: null,
            ticketKey: card.ticketKey,
          }}
        />
      )}
    </article>
  );
}
