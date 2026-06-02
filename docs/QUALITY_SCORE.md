# Management Console Quality Score

Assessment date: April 10, 2026.

| Area | Score | Evidence | Main Gap |
| --- | --- | --- | --- |
| Control-plane contract alignment | 4/5 | Mirrored contract docs, manifests, repo checks | No browser-level consumer contract replay suite |
| Route and navigation stability | 4/5 | Shared route utilities and deep-link support | More explicit path-state tests would help |
| Run trace UX | 4/5 | Replay + SSE handling, trace rendering, tool-call display | No dedicated golden-state fixtures for complex traces |
| Tooling/settings surfaces | 3/5 | Catalog mapping and edit-role handling documented | No focused UI validation suite for all permission combinations |
| Harness knowledge base | 4/5 | AGENTS entry point, indexed docs tree, plan directories, quality/security/reliability docs | Freshness still depends on docs being updated with feature work |
