import type { TicketBadgeViewModel } from "../types/ticketCard";

const TONE_CLASSES: Record<TicketBadgeViewModel["tone"], string> = {
  danger: "bg-rose-500/15 text-rose-200",
  info: "bg-sky-500/15 text-sky-200",
  neutral: "bg-slate-700/70 text-slate-300",
  success: "bg-emerald-500/15 text-emerald-200",
  warning: "bg-amber-500/15 text-amber-200",
};

const ORIGIN_CLASSES: Record<TicketBadgeViewModel["origin"], string> = {
  attention: "border-rose-400/30",
  external: "border-slate-500/50",
  personal: "border-sky-400/30",
};

interface TicketBadgeProps {
  badge: TicketBadgeViewModel;
}

export function TicketBadge({ badge }: TicketBadgeProps) {
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-1 text-center text-xs font-medium leading-tight ${TONE_CLASSES[badge.tone]} ${ORIGIN_CLASSES[badge.origin]}`}
      title={`${badge.origin}: ${badge.label}`}
    >
      {badge.label}
    </span>
  );
}
