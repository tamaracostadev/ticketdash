CREATE TABLE ticketdash.activity_observations (
  id bigserial PRIMARY KEY,
  ticket_key text NOT NULL
    CHECK (ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'),
  observed_at timestamptz NOT NULL,
  jira_status text NOT NULL,
  workflow_column text NOT NULL
    CHECK (workflow_column IN (
      'backlog', 'development', 'code-review', 'testing', 'release', 'finalized'
    )),
  rejection_reason text
    CHECK (rejection_reason IN ('rejected-by-review', 'rejected-by-qa')),
  has_conflict boolean NOT NULL,
  review_state text NOT NULL,
  open_thread_count integer NOT NULL CHECK (open_thread_count >= 0),
  pull_requests jsonb NOT NULL CHECK (jsonb_typeof(pull_requests) = 'array')
);

CREATE INDEX activity_observations_latest
  ON ticketdash.activity_observations (ticket_key, observed_at DESC, id DESC);

CREATE TABLE ticketdash.activity_events (
  id bigserial PRIMARY KEY,
  observation_id bigint REFERENCES ticketdash.activity_observations(id),
  ticket_key text NOT NULL
    CHECK (ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'),
  event_type text NOT NULL,
  origin text NOT NULL CHECK (origin IN ('system', 'user')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  previous_value jsonb,
  current_value jsonb
);

CREATE INDEX activity_events_timeline
  ON ticketdash.activity_events (ticket_key, occurred_at DESC, id DESC);
