import type { JiraStatus } from "../types/jira";

const COLORS: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-300",
  indeterminate: "bg-amber-500/15 text-amber-300",
  new: "bg-sky-500/15 text-sky-300",
};

interface StatusBadgeProps {
  status: JiraStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color =
    COLORS[status.statusCategory.key] ?? "bg-slate-500/15 text-slate-300";

  return (
    <span className={`inline-flex max-w-full items-center justify-center rounded-full px-2.5 py-1 text-center text-xs font-medium leading-tight ${color}`}>
      {status.name}
    </span>
  );
}
