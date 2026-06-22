# Development Contract

This project is developed incrementally and remains intentionally local-first.
The public repository documents stable behavior, while short-lived planning
artifacts stay local.

## Working model

Development is spec-driven.

1. Investigate the current behavior and affected files.
2. Create or update a local spec under `specs/`, starting from
   `docs/templates/spec-template.md`.
3. Get approval for the proposed scope.
4. Implement only the approved slice.
5. Validate the acceptance criteria.
6. Record deviations in the spec before closing it.

When a new phase or broader roadmap is needed, create or revise the local
product plan from `docs/templates/product-plan-template.md` before deriving the
next specs.

## Local-only artifacts

The following artifacts are part of the development workflow but are not meant
for the public repository:

- `specs/`
- local product plans

They remain local and Git-ignored. Public readers should be able to understand
the project from `README.md` and `docs/` without access to those files.

Public planning templates do belong in the repository:

- `docs/templates/spec-template.md`
- `docs/templates/product-plan-template.md`

## Public documentation obligations

Every relevant change must update public documentation in the same pass.

- `README.md` must stay accurate for setup, configuration, token permissions,
  runtime commands and major limits.
- `docs/architecture/` must describe stable architectural decisions.
- `docs/features/` must describe user-visible behavior and workflows.
- `docs/templates/` must remain the public contract for writing specs and
  product plans.

## Engineering constraints

- Keep the browser isolated from Jira and GitHub secrets.
- Keep persistence behind repository contracts and HTTP adapters.
- Prefer small, reviewable changes over broad rewrites.
- Keep the project organization-agnostic and configurable by environment.
- Do not rely on unpublished local specs to explain public behavior.
