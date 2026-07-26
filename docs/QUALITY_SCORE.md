# Management Console Quality Score

Assessment date: July 26, 2026.

| Area | Score | Evidence | Main Gap |
| --- | --- | --- | --- |
| Control-plane contract alignment | 4/5 | Mirrored operation inventory, workflow-activity response shapes, manifests, and repo checks | No browser-level consumer contract replay suite |
| Route and navigation stability | 5/5 | Shared route utilities, three-view Workflow navigation, URL-backed filters, and exact-run deep links | Continue requiring route tests for new URL state |
| Workflow activity visibility | 4/5 | Workspace Runs ledger, navigation counts, provenance, issue context, trigger execution pointers, and deterministic fixtures | Uses bounded visible-window polling rather than a workspace event stream |
| Collection cohesion | 4/5 | Shared page headers, discovery bars, retained desktop headings, compact cards, and filtered-empty behavior | A few older settings collections still use feature-owned layouts |
| Run trace UX | 4/5 | Replay + SSE handling, trace rendering, tool-call display | No dedicated golden-state fixtures for complex traces |
| Tooling/settings surfaces | 3/5 | Catalog mapping and edit-role handling documented | No focused UI validation suite for all permission combinations |
| Harness knowledge base | 4/5 | AGENTS entry point, indexed docs tree, plan directories, quality/security/reliability docs | Freshness still depends on docs being updated with feature work |
