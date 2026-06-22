import { CircleAlert } from "lucide-react";

export interface ActionItem {
  href: string;
  id: string;
  label: string;
  type:
    | "changes-requested"
    | "conflict"
    | "comment"
    | "linked-duplicate-sync"
    | "re-review"
    | "rejected-by-qa"
    | "rejected-by-review"
    | "thread";
}

interface ActionBannerProps {
  items: ActionItem[];
}

const TITLES: Record<ActionItem["type"], string> = {
  "changes-requested": "Changes requested",
  comment: "New comments",
  conflict: "Merge conflicts",
  "linked-duplicate-sync": "Sync linked duplicate",
  "re-review": "Re-review ticket",
  "rejected-by-qa": "Rejected by QA",
  "rejected-by-review": "Rejected by review",
  thread: "Open review threads",
};

export function ActionBanner({ items }: ActionBannerProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-amber-200">
        <CircleAlert size={18} /> Action required
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <a className="rounded-full bg-slate-950/60 px-3 py-1 text-sm text-slate-200 hover:text-white" href={item.href} target="_blank" rel="noreferrer">
              {TITLES[item.type]}: {item.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
