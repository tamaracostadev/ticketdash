<!--
  Title convention: drop the "- Phase [N]" suffix for whole-product plans.
  Optional sections are marked "Include only when ...". Delete the ones that do
  not apply to keep the plan scannable.
-->

# Product Plan: [Product name] - Phase [N]

---

## Document status

<!--
  Use one of: Proposed as planning base / Approved as planning base for phase N /
  Revised after decision review.
-->

[Current document status.]

This document defines the product direction and the decisions that future specs
must derive from. It is not an implementation task by itself.

---

## Context

<!--
  Two short paragraphs: the prior state and the gap this plan closes.
  Focus on the problem space, not code structure.
-->

[Describe the prior state.]

[Describe the gap this plan closes and why this phase exists now.]

### The product should help answer

<!--
  3-6 user-facing questions. If you cannot phrase the value as questions, the
  scope is probably still too vague.
-->

- [Question the product should answer]
- [Question the product should answer]
- [Question the product should answer]

---

## Goals

<!--
  Numbered, outcome-oriented. Each goal must be a user-visible outcome, not an
  artifact to ship.
-->

1. [Goal]
2. [Goal]
3. [Goal]

---

## Product principles

<!--
  Rules future specs must preserve. Phrase as constraints, not aspirations.
-->

- [Principle, e.g. "Personal planning and external state are separate domains."]
- [Principle]
- [Principle]

---

## Information domains

<!--
  Include only when this phase introduces more than one conceptual data domain.
  Otherwise delete this section.
-->

### [Domain 1, e.g. External state]

- [What belongs here]
- [What belongs here]

### [Domain 2, e.g. Personal planning]

- [What belongs here]
- [What belongs here]

---

## Scope for this phase

<!--
  Capability areas the phase commits to. Each area should map to one or more
  future specs. A capability area may include a short conceptual block (ASCII
  layout, sample card) when it helps explain user-visible behavior.
-->

### [Capability area 1]

[Describe the desired behavior and why it matters.]

Expected rules:

- [Rule]
- [Rule]
- [Rule]

[Optional conceptual block, e.g.]

```text
APP-1234 - [Short ticket title]

[Today] [Urgent]

In development for 2 days
```

### [Capability area 2]

[Describe the desired behavior and why it matters.]

Expected rules:

- [Rule]
- [Rule]
- [Rule]

---

## Persistence model

<!--
  Include only when this phase introduces or changes how data is stored.
  Otherwise delete this section.
-->

### Architectural direction

[Describe where data lives, what owns writes, and which boundary protects
components from it.]

### Conceptual models

```text
TicketPlan
  ticketKey
  isPlanned
  manualOrder
  notes
```

### Retention and migration

- [How long data is kept]
- [How existing data migrates, if applicable]

---

## Security and privacy

<!--
  Include only when this phase touches credentials, persisted user data, or
  new network surfaces. Otherwise delete this section.
-->

- [Credentials never reach the browser / database.]
- [Local-only access for the new surface.]
- [Sensitive data does not appear in logs.]
- [Export, backup, retention need a dedicated decision.]

---

## Out of scope

<!--
  Explicitly list what this plan does not authorize. Keep examples concrete.
-->

- [Out-of-scope capability, e.g. "Multi-user collaboration"]
- [Out-of-scope integration]
- [Out-of-scope automation]

---

## Confirmed decisions

<!--
  Decisions already closed by this plan, so future specs do not reopen them.
  May be empty on the first draft.
-->

- [Confirmed decision]
- [Confirmed decision]

---

## Open product decisions

<!--
  Each open decision must be closed by the owner spec before its implementation
  begins. Use bullets, not a table, to match how the real plans evolve.
-->

- [Question to close before Spec N]
- [Question to close before Spec N+1]
- [Question to close before Spec N+2]

---

## Derived specs

<!--
  Public readers note: per docs/development-contract.md, the specs/ directory is
  local-only and will not appear in the public repository.
-->

See `specs/phase-[N]-README.md` for the spec sequence derived from this plan.
On a first draft, write "Specs will be derived after approval."

---

## Suggested incremental order

<!--
  This section coexists with "Derived specs" on the first draft: Derived specs
  is a placeholder, Suggested order is the proposed decomposition. Remove this
  section once a spec README absorbs the order.
-->

1. [First small step]
2. [Second small step]
3. [Third small step]

---

## Exit criteria

<!--
  Narrative bullets framed as "this plan is complete when ...". Each criterion
  must be observable from the product, not from internal artifacts.
-->

The phase is complete when:

- [Observable completion condition]
- [Observable completion condition]
- [Observable completion condition]

---

## Notes for future specs

<!--
  Guardrails for the next spec authors.
-->

- Derive small, approval-friendly specs from this plan.
- Record every closed decision back into this plan before coding.
- Do not treat this plan as permission to implement everything at once.
