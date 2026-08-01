# Shared UI Package

## Ownership

Management Console is the canonical design source and the first consumer of
`@acornops/ui`. The package lives at `packages/ui` in this repository so
component changes and their first consumer can be reviewed and validated
atomically.

The package owns domain-neutral components, `--ao-*` design tokens, Outfit and
Ubuntu Mono registration, and the canonical Tailwind preset. It does not own
routes, authentication, translations, API clients, application state, target
models, domain metrics, or product-specific status components.

## Consumer Contract

Consumers import components only from the root public export:

```ts
import { Button, PageShell, Select } from '@acornops/ui';
import '@acornops/ui/fonts';
import '@acornops/ui/tokens.css';
```

Tailwind consumers add `@acornops/ui/tailwind-preset` and include the package
JavaScript in their content scan. Management Console scans package source
directly so catalog and production screens compile the same class vocabulary.

Canonical components must not be reimplemented in `src/components/common`.
Package modules must not import Management Console modules.

## Release Model

The package starts at `0.0.0`; the initial minor Changeset produces the private
`0.1.0` release. Every package change requires a Markdown file under
`.changeset/`.

Merges to `main` run the UI package release workflow. Changesets opens or
updates a release pull request; merging that release pull request publishes to
`npm.pkg.github.com` with the workflow-scoped `GITHUB_TOKEN`. No long-lived npm
token is stored in the repository.

The package release workflow is independent from the tag-driven container image
release workflow.

## Validation

Use:

```bash
npm run ui:check
VITE_APP_DATA_MODE=control-plane npm run validate:full
```

`ui:check` verifies the Changeset, package typecheck, ESM/declaration build,
export map inputs, and `npm pack --dry-run`. Full repository validation adds
unit tests, design enforcement, visual catalog snapshots, repeated browser
fixtures, contract checks, production build, and route smoke tests.
