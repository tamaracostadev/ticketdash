import { GitPullRequest, MessageSquareMore } from "lucide-react";

import type { ReviewWorkItem } from "../utils/reviewWork";

interface ReviewQueueProps {
  items: ReviewWorkItem[];
}

const REASON_LABELS: Record<ReviewWorkItem["reason"], string> = {
  "changes-requested-open": "Requested changes",
  "pending-review-request": "Pending review",
  "re-review-required": "Changes resolved - re-review",
};

export function ReviewQueue({ items }: ReviewQueueProps) {
  return (
    <section className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-violet-200">
        <MessageSquareMore size={18} /> Review work
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-violet-100/80">
          No review work detected right now.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <a
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200 hover:border-violet-400/40 hover:text-white"
              href={item.pr.url}
              key={item.pr.url}
              rel="noreferrer"
              target="_blank"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-violet-200">
                    {item.ticketKey ?? "Unlinked review"}
                  </p>
                  <p className="mt-1 text-sm text-slate-100">{item.pr.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">
                  {REASON_LABELS[item.reason]}
                </span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <GitPullRequest size={14} />
                {item.pr.repository.name} #{item.pr.number}
                {item.hasConflict && (
                  <span className="text-rose-300">· Conflict</span>
                )}
                {item.openThreadCount > 0 && (
                  <span className="text-amber-300">
                    · {item.openThreadCount} open threads
                  </span>
                )}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
