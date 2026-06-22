import type { PriorityReasonViewModel } from "../types/ticketCard";

interface PriorityReasonProps {
  reason: PriorityReasonViewModel;
}

export function PriorityReason({ reason }: PriorityReasonProps) {
  return (
    <li className="flex items-center justify-between gap-4 text-xs text-slate-400">
      <span>{reason.label}</span>
      <span className="font-mono text-slate-500">+{reason.score}</span>
    </li>
  );
}
