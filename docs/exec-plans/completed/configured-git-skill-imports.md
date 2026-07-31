# Configured Git skill imports

## Goal

Replace provider/API/ref/subpath fields with one full Git URL while keeping
custom GitHub and GitLab hosts under deployment control.

## Scope

- Add a Helm-owned Git-host allowlist with GitHub.com and GitLab.com defaults.
- Resolve repository, folder, and `SKILL.md` URLs in the control plane using
  anonymous provider API access.
- Use the resolver for target skills, Agent skills, and platform workspace
  defaults.
- Keep existing pinned snapshot storage, bundle limits, permissions, and
  reimport behavior.
- Do not add Git credentials or private-repository authentication.

## Contract

The browser submits `repoUrl` and may use stored `ref` and `subpath` during
reimport. The server matches the URL against `GIT_IMPORT_HOSTS_JSON`, infers the
provider and location, and returns bounded Markdown files plus immutable Git
provenance. Unsupported hosts fail before an outbound request.

## Validation

- Control-plane typecheck, style, build, 14 focused resolver/config/controller
  tests, OpenAPI check, and contract check passed. Resolver tests cover
  slash-containing refs, path-prefixed GitLab hosts, response-size limits,
  rate limits, malformed UTF-8, and pre-fetch URL/host rejection. The full
  repository suite requires `CONTROL_PLANE_TEST_DATABASE_URL` and was not used
  as a feature gate.
- Management-console production build and live browser verification passed.
  Full lint and contract validation are currently blocked by unrelated
  in-progress Workflow refactors in the shared branch (TypeScript errors and
  deleted contract-harness inputs outside this change).
- Platform-admin full validation passed: 113 tests, contracts, executable
  requirements, source budgets, production build, and route smoke checks.
- Helm chart checks and default/path-prefixed custom-host renders passed.
- Workspace cross-repository contract validation is currently blocked by an
  unrelated deleted Workflow conformance file in the shared management branch;
  producer and platform-admin contract checks passed independently.
- Docs-site checks passed after regenerating the public and admin OpenAPI
  artifacts.
- Live desktop and 390 px browser checks passed for both import dialogs:
  native URL validation, Enter submission, Escape dismissal, no horizontal
  overflow, and no browser console warnings or errors.

## Production hardening

- Provider requests use a 30-second resolver deadline, 10-second per-request
  timeouts, bounded streaming responses, strict UTF-8/base64/SHA validation,
  manual redirect handling, and provider-aware rate-limit errors.
- GitHub subpath imports traverse to the requested tree before recursive
  listing, so a small skill folder does not require loading the entire
  repository.
- Platform-admin projection and create-route validation fail closed on unsafe
  URLs, invalid provenance, duplicate/traversal paths, missing root
  `SKILL.md`, and file or aggregate size violations.
- Roll out the control plane before URL-only console consumers. Pause legacy
  custom-host imports during a mixed-version rollout because the new producer
  intentionally rejects browser-supplied API bases.
