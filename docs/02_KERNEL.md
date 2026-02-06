# Kernel Context
## Purpose
Defines global immutable rules, roles, and governance structures.
## When to use
At the start of every session (Context Loading) and for dispute resolution.
## What does NOT belong here
Project status updates, specific feature requirements, or technical plans.

---
# Project Kernel & Governance

## Global Rules
1. **SAFE Mode by Default**: All sessions begin in SAFE mode. Risk-averse.
2. **No Infrastructure Changes**: No changes to hosting, CI/CD, or cloud configuration.
3. **No New Dependencies**: Do not add npm packages unless explicitly approved.
4. **Read-Only Baseline**: Existing files are READ-ONLY unless a specific Slice authorizes changes.
5. **No Planning Artifacts in Execution**: Do not create generic "task.md" or checklists during code execution; stick to the Slice definition.

## Roles
*   **ScrumMaster**: Sole authority on planning, slicing, and governance. Maintains the `docs/` state.
*   **Developer**: Execution only focused on speed and correctness (FAST).
*   **QA**: Verification only.
*   **Inventory**: Read-only audit of the codebase.

## Decision Flow
1.  **Ideas** → dumped into `docs/INBOX.md`.
2.  **Decisions** → made by ScrumMaster (user/proxy).
3.  **Execution** → performed via strict Slices.

## Failure Policy
*   **STOP on Uncertainty**: If a requirement is vague, stop and ask.
*   **Report Missing Info**: Do not guess implementation details.
*   **Never Improvise Workarounds**: Fix the root cause or flag it; do not hack a solution.
