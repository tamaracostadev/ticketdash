import { useState, type FormEvent } from "react";

import type {
  ManualPriority,
  PlannedPeriod,
  PlanningReason,
  TicketPlan,
} from "../types/planning";
import { withPlanChanges } from "../utils/planning";

interface PlanningDialogProps {
  canPlan: boolean;
  duplicateCandidates: Array<{
    ticketKey: string;
    title: string;
  }>;
  onClose: () => void;
  onRemove: (ticketKey: string) => void;
  onSave: (plan: TicketPlan) => void;
  plan: TicketPlan;
}

const REASONS: Array<[PlanningReason, string]> = [
  ["deprioritized", "Deprioritized"],
  ["not-my-responsibility", "Not my responsibility"],
  ["waiting-on-someone", "Waiting on someone"],
  ["duplicate", "Duplicate"],
  ["other", "Other"],
];

function toLocalDateTime(value: string | null): string {
  return value === null ? "" : value.slice(0, 16);
}

export function PlanningDialog({
  canPlan,
  duplicateCandidates,
  onClose,
  onRemove,
  onSave,
  plan,
}: PlanningDialogProps) {
  const [draft, setDraft] = useState(plan);
  const update = <Key extends keyof TicketPlan>(key: Key, value: TicketPlan[Key]) =>
    setDraft((current) => withPlanChanges(current, { [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <form className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5" onSubmit={submit}>
        <h2 className="text-lg font-semibold">Plan {plan.ticketKey}</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <label><input checked={draft.isPlanned} disabled={!canPlan} type="checkbox" onChange={(e) => update("isPlanned", e.target.checked)} /> Planned</label>
          <label><input checked={draft.isBlocked} type="checkbox" onChange={(e) => update("isBlocked", e.target.checked)} /> Blocked</label>
          <label><input checked={draft.isHidden} type="checkbox" onChange={(e) => update("isHidden", e.target.checked)} /> Hidden</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Period<select className="mt-1 w-full rounded bg-slate-950 p-2" disabled={!draft.isPlanned} value={draft.plannedPeriod ?? ""} onChange={(e) => update("plannedPeriod", (e.target.value || null) as PlannedPeriod)}><option value="">No period</option><option value="today">Today</option><option value="week">This week</option></select></label>
          <label className="text-sm">Priority<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.manualPriority ?? ""} onChange={(e) => update("manualPriority", (e.target.value || null) as ManualPriority | null)}><option value="">Automatic</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          <label className="text-sm">Manual order<input className="mt-1 w-full rounded bg-slate-950 p-2" min="1" type="number" value={draft.manualOrder ?? ""} onChange={(e) => update("manualOrder", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label className="text-sm">Defer until<input className="mt-1 w-full rounded bg-slate-950 p-2" type="datetime-local" value={toLocalDateTime(draft.deferredUntil)} onChange={(e) => update("deferredUntil", e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>
          <label className="text-sm">Defer reason<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.deferredReason ?? ""} onChange={(e) => update("deferredReason", (e.target.value || null) as PlanningReason | null)}><option value="">No reason</option>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        {draft.isBlocked && <label className="block text-sm">Blocked reason<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.blockedReason ?? ""} onChange={(e) => update("blockedReason", (e.target.value || null) as PlanningReason | null)}><option value="">No reason</option>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        {draft.isHidden && <label className="block text-sm">Hidden reason<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.hiddenReason ?? ""} onChange={(e) => update("hiddenReason", (e.target.value || null) as PlanningReason | null)}><option value="">No reason</option>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        {draft.isHidden && draft.hiddenReason === "duplicate" && (
          <label className="block text-sm">
            Primary ticket
            <select
              className="mt-1 w-full rounded bg-slate-950 p-2"
              value={draft.duplicateOfTicketKey ?? ""}
              onChange={(e) =>
                update(
                  "duplicateOfTicketKey",
                  e.target.value === "" ? null : e.target.value,
                )
              }
            >
              <option value="">Select a primary ticket</option>
              {duplicateCandidates.map((candidate) => (
                <option key={candidate.ticketKey} value={candidate.ticketKey}>
                  {candidate.ticketKey} — {candidate.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">Notes<textarea className="mt-1 min-h-24 w-full rounded bg-slate-950 p-2" value={draft.notes} onChange={(e) => update("notes", e.target.value)} /></label>
        <div className="flex justify-between gap-3">
          <button className="text-rose-300" type="button" onClick={() => { onRemove(plan.ticketKey); onClose(); }}>Reset plan</button>
          <div className="flex gap-3"><button type="button" onClick={onClose}>Cancel</button><button className="rounded bg-sky-500 px-3 py-2 font-medium text-slate-950" type="submit">Save</button></div>
        </div>
      </form>
    </div>
  );
}
