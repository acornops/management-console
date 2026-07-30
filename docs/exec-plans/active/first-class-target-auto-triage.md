# First-Class Target Auto-Triage

## Goal

Expose automatic investigation configuration and activity through the existing
Kubernetes, virtual-machine, issue, chat, and approval surfaces with minimal
new UI and no new top-level navigation.

## UX Constraints

- Place one shared Auto-triage section in existing target Settings pages.
- Mark the settings section Experimental with the same shared badge treatment
  used by the Automation navigation category.
- Keep one target chat route and session model. Split the assistant rail into
  manual Chats and automatic Investigations, with global Search spanning both.
- Use linked issue status/scope/object/severity in investigation rows instead
  of a redundant origin badge.
- Reuse the current target chat route, composer, approval cards, cancellation,
  deletion, retention, and recent-activity warning.
- Present kickoff content as a neutral investigation brief, not a human bubble.
- Keep workflow activity independent and preserve manual chat ownership.
- Keep the settings, issue activity, chat context, and API modules free of
  Workflow/Automation imports and `manage_workflows` permission dependencies.
- Pair every status tone with an icon and explicit text and keep keyboard and
  screen-reader semantics intact.

## UX Acceptance Criteria

- Draft settings save explicitly, surface revision conflicts, explain requested
  versus effective safety, and allow enablement during transient readiness
  blocks.
- Enabling never starts existing issues without the explicit follow-up action.
- Automatic sessions remain discoverable in Investigations without displacing
  manual Chats, and a per-user unseen badge clears only when investigations are
  actually viewed.
- Deep links from issues and approvals select the existing target chat session.
- Shared replies show the real user author; manual replies remain owner-only.
- Issue-bearing views refresh without clearing current rows or flashing.

## Validation Log

- 2026-07-29: the queue-visibility polish added a compact active/waiting ledger
  row to the existing Kubernetes and VM Settings card, including oldest waiting
  time and a link to the existing target Overview issue surface. Focused
  settings and independence tests, lint, contracts, production build, route
  smoke, 724 unit tests, 19 design snapshots, 171 fixture checks, and 21 MCP
  parity checks passed. The repository-wide harness remains blocked only by the
  pre-existing 670-line `McpServersView.tsx` against its 650-line budget; that
  unrelated file was not changed.
- 2026-07-29: `VITE_APP_DATA_MODE=control-plane npm run validate` passed,
  including design-system checks, type checking, 721 unit tests, desktop/mobile
  design snapshots, 171 repeated fixture smoke tests, 21 repeated MCP parity
  tests, membership and contract checks, harness checks, production build, and
  route smoke checks.
- 2026-07-29: the independence audit added source-boundary and permission
  regression guards, kept target settings available without Automation
  navigation, and removed competing manual-assistant actions while an automatic
  investigation has the primary issue action.
- 2026-07-29: the shared approvals table now labels its generic provenance
  column `Activity`, avoiding Workflow-specific copy for target-tool approvals.
- 2026-07-29: cleanup review consolidated the Experimental badge into a shared
  primitive and corrected direct/hash session deep links so browser
  back/forward updates both Kubernetes and VM chat selection.
- 2026-07-29: focused auto-triage settings, issue activity, API, chat ownership,
  session-origin, and message-attribution tests passed.
- 2026-07-29: workspace platform harness, contract, runtime-truth, and
  conventional-commit checks passed.
- 2026-07-29: the production UX audit made readiness-delayed issue rows
  actionable, kept existing-issue queueing available during temporary outages,
  removed duplicated approval provenance, localized the recent-chat marker,
  and hardened save/start refresh races without adding a new surface.
- 2026-07-29: the final cleanup kept stopped investigations neutral, removed
  competing manual-assistant actions when a stopped transcript is still
  available, preserved the Kubernetes issue-table column structure, and
  replaces invalid session query parameters while retaining the nonblocking
  fallback notice and normal browser history.

## Completion Criteria

- Kubernetes and VM settings, chat origin treatment, issue activity, approvals,
  recent warnings, deep links, mirrored contracts, copy, accessibility, and
  focused tests are complete.
- Console and cross-repository validation pass.

Status: complete; keep active until the coordinated change lands, then move
this plan to `completed/`.
