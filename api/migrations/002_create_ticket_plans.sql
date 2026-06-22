CREATE TABLE ticketdash.ticket_plans (
  ticket_key text PRIMARY KEY CHECK (ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'),
  is_planned boolean NOT NULL,
  planned_period text CHECK (planned_period IN ('today', 'week')),
  manual_order integer CHECK (manual_order IS NULL OR manual_order >= 1),
  manual_priority text CHECK (manual_priority IN ('low', 'normal', 'high', 'urgent')),
  is_hidden boolean NOT NULL,
  hidden_reason text CHECK (hidden_reason IN ('deprioritized', 'not-my-responsibility', 'waiting-on-someone', 'duplicate', 'other')),
  deferred_until timestamptz,
  deferred_reason text CHECK (deferred_reason IN ('deprioritized', 'not-my-responsibility', 'waiting-on-someone', 'duplicate', 'other')),
  is_blocked boolean NOT NULL,
  blocked_reason text CHECK (blocked_reason IN ('deprioritized', 'not-my-responsibility', 'waiting-on-someone', 'duplicate', 'other')),
  notes text NOT NULL,
  resolved_changes_requested_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
