# Management Console Core Beliefs

- The management console is a control-plane client only.
- Route stability and trace readability matter more than local cleverness.
- Parse and normalize control-plane payloads at the client boundary before UI use.
- Durable UI rules belong in the repo, not in prompt folklore.
- Prefer predictable, inspectable UI state flows over opaque abstractions.
- Cross-repo contract changes must land with mirrored docs and checks.
- Button hierarchy is restrained: neutral filled buttons are normal primary actions, orange filled buttons are reserved for workflow launch or activation, surfaced buttons are secondary actions, and quiet tertiary buttons are for repeated utilities.
