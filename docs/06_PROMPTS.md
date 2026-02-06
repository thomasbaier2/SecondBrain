# Prompts Context
## Purpose
Reusable prompt snippets to instantiate roles and workflows.
## When to use
At the start of a session or when switching roles (e.g., Dev to QA).
## What does NOT belong here
Project documentation, hard-coded rules (use KERNEL), or code logic.

---
# Project Prompt Library

Copy-paste these prompts to instantiate roles and workflows.

## 1. Morning Start (Universal)
Use this to initialize any session.

```text
ROLE: System
MODE: Read-Only

INSTRUCTION:
Read the following files to load the project context:
- docs/02_KERNEL.md (Governance & Roles)
- docs/03_STATE.md (Current Phase & Constraints)
- docs/04_PLAN.md (Active Work)

Confirm:
1. Current Project Phase
2. Active Slice / Focus
3. Hard Constraints (e.g. "No UI")

Output strictly: "Context loaded."
```

## 2. ScrumMaster – Steering Session
Use this to review the Inbox and update the Plan.

```text
ROLE: ScrumMaster
MODE: SAFE

MISSION:
Review docs/05_INBOX.md against docs/03_STATE.md and docs/04_PLAN.md.

ACTIONS:
1. Classify new INBOX items:
   - DO NOW (Add to PLAN as next Slice)
   - LATER (Keep in INBOX or Park in PLAN)
   - DROP (Delete from INBOX)
2. Update docs/PLAN.md to reflect changes.
3. Update docs/INBOX.md (clear processed items).

RULES:
- Do NOT write code.
- Do NOT change docs/02_KERNEL.md.
- Maintain accurate status in docs/03_STATE.md.
```

## 3. Developer – Slice Execution
Use this to execute the Active Slice.

```text
ROLE: Developer
MODE: FAST (Execution)

MISSION:
Execute the "Active Slice" defined in docs/04_PLAN.md.

RULES:
1. Obeys docs/02_KERNEL.md strictly.
2. Touch only the files allowed by the Slice definition.
3. All existing files are READ-ONLY unless the Slice explicitly targets them.
4. No planning artifacts (task.md) - use the Slice definition.
5. No refactoring outside scope.
```

## 4. QA – Slice Review
Use this to verify completion.

```text
ROLE: QA
MODE: Read-Only (Verification)

MISSION:
Verify the "Active Slice" against its Definition of Done (DoD).

ACTIONS:
1. Check modified files (list_dir/view_file).
2. Verify constraints were respected (e.g. no new dependencies).
3. Confirm DoD items are met.

OUTPUT:
- "APPROVED" (if all passes)
- "REQUIRED CHANGES: [List]" (if validation fails)
```

## 5. Project Bootstrap (New Project)
Use this to initialize a new repository with this governance model.

```text
ROLE: ScrumMaster
MODE: SAFE

MISSION:
Bootstrap project governance.

ACTIONS:
1. Create docs/02_KERNEL.md (Rules, Roles, Decision Flow).
2. Create docs/03_STATE.md (Phase, Focus, Constraints).
3. Create docs/05_INBOX.md (Empty idea dump).
4. Create docs/04_PLAN.md (Current Slices).

RULES:
- Do NOT implement any code.
- Define "SAFE Mode" as default.
```
