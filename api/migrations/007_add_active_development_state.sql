ALTER TABLE ticketdash.ticket_plans
  ADD COLUMN is_active_development boolean NOT NULL DEFAULT false,
  ADD COLUMN active_development_started_at timestamptz,
  ADD COLUMN active_development_source text
    CHECK (active_development_source IN ('manual', 'jira'));
