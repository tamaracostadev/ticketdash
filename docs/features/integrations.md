# Jira and GitHub Integrations

The dashboard reads Jira and GitHub through the local API process.

While the Docker stack is running, the local API may also refresh integration
state in the background so persisted operational history stays current even
without an open browser tab.

## Jira

The Jira integration loads active issues assigned to the configured account and
maps their workflow status into dashboard columns.

Active loading continues to exclude Jira's `Done` category. Separately, the
background process reads a bounded window of Jira status history to recover
closures performed by the configured user directly from configured backlog or
development statuses. Startup recovery covers the previous seven days and
subsequent polls continue from the last successful lookup with overlap.

Supported capabilities include:

- project filtering through `JIRA_PROJECT_KEYS`
- ticket key derivation for PR matching
- seen tracking for Jira comments
- configurable workflow groups by status name
- optional background polling owned by the local API
- background-only recovery of direct backlog/development closures

## GitHub

The GitHub integration loads open pull requests authored by the configured user
and also attempts to load open pull requests with active review requests for
that same user. Search can be scoped by repository or organization qualifiers
when requested.

Supported capabilities include:

- multi-repository PR matching per ticket
- merge conflict detection
- review summary and requested-changes detection
- unresolved thread detection
- pending review-request detection for the configured GitHub user
- re-review detection after prior `changes requested` plus new commits
- explicit workflow alerts for missing or mismatched review states
- dismissible warnings when review-request visibility is limited by the GitHub
  token access
- optional background polling owned by the local API

## Configuration model

Authorization is separate from selection:

- credentials define what the local API can access
- environment variables define which projects, repositories and workflow names
  the dashboard should consider
- background polling cadence is configured through server-side environment
  variables and never depends on the browser tab staying open
