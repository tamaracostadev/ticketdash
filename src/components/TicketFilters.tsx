import type { TicketFilters as TicketFilterState } from "../types/filters";

interface TicketFiltersProps {
  filters: TicketFilterState;
  jiraStatuses: string[];
  onChange: (filters: TicketFilterState) => void;
  onClear: () => void;
  projects: string[];
  resultCount: number;
  totalCount: number;
}

const WORKFLOW_OPTIONS = [
  ["all", "All columns"],
  ["backlog", "Backlog"],
  ["planned", "Planned"],
  ["development", "Development"],
  ["code-review", "Code review"],
  ["testing", "Testing"],
  ["release", "Release"],
  ["finalized", "Finalized"],
  ["unclassified", "Unclassified"],
] as const;

const PR_OPTIONS = [
  ["all", "All PR states"],
  ["no-pr", "No PR"],
  ["draft", "Draft"],
  ["approved", "Approved"],
  ["partially-approved", "Partially approved"],
  ["changes-requested", "Changes requested"],
  ["pending-review", "Pending review"],
] as const;

export function TicketFilters({
  filters,
  jiraStatuses,
  onChange,
  onClear,
  projects,
  resultCount,
  totalCount,
}: TicketFiltersProps) {
  const update = <Key extends keyof TicketFilterState>(
    key: Key,
    value: TicketFilterState[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <input className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Search key or title" value={filters.search} onChange={(event) => update("search", event.target.value)} />
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={filters.project} onChange={(event) => update("project", event.target.value as TicketFilterState["project"])}>
          <option value="all">All projects</option>
          {projects.map((project) => <option key={project} value={project}>{project}</option>)}
        </select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={filters.workflow} onChange={(event) => update("workflow", event.target.value as TicketFilterState["workflow"])}>
          {WORKFLOW_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={filters.jiraStatus} onChange={(event) => update("jiraStatus", event.target.value)}>
          <option value="all">All Jira statuses</option>
          {jiraStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={filters.pr} onChange={(event) => update("pr", event.target.value as TicketFilterState["pr"])}>
          {PR_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={filters.visibility} onChange={(event) => update("visibility", event.target.value as TicketFilterState["visibility"])}>
          <option value="operational">Operational</option><option value="hidden">Hidden</option><option value="deferred">Deferred</option><option value="all">All visibility</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {(["all", "action-required", "no-action"] as const).map((value) => (
          <button className={`rounded-full px-3 py-1 ${filters.attention === value ? "bg-sky-500/20 text-sky-200" : "bg-slate-800 text-slate-400"}`} key={value} type="button" onClick={() => update("attention", value)}>
            {value === "all" ? "All" : value === "action-required" ? "Action required" : "No action"}
          </button>
        ))}
        <label><input checked={filters.onlyConflict} type="checkbox" onChange={(event) => update("onlyConflict", event.target.checked)} /> Conflict</label>
        <label><input checked={filters.onlyUnreadComments} type="checkbox" onChange={(event) => update("onlyUnreadComments", event.target.checked)} /> New comments</label>
        <label><input checked={filters.onlyOpenThreads} type="checkbox" onChange={(event) => update("onlyOpenThreads", event.target.checked)} /> Open threads</label>
        <label><input checked={filters.onlyDivergence} type="checkbox" onChange={(event) => update("onlyDivergence", event.target.checked)} /> Workflow alerts</label>
        <span className="ml-auto text-slate-400">{resultCount} of {totalCount}</span>
        <button className="text-sky-300 hover:text-sky-200" type="button" onClick={onClear}>Clear filters</button>
      </div>
    </section>
  );
}
