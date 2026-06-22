# Repository Rules

## Project goal

This repository contains a local dashboard that consolidates active Jira work
with open GitHub pull requests.

The project should also remain a clear React learning base. Prefer simple,
well-typed and idiomatic code. Do not optimize prematurely.

## Sources of truth

Before changing code or documentation, read:

1. `AGENTS.md` for permanent repository rules.
2. `README.md` for public setup, configuration and operational limits.
3. `docs/development-contract.md` for the public development contract.
4. The relevant documents under `docs/` for the feature area being changed.
5. The local spec for the feature or step being implemented.
6. `docs/templates/spec-template.md` and
   `docs/templates/product-plan-template.md` when creating a new spec or
   product plan.

When there is a conflict, the most recent explicit decision in the local spec
wins. Record that decision in the affected spec before implementing.

## Spec-driven development

Every new feature, integration, meaningful behavior change or architectural
decision must have a local spec in `specs/` before implementation.

When creating a new spec, start from `docs/templates/spec-template.md`.
When creating or revising a product plan, start from
`docs/templates/product-plan-template.md`.

The required flow is:

1. Investigate the context and affected files.
2. Create or update a local spec.
3. Present the plan and wait for approval.
4. Implement only the approved scope.
5. Validate every acceptance criterion.
6. Record any implementation deviations in the spec.
7. Close the step before starting the next one.

Do not start implementation together with a new spec unless the user explicitly
requests both in the same turn.

## Local-only planning artifacts

`specs/` and local product plans are part of the working process, but they are
not public repository artifacts.

- Keep `specs/` local and ignored by Git.
- Keep local product plans out of the public repository.
- Do not move public documentation back into `specs/`.
- Promote stable architectural or feature behavior to `docs/` and `README.md`.

## Minimum content for a local spec

Each feature spec should state:

- goal;
- context and relevant decisions;
- in-scope and out-of-scope work;
- files to create or change;
- expected behavior at completion;
- verifiable acceptance criteria;
- validation strategy;
- dependencies or risks, when relevant.

Prefer small, independent and reviewable steps. Do not anticipate future-step
files or behavior.

Product plans should stay problem-focused, close product decisions before
implementation, and break work into short follow-up specs instead of authorizing
large one-shot implementation.

## Approved stack

- Node 24 LTS
- Vite 8
- `@vitejs/plugin-react` 6
- React 18
- TypeScript 5 in strict mode
- Tailwind CSS 3
- TanStack Query v5
- Zustand, only for necessary global state
- `lucide-react`
- Docker and Docker Compose

Do not add dependencies outside this stack without justification and approval.

## Architecture rules

- Use function components with hooks only.
- Keep business logic outside React components.
- Keep fetching and rendering separated.
- Do not use `any`.
- Each file should have a single responsibility.
- Target files under 150 lines where practical. Split when the boundary becomes
  unclear.
- Do not change the folder structure without recording the reason in a spec.
- Credentials must never be hardcoded, committed or logged.
- Integration secrets must never enter the browser bundle.

## Persistence rules

Persistence must remain extensible for the local API and database architecture
documented in `docs/architecture/persistence.md`.

- Components do not access `localStorage`, persistence APIs or the database
  directly.
- Stores and hooks consume repository contracts.
- `lastSeen` uses an HTTP adapter backed by local PostgreSQL.
- Planning uses an HTTP adapter backed by local PostgreSQL.
- Credentials, seen markers and activity history stay in separate domains even
  when they share the same database.
- Jira and GitHub credentials live in `.env` without a `VITE_` prefix and are
  read only by the local server process.
- Jira project keys, GitHub scopes, ticket prefixes and workflow groups are
  environment-driven and must stay organization-agnostic.
- The browser reaches Jira and GitHub only through local proxy routes.

## Documentation maintenance

Any relevant change must keep repository documentation current.

- Update `README.md` whenever setup, configuration, permissions, commands or
  operational limits change.
- Update the relevant files in `docs/` whenever feature behavior, workflow
  rules or architecture change.
- Do not leave a feature implemented only in code and local specs.
- Keep public documentation in English.

## Current scope

The current scope includes:

- Jira and GitHub configuration through `.env` on the local server process;
- a local proxy for authenticated Jira and GitHub requests;
- active Jira issue loading for configured projects;
- open GitHub PR loading for the configured account;
- ticket-to-PR linking by configured or derived Jira keys;
- review, conflict and unresolved thread status;
- Jira comment seen tracking;
- an action-oriented board with planning and workflow alerts;
- local container-based development with hot reload;
- persisted personal planning, ticket history, reflections and reports.

The following remain out of scope until a new approved local spec exists:

- multi-user authentication;
- a hosted production backend or remote access;
- push notifications;
- automatic Jira status updates;
- deployment.

## Validation and definition of done

A step or feature is done only when:

- the implemented scope matches the approved spec;
- every acceptance criterion was verified;
- `npm run check` passes when the automated suite exists;
- `npm run build` passes once the application exists;
- any additional validation defined by the spec passes;
- credentials or secrets do not appear in the diff;
- known limits and deviations are documented;
- public docs are updated when relevant;
- no next-step behavior was anticipated unnecessarily.

At the end, report the changed files, the validations executed and any
remaining risk or limit.
