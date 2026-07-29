# Management Console Quality Score

Assessment date: July 29, 2026.

## Design system score: 20/20

| Area | Score | Evidence |
| --- | --- | --- |
| Foundations and visual language | 5/5 | Versioned color, spacing, typography, motion, and responsive contracts; immutable wordmark colors have a narrowly marked brand exception |
| Components and catalog coverage | 5/5 | Every public `@acornops/ui` module is mechanically classified as cataloged, composed, or non-visual; interactive catalog states have desktop/mobile and light/dark baselines |
| Accessibility and responsive behavior | 5/5 | Representative production routes pass WCAG 2.1 AA automation, keyboard focus, forced colors, and 200% text reflow checks across desktop/mobile and light/dark themes |
| Enforcement and performance | 5/5 | Design-system source checks, fixture permission profiles, populated states, visual regression suites, and a 350 KiB JavaScript chunk budget run in validation |

The score excludes the explicit AcornOps wordmark and branded activation-button
contrast exceptions documented in `DESIGN.md`; neither exception is permitted
for functional labels, body text, navigation text, or routine controls.

| Area | Score | Evidence | Main Gap |
| --- | --- | --- | --- |
| Control-plane contract alignment | 4/5 | Mirrored operation inventory, workflow-activity response shapes, manifests, and repo checks | No browser-level consumer contract replay suite |
| Route and navigation stability | 5/5 | Shared route utilities, three-view Workflow navigation, URL-backed filters, and exact-run deep links | Continue requiring route tests for new URL state |
| Workflow activity visibility | 4/5 | Workspace Runs ledger, navigation counts, provenance, issue context, trigger execution pointers, and deterministic fixtures | Uses bounded visible-window polling rather than a workspace event stream |
| Collection cohesion | 4/5 | Shared page headers, discovery bars, retained desktop headings, compact cards, and filtered-empty behavior | A few older settings collections still use feature-owned layouts |
| Run trace UX | 4/5 | Replay + SSE handling, trace rendering, tool-call display | No dedicated golden-state fixtures for complex traces |
| Tooling/settings surfaces | 5/5 | Catalog mapping, populated approval state, and owner/admin/viewer browser fixtures validate edit boundaries | Extend the matrix when a new permission-bearing surface is introduced |
| Harness knowledge base | 5/5 | AGENTS entry point, indexed docs tree, plan directories, public-component inventory, route audit matrix, and enforced bundle budget | Keep the executable inventories authoritative as surfaces are added |
