CREATE TABLE ticketdash.ticket_reflections (
  ticket_key text PRIMARY KEY
    CHECK (ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'),
  difficulty text
    CHECK (difficulty IN ('low', 'medium', 'high')),
  outcome text
    CHECK (outcome IN ('done', 'partial', 'blocked', 'dropped')),
  blockers text NOT NULL DEFAULT '',
  learnings text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
