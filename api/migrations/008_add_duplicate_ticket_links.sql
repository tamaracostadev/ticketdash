ALTER TABLE ticketdash.ticket_plans
ADD COLUMN duplicate_of_ticket_key text
CHECK (
  duplicate_of_ticket_key IS NULL OR
  duplicate_of_ticket_key ~ '^[A-Z][A-Z0-9_]{1,19}-[0-9]+$'
);
