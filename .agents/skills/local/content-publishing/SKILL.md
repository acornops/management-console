---
name: acornops-management-console-publishing
description: Preserve management console route integrity, control-plane data integration, and publish-safe UI behavior. Use when changing routes, page flows, API service modules, auth redirects, or base-path deployment settings.
---

# Inputs

- changed files under `src/pages`, `src/features`, `src/hooks`, and `src/services`
- target runtime mode (`mock` or `control-plane`)
- base-path configuration (`/` or `/console`)

# Procedure

1. Validate navigation and deep-link behavior for impacted routes.
2. Verify control-plane API integration assumptions and error states.
3. Ensure auth redirect and session flows remain correct.
4. Validate build output and base-path compatibility.
5. Run repository static checks and build.

# Outputs

- UI behavior validation summary
- route and contract change notes
- follow-up integration tasks (if needed)
