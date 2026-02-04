# Conductor Workflow

## Core Workflow
We follow a Context-Driven Development approach.

1.  **Context**: Before coding, review `product.md` and `tech-stack.md`.
2.  **Spec & Plan**: For complex changes, create an implementation plan (Markdown).
3.  **Implement**: Write code conforming to the Tech Stack.
4.  **Verify**: Ensure the application starts and basic functionality works.

## Coding Standards
- **Keep it Simple**: Avoid over-engineering. This is a personal tool.
- **Comments**: JSDoc style comments for Classes and Methods.
- **Error Handling**: Graceful degradation. If data load fails, show UI error.
- **File Structure**: Keep `src/` (Backend) and `frontend/` (Frontend) strictly separated.
