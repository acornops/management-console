# Target Auto-Triage

Status: Experimental

The management console presents auto-triage as a compact capability inside the
existing Kubernetes and virtual-machine Settings pages. It reuses established
target chat, issue, approval, and activity surfaces. There is no target tab,
top-level navigation item, Workflow coupling, or new chat route.

## Settings

- Show the shared `ExperimentalBadge` beside the Auto-triage heading, using the
  same text, tokens, and treatment as the Automation navigation category.
- Render the shared settings section after Collection for both target types.
- Keep one local draft and one explicit save action. Surface stale revision
  conflicts without discarding the operator's draft.
- Show the saved requested mode, server-resolved effective behavior, readiness,
  and bounded setup reasons in plain language. Status never relies on color
  alone.
- Treat additional instructions as optional advanced guidance, not a system
  prompt. Enforce the 4,000-character count and provide a clear action.
- On Kubernetes targets, expose comma-separated namespace include and exclude
  lists plus an explicit cluster-scoped issue switch. Empty lists mean all
  namespaces already observed by the target, and exclusions take precedence.
  Explain that this narrows issue eligibility without expanding collection or
  tool access. Validate lowercase Kubernetes DNS-label names inline, associate
  errors with the relevant input, deduplicate entries, and enforce the
  100-namespace API limit before save. Do not render these controls for virtual
  machines.
- Enabling never starts current issues implicitly. After save, offer an explicit
  action for the current eligible count or confirm that future matching issues
  will start automatically.
- If the feature was disabled before a queued investigation started, re-enabling
  offers that still-active issue again. The explicit action resumes its existing
  durable lifecycle job; the save itself still starts nothing.
- Show a compact control-plane-backed activity row with active and waiting
  counts plus the oldest queued time when a backlog exists. Link to the target's
  existing Overview issue surface; do not add queue position, queue controls, or
  a separate queue page.
- Non-editors see the complete effective configuration read-only. Automatic
  write mode requires the existing explicit acknowledgement before save.

## Chat and Investigation History

The assistant rail begins with New chat, followed by Search, Chats, and
Investigations. New chat uses the same guarded action as the page header and
stays visible but disabled with an explanation when permissions or AI runtime
configuration prevent session creation. Chats shows manual sessions only;
Investigations shows automatic sessions only. Each list keeps its existing
last-activity ordering, and Search continues to span both. Investigation rows
use current status plus linked issue scope, object, and severity instead of a
redundant `Automatic` label. Human replies do not move an automatic session into
Chats.

The Investigations rail action shows a capped unseen count for sessions created
since the current user last viewed that target's Investigations. The cursor is
stored per user and target in the current browser. Opening Investigations or
directly opening an automatic-session deep link advances it; background refresh
does not. With no existing browser marker, only investigations created in the
last 24 hours are treated as unseen.

The existing target chat route accepts a validated session query parameter for
links from issues and approvals. An unavailable or wrong-target session falls
back to the ordinary chat screen, removes the stale query parameter with
history replacement, and shows a nonblocking notice.

The open session shows a restrained context strip and a neutral investigation
brief. It does not render the system kickoff as a human message bubble.
Authorized participants see the shared-session notice, and human replies show
their author. Manual session ownership and all existing run controls stay
unchanged.

Recent automatic activity participates in the existing new-chat warning.
Write-capable activity is prioritized, and the primary action opens the
investigation rather than creating another chat.

## Issues and Approvals

Workspace, Kubernetes, and VM issue surfaces show the automatic investigation
as a compact activity row beside—not merged with—Workflow activity. Its action
maps to starting, investigation, approval, findings, retry, or the existing
assistant fallback according to current state and permission.
Stopped investigations use neutral status treatment. If their transcript is
still available, opening it remains the single primary action rather than
showing a competing manual-assistant action.

Queued jobs with a bounded readiness error are presented as waiting rather than
appearing stuck at starting. The row explains whether workspace AI setup,
target-agent reconnection, diagnostic-tool availability, or an automatic retry
is pending without exposing internal errors.
Configured MCP tools that cannot bootstrap are shown as a setup blocker before
an automatic chat starts; unavailable optional user-specific tools remain a
non-blocking degraded-readiness detail.

The target settings, automatic activity, and chat context modules do not import
Automation navigation, Workflow UI, or Workflow API modules. Removing or hiding
the Automation category therefore does not remove auto-triage configuration or
activity.

Issue-bearing views use the shared visibility-aware five-second background
refresh, retain current rows during refresh, update immediately on focus, and
stop while hidden or unmounted.

Target-tool approvals keep their current decision controls and polling. When
linked to an automatic session, they identify the source as Automatic
investigation, the requester as AcornOps, and provide an Open investigation
deep link.

## Accessibility and Responsive Behavior

The feature uses existing form controls, focus treatment, announcements, error
patterns, and target Settings card layout. The switch has an explicit text
state; readiness and activity combine icon, tone, and copy. Labels remain
visible at narrow widths, long issue titles truncate without hiding the origin,
and the history order is identical on desktop and mobile.
