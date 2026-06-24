# Management Console Component Charter

## Responsibilities

- Render operator-facing workspace, workflow, cluster, and VM views.
- Submit troubleshooting sessions and display run progress.
- Surface target tool configuration and MCP server management.
- Support the control-plane-backed management console runtime.

## Non-Goals

- Direct calls to execution-engine, llm-gateway, k8s-agent, or vm-agent
- Server-side auth or tenancy decisions
- Server-side workflow permission compilation or execution
- Owning the source of truth for target state

## Primary Consumers

- Platform operators
- Developers validating end-to-end troubleshooting flows
