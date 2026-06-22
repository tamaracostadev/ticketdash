# Planning and Workflow Behavior

The board separates current work from background assignments and keeps planning
rules explicit.

## Workflow columns

The dashboard groups Jira statuses into these operational columns:

- backlog
- planned
- development
- code review
- testing
- release
- finalized

The exact Jira status names for each group are configured through
`WORKFLOW_*_STATUSES`.

## Planning rules

- backlog tickets can be planned manually
- development tickets can be inactive or active
- active development can start from an explicit Jira in-progress status or a
  manual `Start work` action
- active development can be paused manually
- development tickets may remain planned when they are active work
- tickets that regress from review or QA back to development are automatically
  added to planned with high automatic priority
- tickets outside backlog or development are automatically removed from planned
  unless a new regression or explicit planning action brings them back
- tickets outside development can expose an assisted `Move to development`
  action when Jira offers exactly one direct transition to a configured
  development status
- manual order is optional, 1-based and applies inside the current workflow
  column

## Assisted Jira return

The dashboard can read the Jira transitions for an eligible ticket and expose a
single-step return action.

Rules:

- the action is only shown when Jira exposes exactly one direct transition to a
  configured development status
- the action is explicit and user-triggered
- if Jira exposes zero or multiple direct development transitions, the
  dashboard does not execute anything automatically
- multi-step workflow guesses are intentionally out of scope

## Action-required logic

Tickets are considered action-oriented when they have signals such as:

- merge conflicts
- requested changes
- new comments
- unresolved review threads
- linked duplicates that still need to catch up to `release`
- explicit workflow alerts

## Hidden tickets

Tickets can be hidden locally when they are assigned but not relevant to the
current work horizon.

When a hidden ticket is hidden as `duplicate`, it can be linked to one visible
primary ticket. A primary ticket may have multiple linked duplicates. The
dashboard only raises a synchronization reminder when the primary ticket reaches
`release` and one or more linked duplicates have not reached `release` yet.

## Kanban navigation

- the board can be dragged horizontally with a grab gesture
- interactive controls inside cards are excluded from board dragging
- each column keeps its own sticky header visible while scrolling down
