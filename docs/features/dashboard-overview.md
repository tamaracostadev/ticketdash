# Dashboard Overview

The dashboard combines Jira work and GitHub pull requests into a local,
single-user operational view.

## Main views

- `Kanban`: grouped workflow view with planning and action signals
  - supports grab-to-scroll horizontal navigation
  - keeps column headers sticky inside the board
- `List`: filterable ticket list for operational review
- `Reports`: personal summary and daily work log

## Dedicated sections

- `Review work`: dedicated section in the main operational flow for teammate
  PRs that require your review attention

## Demo mode

Appending `?demo=true` to the dashboard URL switches the UI to a fully
fictitious dataset for screenshots, public demos and documentation.

## Ticket linking

Tickets are linked to pull requests when a Jira key appears in the branch name
or PR title. One ticket may have multiple pull requests across multiple
repositories.

## Core signals

- merge conflicts
- requested changes
- open review threads
- new comments
- workflow alerts

Workflow alerts currently focus on explicit actionable cases:

- `Code review without PR`
- `Release with open PR`
- `Test with open threads`

## Personal controls

Users can:

- plan or unplan tickets
- assign manual priority
- assign a 1-based manual order inside the current workflow column
- hide irrelevant tickets
- link hidden duplicate tickets to a visible primary ticket
- add personal reflections
- track pending reviews and re-reviews separately from delivery work

Those decisions persist in local PostgreSQL.
