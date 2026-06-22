import { CircleOff, Github } from "lucide-react";
import { useMemo, useState } from "react";

import { ActionBanner } from "./components/ActionBanner";
import { DismissibleWarning } from "./components/DismissibleWarning";
import { ErrorState } from "./components/ErrorState";
import { KanbanBoard } from "./components/KanbanBoard";
import { LoadingState } from "./components/LoadingState";
import { TicketFilters } from "./components/TicketFilters";
import { TicketList } from "./components/TicketList";
import { UnlinkedPRs } from "./components/UnlinkedPRs";
import {
  ViewSwitcher,
  type DashboardView,
} from "./components/ViewSwitcher";
import { ReportsPanel } from "./components/ReportsPanel";
import { ReviewQueue } from "./components/ReviewQueue";
import { useDashboard } from "./hooks/useDashboard";
import { useDismissedWarnings } from "./hooks/useDismissedWarnings";
import { useTicketFilters } from "./hooks/useTicketFilters";

export function App() {
  const [view, setView] = useState<DashboardView>("kanban");
  const dismissedWarnings = useDismissedWarnings();
  const {
    data,
    errors,
    githubWarnings,
    integrations,
    isLoading,
    markSeen,
    removePlan,
    removeReflection,
    savePlan,
    saveReflection,
  } = useDashboard();
  const ticketFilters = useTicketFilters(data.tickets);
  const duplicateCandidates = useMemo(
    () =>
      data.tickets
        .filter((ticket) => ticket.planningVisibility === "operational")
        .map((ticket) => ({
          ticketKey: ticket.issue.key,
          title: ticket.issue.fields.summary,
        })),
    [data.tickets],
  );

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">Jira GitHub Work Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">Active work overview</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 ${integrations?.jira ? "bg-sky-500/15 text-sky-300" : "bg-slate-800 text-slate-400"}`}>Jira {integrations?.jira ? "connected" : "unavailable"}</span>
            <span className={`rounded-full px-3 py-1 ${integrations?.github ? "bg-sky-500/15 text-sky-300" : "bg-slate-800 text-slate-400"}`}>GitHub {integrations?.github ? "connected" : "unavailable"}</span>
          </div>
        </header>

        {isLoading ? <LoadingState /> : (
          <>
            {integrations && (!integrations.jira || !integrations.github) && (
              <section className="flex gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
                <CircleOff className="shrink-0 text-slate-400" size={18} />
                Unavailable integrations are blocked. Add their secrets to the local .env file to enable them.
              </section>
            )}
            {githubWarnings
              .filter((warning) => !dismissedWarnings.dismissedSet.has(warning.code))
              .map((warning) => (
                <DismissibleWarning
                  key={warning.code}
                  message={warning.message}
                  onDismiss={() => dismissedWarnings.dismiss(warning.code)}
                />
              ))}
            <ErrorState messages={errors} />
            <ViewSwitcher onChange={setView} view={view} />
            {view === "reports" ? (
              <ReportsPanel tickets={data.tickets} />
            ) : (
              <>
                <ActionBanner items={data.actions} />
                <ReviewQueue items={data.reviewItems} />
                <TicketFilters filters={ticketFilters.filters} jiraStatuses={ticketFilters.jiraStatuses} onChange={ticketFilters.setFilters} onClear={ticketFilters.clearFilters} projects={ticketFilters.projects} resultCount={ticketFilters.filteredTickets.length} totalCount={data.tickets.length} />
                {view === "kanban" ? (
                  <KanbanBoard duplicateCandidates={duplicateCandidates} hasActiveFilters={ticketFilters.hasActiveFilters} onRemovePlan={removePlan} onRemoveReflection={removeReflection} onSavePlan={savePlan} onSaveReflection={saveReflection} tickets={ticketFilters.filteredTickets} totalCount={data.tickets.length} />
                ) : (
                  <TicketList duplicateCandidates={duplicateCandidates} hasActiveFilters={ticketFilters.hasActiveFilters} onMarkSeen={markSeen} onRemovePlan={removePlan} onSavePlan={savePlan} tickets={ticketFilters.filteredTickets} totalCount={data.tickets.length} />
                )}
                <UnlinkedPRs prs={data.unlinkedPRs} />
              </>
            )}
            {!integrations?.github && <p className="flex items-center gap-2 text-sm text-slate-500"><Github size={16} /> GitHub data will appear after the integration is available.</p>}
          </>
        )}
      </div>
    </main>
  );
}
