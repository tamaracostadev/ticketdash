# Jira GitHub Work Dashboard

Local, single-user dashboard that combines assigned Jira work with open GitHub
pull requests. It provides a Kanban view, actionable review signals and personal
planning persisted in PostgreSQL.

## Screenshots

All screenshots below use `?demo=true`, which loads fully fictitious local data.

### Kanban

![Kanban view](./docs/screenshots/kanban.png)

### List

![List view](./docs/screenshots/list.png)

### Reports summary

![Reports summary](./docs/screenshots/reports-summary.png)

### Daily work log

![Daily work log](./docs/screenshots/reports-daily-log.png)

## Features

- Loads active Jira issues assigned to the configured account.
- Links pull requests by Jira key in the branch name or PR title.
- Supports multiple pull requests and repositories per ticket.
- Highlights merge conflicts, requested changes and open review threads.
- Highlights workflow alerts such as `Code review without PR`,
  `Release with open PR` and `Test with open threads`.
- Adds a dedicated review-work queue for pending reviews and re-reviews.
- Provides configurable workflow columns and dynamic project filters.
- Stores planning, priority, hidden tickets and notes in local PostgreSQL.
- Supports linking hidden duplicate tickets to a visible primary ticket.
- Supports persisted manual ticket ordering inside each workflow column.
- Distinguishes `development` from `active in development` work state.
- Persists activity snapshots, workflow events, review events and daily work log data.
- Keeps Jira and GitHub credentials on the local API process.

## Requirements

- Docker with Docker Compose.
- Port `5174` available on the host.
- Jira Cloud API credentials.
- A GitHub token that can read the required repositories and pull requests.

Node 24 is the project runtime. Docker provides the reference version.

## Configuration

Clone the repository and create the local environment file:

```bash
git clone <repository-url> ticketdash
cd ticketdash
cp .env.example .env
```

Required credentials:

```dotenv
JIRA_URL=https://example.atlassian.net
JIRA_EMAIL=developer@example.com
JIRA_API_TOKEN=
GITHUB_TOKEN=
GITHUB_USERNAME=
```

## Token permissions

### Jira

