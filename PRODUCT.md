# Product

## Register

product

## Users

Platform operators and developers validating end-to-end troubleshooting flows use the management console while inspecting workspaces, clusters, diagnostics, troubleshooting sessions, tool settings, and MCP server configuration. They are usually trying to understand platform state, preserve route-shareable context, and make deliberate operational changes without losing traceability.

## Product Purpose

The management console is the operator-facing AcornOps control-plane client. It renders workspace and cluster views, submits troubleshooting sessions, displays run progress, surfaces cluster tool configuration, and supports the control-plane-backed runtime. It does not own server-side auth, tenancy decisions, cluster-state source of truth, or direct integration with execution-engine, llm-gateway, or k8s-agent.

## Brand Personality

Restrained, inspectable, and operational. The interface should feel calm under pressure, precise about system state, and direct about the consequences of operator actions.

## Anti-references

Avoid decorative SaaS patterns, route-breaking cleverness, opaque local state abstractions, direct backend calls outside the control-plane client boundary, and visual treatments that compete with diagnostics or trace readability. Avoid using orange as a generic accent; reserve orange filled buttons for workflow launch or activation.

## Design Principles

1. Keep the console control-plane-backed: parse and normalize API payloads at the client boundary before UI use.
2. Protect route stability: workspace, Kubernetes cluster, and tab links should remain shareable and resilient.
3. Prioritize trace readability and operational scan speed over local cleverness.
4. Prefer predictable, inspectable UI state flows with restrained button hierarchy.
5. Put durable UI rules in repository docs instead of prompt-only guidance.

## Accessibility & Inclusion

Use semantic controls, visible focus states, keyboard-reachable workflows, readable contrast, and reduced-motion-aware transitions. Status, role, and permission information should not depend on color alone.
