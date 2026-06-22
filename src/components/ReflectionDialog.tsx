import { useState, type FormEvent } from "react";

import type {
  ReflectionDifficulty,
  ReflectionOutcome,
  TicketReflection,
} from "../types/reflections";

interface ReflectionDialogProps {
  onClose: () => void;
  onRemove: (ticketKey: string) => void | Promise<void>;
  onSave: (reflection: TicketReflection) => void | Promise<void>;
  reflection: TicketReflection;
}

const DIFFICULTIES: Array<[Exclude<ReflectionDifficulty, null>, string]> = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];
const OUTCOMES: Array<[Exclude<ReflectionOutcome, null>, string]> = [
  ["done", "Done"],
  ["partial", "Partial"],
  ["blocked", "Blocked"],
  ["dropped", "Dropped"],
];

export function ReflectionDialog({
  onClose,
  onRemove,
  onSave,
  reflection,
}: ReflectionDialogProps) {
  const [draft, setDraft] = useState(reflection);
  const update = <Key extends keyof TicketReflection>(
    key: Key,
    value: TicketReflection[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <form className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5" onSubmit={(event) => void submit(event)}>
        <h2 className="text-lg font-semibold">Reflection {reflection.ticketKey}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Difficulty<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.difficulty ?? ""} onChange={(e) => update("difficulty", (e.target.value || null) as ReflectionDifficulty)}><option value="">No difficulty</option>{DIFFICULTIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm">Outcome<select className="mt-1 w-full rounded bg-slate-950 p-2" value={draft.outcome ?? ""} onChange={(e) => update("outcome", (e.target.value || null) as ReflectionOutcome)}><option value="">No outcome</option>{OUTCOMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <label className="block text-sm">Blockers<textarea className="mt-1 min-h-24 w-full rounded bg-slate-950 p-2" maxLength={1000} value={draft.blockers} onChange={(e) => update("blockers", e.target.value)} /></label>
        <label className="block text-sm">Learnings<textarea className="mt-1 min-h-24 w-full rounded bg-slate-950 p-2" maxLength={1000} value={draft.learnings} onChange={(e) => update("learnings", e.target.value)} /></label>
        <label className="block text-sm">Notes<textarea className="mt-1 min-h-24 w-full rounded bg-slate-950 p-2" maxLength={1000} value={draft.notes} onChange={(e) => update("notes", e.target.value)} /></label>
        <div className="flex justify-between gap-3">
          <button className="text-rose-300" type="button" onClick={() => { void onRemove(reflection.ticketKey); onClose(); }}>Remove reflection</button>
          <div className="flex gap-3"><button type="button" onClick={onClose}>Cancel</button><button className="rounded bg-sky-500 px-3 py-2 font-medium text-slate-950" type="submit">Save</button></div>
        </div>
      </form>
    </div>
  );
}