Create an API token at
[id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
for the account configured in `JIRA_EMAIL`.

The token itself does not have separate scopes. Access follows the Jira user
permissions of that account. The account must be able to:

- sign in to the target Jira Cloud site;
- browse the relevant projects and issues;
- view the comments and workflow statuses needed by the dashboard.

### GitHub

Create a fine-grained personal access token at
[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
with read access to every repository whose pull requests should appear in the
dashboard.

Recommended minimum:

- repository access granted to every relevant repository;
- `Pull requests: Read-only`;
- `Metadata: Read-only`.

If your organization requires broader read visibility for private repositories,
grant only the additional read permissions needed by your GitHub policies.

Selection is separate from authorization:

- Tokens determine which Jira projects and GitHub repositories can be accessed.
- `JIRA_PROJECT_KEYS` limits which assigned Jira projects are loaded. Empty
  means every active assigned project visible to the token.
- `GITHUB_SEARCH_SCOPES` optionally restricts PR search with `org:example` or
  `repo:owner/name` qualifiers.
- `TICKET_KEY_PREFIXES` optionally limits Jira keys recognized in PR names.
  Empty means prefixes are derived from the Jira tickets returned.
- `WORKFLOW_*_STATUSES` maps Jira status names to dashboard columns.

Workflow status groups already have built-in defaults in
[`src/config/workflow.ts`](./src/config/workflow.ts). If your Jira statuses are
already covered by those defaults, you do not need to set any
`WORKFLOW_*_STATUSES` variables in `.env`.

Current built-in defaults:

- `backlog`: `Backlog`, `Delivery`, `Open`, `Ready`, `To Do`
- `development`: `Development`, `Dev`, `Dev In Progress`, `In Progress`
- `code review`: `Code Review`, `In Review`
- `testing`: `In QA`, `QA In Progress`, `Test`, `Test In Progress`, `Testing`
- `release`: `Ready for Production`, `Ready for Release`, `Waiting for Release`
- `finalized`: `Alpha`, `Announce`, `Beta`, `Closed`, `Deleted`, `Done`,
  `Released`, `Shipped`

Important: each `WORKFLOW_*_STATUSES` value is appended to the built-in
defaults for that workflow group. Duplicates are ignored case-insensitively.

See [.env.example](./.env.example) for every supported setting.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `JIRA_URL` | Yes | Jira Cloud base URL, such as `https://example.atlassian.net`. |
| `JIRA_EMAIL` | Yes | Jira account email used by the local API. |
| `JIRA_API_TOKEN` | Yes | Jira Cloud API token for `JIRA_EMAIL`. |
| `JIRA_PROJECT_KEYS` | No | Comma-separated Jira project keys to load. Empty means every visible active assigned project. |
| `JIRA_ISSUES_LIMIT` | No | Maximum Jira issues loaded per refresh. Defaults to `50`. |
| `GITHUB_TOKEN` | Yes | GitHub token used by the local API. |
| `GITHUB_USERNAME` | Yes | GitHub login whose authored PRs and review-requested PRs are queried. |
| `GITHUB_SEARCH_SCOPES` | No | Additional GitHub search qualifiers such as `org:example` or `repo:owner/name`. |
| `GITHUB_AUTHORED_PRS_LIMIT` | No | Maximum authored pull requests loaded per refresh. Defaults to `30`. |
| `GITHUB_REVIEW_REQUESTED_PRS_LIMIT` | No | Maximum review-requested pull requests loaded per refresh. Defaults to `30`. |
| `TICKET_KEY_PREFIXES` | No | Comma-separated Jira key prefixes accepted in PR titles and branch names. Empty derives them from loaded Jira tickets. |
| `WORKFLOW_BACKLOG_STATUSES` | No | Jira status names that map to the backlog column. |
| `WORKFLOW_DEVELOPMENT_STATUSES` | No | Jira status names that map to the development column. |
| `WORKFLOW_CODE_REVIEW_STATUSES` | No | Jira status names that map to the code review column. |
| `WORKFLOW_TESTING_STATUSES` | No | Jira status names that map to the testing column. |
| `WORKFLOW_RELEASE_STATUSES` | No | Jira status names that map to the release column. |
| `WORKFLOW_FINALIZED_STATUSES` | No | Jira status names that map to the finalized column. |
| `POSTGRES_DB` | No | Local PostgreSQL database name. Defaults to `ticketdash`. |
| `POSTGRES_USER` | No | Local PostgreSQL username. Defaults to `ticketdash`. |
| `POSTGRES_PASSWORD` | No | Local PostgreSQL password. Defaults to `ticketdash`. Change before storing real data. |

Recommended starting points:

- keep the defaults (`50 / 30 / 30`) for a single developer with a focused queue;
- raise `JIRA_ISSUES_LIMIT` first if assigned Jira work is being truncated;
- raise `GITHUB_AUTHORED_PRS_LIMIT` if you regularly keep many open PRs at once;
- raise `GITHUB_REVIEW_REQUESTED_PRS_LIMIT` if review work is a major part of your flow;
- prefer increasing in small steps, because these values affect every refresh.

## Run

```bash
docker compose up --build
```

The first build downloads PostgreSQL and installs Node dependencies and may
take a few minutes. Subsequent runs reuse the cache.

Open `http://localhost:5174`. Only the dashboard is published, and only on
`127.0.0.1`. The API and PostgreSQL remain inside the Docker network.

For public screenshots or recordings without real Jira or GitHub data, open:

```text
http://localhost:5174/?demo=true
```

Demo mode replaces live integrations, reports and review signals with fully
fictitious in-browser data. It does not require real ticket content to produce
shareable UI screenshots.

The board loads assigned Jira tickets and open GitHub pull requests on the
first visit. If it stays empty, check that the configured account has
assigned issues and that `JIRA_PROJECT_KEYS` is not filtering them all out.

To stop:

```bash
docker compose down
```

## Troubleshooting

- **Port `5174` already in use.** Stop the conflicting process or change the
  host port in `docker-compose.yml`.
- **`Cannot connect to the Docker daemon`.** Start Docker Desktop or the
  Docker service before running `docker compose`.
- **Jira returns 401 or 403.** Verify the token was generated for the same
  account as `JIRA_EMAIL` and that the account can browse the target
  projects.
- **GitHub returns no pull requests.** Confirm the token grants access to
  every relevant repository and that `GITHUB_USERNAME` matches the GitHub
  login that authors the PRs or receives the review requests you expect to
  see.
- **Empty Kanban after a successful start.** Clear `JIRA_PROJECT_KEYS` to let
  every visible project through, or widen `WORKFLOW_*_STATUSES` if your Jira
  uses custom status names.

## Validation

Inside the running container (matches the project Node version):

```bash
docker compose exec -T dashboard npm run check
```

On the host (requires Node 24 and `npm install` first):

```bash
npm install
npm run check
npm audit
```

Tests use controlled fixtures and do not access real credentials.

## Database

Migrations run automatically before the API starts. Run them again with:

```bash
docker compose run --rm migrate
```

Create a local backup:

```bash
mkdir -p backups
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > backups/work-dashboard.dump
```

Restore it:

```bash
docker compose exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < backups/work-dashboard.dump
```

`backups/` and `.env` are excluded from Git and the Docker build context.

## Architecture

- `api/`: local API, health checks, PostgreSQL access and migrations.
- `server/`: Jira/GitHub clients and environment configuration.
- `src/api/` and `src/hooks/`: browser data access with TanStack Query.
- `src/utils/`: linking, workflow and priority rules.
- `src/store/` and `src/persistence/`: local and HTTP persistence adapters.
- `tests/`: controlled domain and API regression tests.

Public architecture and feature references:

- [docs/development-contract.md](./docs/development-contract.md)
- [docs/templates/spec-template.md](./docs/templates/spec-template.md)
- [docs/templates/product-plan-template.md](./docs/templates/product-plan-template.md)
- [docs/architecture/local-api-database.md](./docs/architecture/local-api-database.md)
- [docs/architecture/persistence.md](./docs/architecture/persistence.md)
- [docs/features/dashboard-overview.md](./docs/features/dashboard-overview.md)
- [docs/features/integrations.md](./docs/features/integrations.md)
- [docs/features/planning-and-workflow.md](./docs/features/planning-and-workflow.md)
- [docs/features/history-and-reports.md](./docs/features/history-and-reports.md)

## Current Limits

- Local, single-user application without hosted authentication.
- Jira Cloud only.
- Review-request visibility may be partially limited by the GitHub token
  access; in those cases the dashboard shows a dismissible warning instead of
  failing the full load.
- Refresh sizes are configurable, but still snapshot-based rather than paginated:
  `JIRA_ISSUES_LIMIT`, `GITHUB_AUTHORED_PRS_LIMIT` and
  `GITHUB_REVIEW_REQUESTED_PRS_LIMIT`.
- Higher limits increase response size and refresh cost on both Jira and GitHub.
- No polling, browser end-to-end suite or hosted deployment.
- No license has been selected yet.

## Documentation policy

Public documentation lives in `README.md` and `docs/`. Local specs continue to
drive development, but they stay Git-ignored and are not part of the public
repository contract.

Before publishing a fork, follow
[docs/public-release-checklist.md](./docs/public-release-checklist.md).
