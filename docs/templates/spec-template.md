# Spec [N]: [Short descriptive name]

<!--
  HOW TO USE THIS TEMPLATE

  A spec describes one small, verifiable delivery slice.
  If the work does not fit in one implementation session, split it.

  Expected flow:
  1. Close every open decision before approving the spec.
  2. Record those decisions in the active product plan before implementation.
  3. Start the implementation session with this spec as the contract.
  4. The agent presents an implementation plan before editing code.
  5. Approve the plan.
  6. Implement in small slices.
  7. Run the defined tests before review.
  8. Review in a separate session with this spec and the diff.

  For bugs: investigate first and only create the fix spec after the root cause
  is confirmed.
-->

---

## Status

<!--
  pending / approved / in progress / completed
  Do not implement before "approved".
-->

Pending. Waiting for the decisions listed below to be closed.

---

## Phase and references

- **Phase:** [N]
- **Product plan:** `product-plan-phase-N.md`
- **Previous spec:** Spec [N-1] — [name]
- **Next spec:** Spec [N+1] — [name]

---

## Context

<!--
  Why this spec exists. What problem or gap it closes.
  Describe the problem, not the implementation.
  2-4 lines are usually enough.
-->

[Describe the problem or gap addressed by this spec.]

---

## Goal

<!--
  What will be working when this spec is complete.
  Keep it to one sentence when possible.
-->

[One sentence describing the completed outcome.]

---

## Out of scope

<!--
  What this spec explicitly does not implement.
  Without this section, scope will drift.
-->

- [Excluded behavior]
- [Excluded integration]
- [Edge case deferred to a future spec]

---

## Dependencies

<!--
  Which specs must already be complete.
-->

| Spec | Expected status |
|------|-----------------|
| Spec [N] — [name] | Completed |

---

## Decisions to close before implementation

<!--
  Open product decisions owned by this spec.
  They must be answered explicitly before moving the status to approved.
-->

| Decision | Answer |
|----------|--------|
| [Question from the product plan] | [Explicit answer before implementation] |

---

## Files involved

<!--
  List the files expected to be created or changed.
  The agent should not edit files outside this list without explaining why.
-->

**Created:**
- `[path/file.ts]` — [responsibility]

**Changed:**
- `[path/file.ts]` — [what changes]

**Do not touch:**
- `[path/file.ts]` — [reason]

---

## Expected behavior

<!--
  Describe the post-spec behavior in terms of:
  - input
  - processing / business rules
  - output
  - what must not happen
-->

### [Behavior 1]

**Input:** [what enters the system]  
**Processing:** [business rules and system behavior]  
**Output:** [expected result]  
**Does not happen:** [what remains out of scope]

### [Behavior 2]

[same structure]

---

## Acceptance criteria

<!--
  Use Given / When / Then.
  Every criterion must be directly verifiable.
-->

```text
Given [initial context],
when [action or event],
then [expected result].

Given [edge-case context],
when [action],
then [expected edge-case result].

Given [error context],
when [invalid action],
then [expected error behavior].
```

---

## Test plan

<!--
  The validation types this spec requires.
-->

- **Unit:** [what to test in isolation]
- **Integration:** [what to test with real dependencies]
- **Manual:** [what must be checked manually before review]

---

## Risks

<!--
  What can go wrong in this spec specifically.
-->

- **[Technical risk]:** [description and expected mitigation]
- **[Data risk]:** [description and expected mitigation]
- **[Regression risk]:** [what may break and how to verify it]

---

## Definition of done

- [ ] Behavior implemented as described
- [ ] Acceptance criteria covered by tests
- [ ] No files changed outside the listed scope
- [ ] Errors and edge cases handled
- [ ] Review performed in a separate session with this spec and diff
- [ ] The diff is understood before merge
- [ ] Closed decisions recorded in the product plan
- [ ] Spec status updated to `completed`

---

## Context for the agent

<!--
  This section is pasted at the start of the implementation session.
  Include the relevant pattern, architecture notes, and session restrictions.
-->

```text
Stack: [relevant technologies and versions]
Architecture: [expected pattern for this spec]
Pattern to follow: [pasted snippet or referenced pattern]

Task: implement Spec [N] exactly as described above.

Restrictions:
- Do not edit files outside the "Files involved" list
- Do not add dependencies without approval
- [spec-specific restriction]

Before implementing:
1. Confirm the plan in up to 10 bullets.
2. List the files you intend to edit.
3. Point out any unclear decision in this spec.
```
