# Product

## Register

product

## Users

Platform operators, SREs, and developers who run and troubleshoot AcornOps workloads use the management console as a working control surface. Two overlapping modes of use dominate:

- **Operating under pressure.** An operator inspecting live workspace, Kubernetes cluster, and virtual machine state, following a run trace, or driving a chat-based troubleshooting session, often mid-incident. They need to scan dense state quickly, keep the route shareable so they can hand off context, and understand the consequences of any change before making it.
- **Configuring the platform.** A developer or workspace admin registering targets, wiring up agents, authoring and scheduling workflow automations, managing members and approvals, and setting AI and tool configuration. This work is more deliberate and exploratory than incident response, but it still demands precision and traceability.

Both users open the console to understand platform state and then act on it without losing context or an audit trail.

## Product Purpose

The management console is the operator-facing AcornOps control-plane client. It renders workspace, agent, workflow, Kubernetes cluster, and virtual machine views; submits and displays chat-driven troubleshooting sessions; visualizes run traces and run history; presents governed workflow automation with schedules, approvals, and an audit log; and exposes target configuration for tools, skills, MCP servers, and runbooks (target prompt templates).

It is a client, not a source of truth. It does not own server-side authentication, tenancy decisions, cluster or VM state authority, workflow execution authorization, or direct integration with the execution engine, LLM gateway, or agents. All data flows through the documented control-plane API boundary; the console parses and normalizes payloads at that boundary before anything reaches the UI. Success is an operator who leaves a session having understood the state they were looking at and having made a deliberate, traceable change, with the URL still describing exactly where they were.

## Brand Personality

Restrained, inspectable, and operational. Calm under pressure, precise about system state, and direct about the consequences of operator actions. The console should read like an operator's ledger: warm and orderly, built for repeated reading, never competing with the diagnostics it presents. Three words: measured, precise, trustworthy.

## Anti-references

- Decorative SaaS dashboards that lead with hero metrics, gradient accents, and identical card grids over actual operational density.
- Route-breaking cleverness: interactions that lose shareable state, trap the user in local view state, or make a workspace, cluster, VM, or tab link non-resumable.
- Opaque local state abstractions that hide or drift from control-plane state.
- Direct backend calls outside the control-plane client boundary.
- Visual treatments that compete with traces, diagnostics, and logs for attention: glassmorphism, gradient text, decorative orbs, color-as-decoration.
- Orange used as a generic accent. Orange fills are reserved for workflow launch and activation; routine actions stay neutral.

## Design Principles

1. **Control-plane-backed, always.** Parse and normalize API payloads at the client boundary. The UI never invents state or calls past the boundary.
2. **Protect route stability.** Workspace, cluster, VM, workflow, and tab links stay shareable and resumable. Navigation state lives in the URL, not hidden local state.
3. **Trace readability over local cleverness.** Optimize dense operational pages for fast, repeated scanning and for following a run to its cause. When a clever interaction and a readable one conflict, readability wins.
4. **Deliberate, traceable action.** Make the consequence of an action legible before it happens, and leave an audit trail after. Governance surfaces (approvals, audit log, members) are first-class, not afterthoughts.
5. **Predictable, restrained controls.** Prefer familiar product chrome, a restrained button hierarchy, stable dimensions, and inspectable state flows. Put durable UI rules in repository docs, not prompt-only guidance.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Use semantic controls, visible focus states, and fully keyboard-reachable workflows including dialogs and drawers with focus trapping and explicit close controls. Maintain readable contrast on warm neutral surfaces, respect reduced-motion preferences (motion is used only to explain state), and never encode status, role, permission, or health through color alone; always pair it with text or an icon.
