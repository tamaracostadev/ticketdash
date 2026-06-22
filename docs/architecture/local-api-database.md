# Local API and Database Architecture

The dashboard uses a separate local API instead of exposing Jira or GitHub
credentials through Vite middleware.

## Runtime flow

```text
Browser -> 127.0.0.1:5174 -> Vite -> /api -> Fastify API:3000 -> PostgreSQL:5432
                                                   -> Jira / GitHub
```

Only the dashboard is published on the host. The API and PostgreSQL remain
inside the Docker network.

## Stack

- Node 24
- TypeScript in strict mode
- Fastify 5
- `pg`
- PostgreSQL 17
- SQL migrations under `api/migrations/`

## Responsibilities

- `api/`: HTTP routes, health checks, migrations and PostgreSQL access
- `server/`: Jira and GitHub clients plus environment parsing
- `src/api/` and `src/hooks/`: browser-side data loading

## Health checks

- `GET /api/health`: process health only
- `GET /api/health/db`: process and database health

The API starts only after the database is healthy and migrations have run.

## Security boundary

- Jira and GitHub credentials stay in `.env` without `VITE_` prefixes.
- The browser never receives integration tokens.
- Public Docker exposure is limited to `127.0.0.1:5174`.
