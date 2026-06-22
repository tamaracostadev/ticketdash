# Persistence Architecture

Personal state and operational history are persisted through repository
contracts and local API adapters.

## Layers

1. Stores and hooks expose state and actions to the UI.
2. Repository contracts describe the required read and write operations.
3. Adapters implement those contracts through the local API.

React components do not access `localStorage`, persistence fetches or the
database directly.

## Persisted domains

- `lastSeen` markers for Jira comments and review activity
- ticket planning decisions
- activity snapshots from Jira and GitHub
- automatic and user-originated activity events
- personal reflections used by reports

These domains stay separate even when stored in the same PostgreSQL database.

## Migration approach

Earlier browser-only values are imported into PostgreSQL through idempotent
adapter logic. Failed imports do not delete the browser copy.

## Reporting implications

Operational snapshots support the daily work log and period summaries, but the
project avoids presenting historical timing as exact active work unless the
stored baseline is complete for the requested period.
