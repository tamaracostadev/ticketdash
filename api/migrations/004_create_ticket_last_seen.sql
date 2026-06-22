CREATE TABLE ticketdash.ticket_last_seen (
  ticket_key text PRIMARY KEY
    CHECK (ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'),
  seen_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
