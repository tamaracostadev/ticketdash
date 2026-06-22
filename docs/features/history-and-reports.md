# History and Reports

The local API persists ticket snapshots and activity events so the dashboard can
build a lightweight personal work history.

## Persisted history

The system stores:

- Jira and GitHub operational snapshots
- automatic workflow events
- user-originated planning actions
- personal reflections

## Summary report

The summary view aggregates persisted actions by day, week, month, year or a
custom date range using the browser timezone.

Tracked sections include:

- delivery metrics such as planned, started, moved to review, moved to testing,
  moved to release, completed and blocked
- review metrics such as reviews completed and re-reviews completed
- segmented rework metrics for review, QA, conflict and total rework
- cycle time for `development active -> code review` and
  `development active -> release`, with current-period and previous-period
  averages and medians

Cycle time starts from the latest persisted `active-development-started` event
before the milestone and ends when the ticket reaches the target milestone. If
the ticket is restarted after rework, the newer active-development start is used
for the later cycle instead of stretching the original one.

## Daily work log

The daily work log is optimized for reviewing a single day of work.

It includes:

- `Planned for today`
- `Done <date>`
- review entries executed by the configured GitHub user
- re-review entries executed by the configured GitHub user
- grouped ticket activity panels
- separation between personal actions, workflow progress and workflow
  regressions

The view also:

- groups multiple movements under the same ticket
- supports an explicit date filter
- ignores noisy workflow status correction chains that return to their original
  state within a short window
- omits stale "resolved merge conflict" entries when the ticket still has an
  active conflict
