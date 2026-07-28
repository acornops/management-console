# `@acornops/ui`

Private, domain-neutral React components and design foundations extracted from
the AcornOps Management Console.

Import the component API and global foundations separately:

```ts
import { Button, PageShell } from '@acornops/ui';
import '@acornops/ui/fonts';
import '@acornops/ui/tokens.css';
```

Tailwind consumers should add `@acornops/ui/tailwind-preset` to their presets
and include the package distribution in their content globs.

The package deliberately does not own routes, API clients, authentication,
translations, target models, or product-specific status components.
