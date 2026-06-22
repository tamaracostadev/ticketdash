import { BarChart3, Columns3, List } from "lucide-react";

export type DashboardView = "kanban" | "list" | "reports";

interface ViewSwitcherProps {
  onChange: (view: DashboardView) => void;
  view: DashboardView;
}

export function ViewSwitcher({ onChange, view }: ViewSwitcherProps) {
  return (
    <div className="flex w-fit rounded-lg border border-slate-800 bg-slate-900 p-1">
      <button
        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${view === "kanban" ? "bg-sky-500/20 text-sky-200" : "text-slate-400"}`}
        type="button"
        onClick={() => onChange("kanban")}
      >
        <Columns3 size={15} /> Kanban
      </button>
      <button
        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${view === "list" ? "bg-sky-500/20 text-sky-200" : "text-slate-400"}`}
        type="button"
        onClick={() => onChange("list")}
      >
        <List size={15} /> List
      </button>
      <button
        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm ${view === "reports" ? "bg-sky-500/20 text-sky-200" : "text-slate-400"}`}
        type="button"
        onClick={() => onChange("reports")}
      >
        <BarChart3 size={15} /> Reports
      </button>
    </div>
  );
}
