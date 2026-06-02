# Maintainability Rules

The management console should stay legible for both humans and coding agents. The repo follows the harness-engineering pattern of keeping knowledge in-repo and enforcing important invariants mechanically instead of relying on review memory alone.

## File Size Budget

- Default source file budget: 650 lines for `src/**/*.ts` and `src/**/*.tsx`.
- The harness has no large-file allowlist. All source files must stay under the same default budget.
- New work should extract focused components, mappers, hooks, or helpers instead of adding more responsibility to a large file.
- If a file genuinely needs more space, split it again before merging instead of raising the budget.

## Refactoring Priority

1. Route shell and workspace orchestration should move out of `src/App.tsx` into route-level modules.
2. Control-plane transport and mapping should be split into API client, DTO types, and mapper modules.
3. Cluster detail surfaces should keep view components focused and move repeated cards, drawers, and tables into reusable components.

## Mechanical Checks

`npm run harness:check` enforces the docs map and the file-size budget. This keeps the repository understandable as the UI grows.

Reference: [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/)
