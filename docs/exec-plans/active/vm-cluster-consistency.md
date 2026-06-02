# VM and Cluster Detail Consistency

## Objective

Polish virtual machine pages so their navigation, detail views, assistant, settings, resources, metrics, and overview actions follow the same operational UI vocabulary as Kubernetes cluster pages while preserving VM-specific behavior.

## Scope

- VM AI Assistant page structure and state treatment
- VM Settings section layout
- VM Resources loading, error, and empty states
- Shared CPU/RAM chart presentation
- VM page i18n coverage for touched copy
- VM Overview action affordances

## Boundary Decisions

| Concept | Shared target model? | Kubernetes-specific? | VM-specific? | Notes |
| --- | --- | --- | --- | --- |
| Detail navigation shape | UI only | no | no | Keep matching top-level tabs without changing route contracts. |
| Assistant shell | UI pattern | cluster run behavior | VM read-only run behavior | Reuse visual structure without changing backend run semantics. |
| Resources inventory | UI pattern | Kubernetes resource families | VM host inventory/logs | Keep VM host categories explicit inside Resources. |
| Settings sections | UI pattern | namespace/write safety | agent install/log sources | Align section rhythm, keep target-specific fields. |
| Metrics charts | presentational | cluster metric source | VM metric source | Share chart rendering only. |

## Validation

- `npm run lint` - passed
- `npm run test` - passed
- `npm run contracts:check` - passed
- `npm run harness:check` - passed
- `npm run build` - passed
- `npm run smoke:routes` - passed with local preview port approval
- `npm run validate` - passed with local preview port approval
- Browser verification reached the 127.0.0.1 dev route and confirmed the sign-in gate. Authenticated visual inspection was blocked because the local OIDC callback targets the full-stack console host, and the browser policy blocked a temporary local form for setting a 127.0.0.1 dev session cookie.
