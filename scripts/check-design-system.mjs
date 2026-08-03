#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const srcRoot = join(root, 'src');
const uiSourceRoot = join(root, 'packages/ui/src');
const exceptions = JSON.parse(readFileSync(join(root, 'scripts/design-system-exceptions.json'), 'utf8'));
const catalogInventory = JSON.parse(readFileSync(join(root, 'scripts/design-system-catalog.json'), 'utf8'));
const appPageContentPath = join(root, 'src/app/AppPageContent.tsx');
const uiIndexPath = join(root, 'packages/ui/src/index.ts');
const catalogPath = join(root, 'src/design-system.tsx');
const failures = [];

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  }).filter((path) => ['.ts', '.tsx'].includes(extname(path)) && !path.includes('.test.'));
}

function productionFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? productionFiles(path) : [path];
  }).filter((path) => ['.ts', '.tsx', '.css'].includes(extname(path)) && !path.includes('.test.'));
}

function productionCopyFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? productionCopyFiles(path) : [path];
  }).filter((path) => {
    const repoPath = relative(root, path).replaceAll('\\', '/');
    return ['.ts', '.tsx', '.js'].includes(extname(path))
      && !path.includes('.test.')
      && !path.includes('.spec.')
      && !repoPath.startsWith('src/fixtures/');
  });
}

function jsxOpenings(source, startPattern) {
  const openings = [];
  let match;

  startPattern.lastIndex = 0;
  while ((match = startPattern.exec(source)) !== null) {
    let braceDepth = 0;
    let quote = '';
    let escaped = false;
    let index = match.index;

    for (; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === quote) {
          quote = '';
        }
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '{') {
        braceDepth += 1;
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (character === '>' && braceDepth === 0) {
        openings.push({ source: source.slice(match.index, index + 1), start: match.index });
        startPattern.lastIndex = index + 1;
        break;
      }
    }
  }

  return openings;
}

function topLevelClassNameValues(openingSource) {
  const values = [];
  let braceDepth = 0;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < openingSource.length; index += 1) {
    const character = openingSource[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') {
      braceDepth += 1;
      continue;
    }
    if (character === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (braceDepth !== 0 || !openingSource.startsWith('className', index)) continue;

    const before = openingSource[index - 1];
    const after = openingSource[index + 'className'.length];
    if ((before && /[\w$]/.test(before)) || (after && /[\w$]/.test(after))) continue;

    let valueStart = index + 'className'.length;
    while (/\s/.test(openingSource[valueStart] ?? '')) valueStart += 1;
    if (openingSource[valueStart] !== '=') continue;
    valueStart += 1;
    while (/\s/.test(openingSource[valueStart] ?? '')) valueStart += 1;

    const delimiter = openingSource[valueStart];
    if (delimiter === '"' || delimiter === "'" || delimiter === '`') {
      const valueEnd = openingSource.indexOf(delimiter, valueStart + 1);
      if (valueEnd !== -1) values.push({ kind: 'literal', value: openingSource.slice(valueStart + 1, valueEnd) });
    } else if (delimiter === '{') {
      let valueDepth = 1;
      let valueQuote = '';
      let valueEscaped = false;
      let valueEnd = valueStart + 1;
      for (; valueEnd < openingSource.length && valueDepth > 0; valueEnd += 1) {
        const valueCharacter = openingSource[valueEnd];
        if (valueQuote) {
          if (valueEscaped) {
            valueEscaped = false;
          } else if (valueCharacter === '\\') {
            valueEscaped = true;
          } else if (valueCharacter === valueQuote) {
            valueQuote = '';
          }
        } else if (valueCharacter === '"' || valueCharacter === "'" || valueCharacter === '`') {
          valueQuote = valueCharacter;
        } else if (valueCharacter === '{') {
          valueDepth += 1;
        } else if (valueCharacter === '}') {
          valueDepth -= 1;
        }
      }
      values.push({ kind: 'expression', value: openingSource.slice(valueStart + 1, valueEnd - 1) });
    }
  }

  return values;
}

function report(path, rule, detail) {
  failures.push(`${relative(root, path)}: ${rule}: ${detail}`);
}

const files = [srcRoot, uiSourceRoot].flatMap(sourceFiles);
const productionSources = [srcRoot, uiSourceRoot].flatMap(productionFiles);
const productionCopySources = [srcRoot, uiSourceRoot].flatMap(productionCopyFiles);
const namedTailwindPalette = /(?:^|[\s'"`])(?:[a-z-]+:)*(?:bg|text|border|divide|ring|outline|shadow|fill|stroke|from|via|to|decoration|caret|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/[^\s'"`}]+)?/g;
const prohibitedTypographyUtility = /(?:^|[\s'"`])(?:font-(?:bold|extrabold)|uppercase|tracking-(?:wider|widest)|tracking-\[[^\]]+\]|text-\[(?:9|10|11)px\]|text-\[(?:0\.5625|0\.625|0\.68|0\.6875)rem\])(?=$|[\s'"`}])/g;
const canonicalHeadingRole = /(?:^|[\s'"`])type-(?:route-title|section-title|panel-title|row-title|data)(?=$|[\s'"`}])/;
const prohibitedActionTypography = /(?:^|[\s'"`])(?:type-(?:body|caption|label|micro-label|emphasis)|font-(?:bold|extrabold)|uppercase|tracking-(?:wide|wider|widest))(?=$|[\s'"`}])/;
const approvedButtonSizingHelpers = /(?:buttonClassName|closeButtonClassName|menuOptionClassName|navigationItemClassName|segmentedTabButtonClassName|filterToggleButtonClassName)\s*\(/;
const canonicalButtonTarget = /(?:^|[\s'"`])(?:control-target|min-h-11|h-11|min-h-12|h-12|min-h-control|h-control)(?=$|[\s'"`])/;
const semanticTextRole = /(?:^|[\s'"`])type-(?:body|caption|ui|compact-ui|label|micro-label|emphasis|row-title)(?=$|[\s'"`}])/;
const typographyRoleUse = /(?:^|[\s'"`])(?<role>type-[a-z0-9-]+)(?=$|[\s'"`}])/g;
const canonicalTypographyRoles = new Set([
  'type-route-title',
  'type-section-title',
  'type-panel-title',
  'type-row-title',
  'type-body',
  'type-ui',
  'type-compact-ui',
  'type-emphasis',
  'type-wordmark',
  'type-caption',
  'type-label',
  'type-micro-label',
  'type-data',
  'type-count',
  'type-code'
]);
const completeTypographyRoles = new Set([
  'type-route-title',
  'type-section-title',
  'type-panel-title',
  'type-row-title',
  'type-body',
  'type-ui',
  'type-compact-ui',
  'type-caption',
  'type-label',
  'type-micro-label',
  'type-data',
  'type-count',
  'type-code'
]);
const canonicalModules = new Set([
  'Button.tsx',
  'Checkbox.tsx',
  'CollectionState.tsx',
  'ComponentVocabulary.tsx',
  'DangerZone.tsx',
  'DataTable.tsx',
  'Dialog.tsx',
  'DiscoveryFilterBar.tsx',
  'EmptyState.tsx',
  'FormControls.tsx',
  'IconTile.tsx',
  'OverlayFrames.tsx',
  'PageComposition.tsx',
  'RightSidePanel.tsx',
  'Select.tsx',
  'Tooltip.tsx'
]);
const resourceCardCatalogPaths = [
  'src/components/dashboard/ClusterCatalog.tsx',
  'src/pages/virtual-machines/VirtualMachinesListView.tsx',
  'src/pages/WorkspaceAgentsCatalog.tsx'
];
const lowercaseRelativeTimeAllowlist = new Map([
  ['src/design-system.tsx', ['Updated just now']],
  ['src/features/targets/chat/hooks/targetChatState.ts', ["'chat.recentActivityTime.justNow', 'just now'"]],
  ['src/i18n/locales/en.js', ["justNow: 'just now'"]],
  ['src/utils/dateTime.ts', ["compact ? 'now' : 'just now'"]]
]);

for (const path of productionSources) {
  const source = readFileSync(path, 'utf8');
  const paletteMatches = [...source.matchAll(namedTailwindPalette)];
  for (const match of paletteMatches) {
    report(path, 'named-tailwind-palette', `${match[0].trim()} must resolve through a design token`);
  }
  if (/\bbackdrop-blur(?:-|\b)/.test(source)) {
    report(path, 'no-glass', 'backdrop blur is prohibited; use an opaque token scrim or surface');
  }
  if (extname(path) === '.tsx') {
    for (const opening of jsxOpenings(source, /<[A-Za-z][A-Za-z0-9.]*(?=[\s>])/g)) {
      if (!/\btext-accent-bright\b/.test(opening.source) || /\bdata-brand-wordmark\b/.test(opening.source)) continue;
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'readable-accent-text', `line ${line}: text-accent-bright is limited to explicitly marked brand wordmarks`);
    }
  }
  for (const match of source.matchAll(prohibitedTypographyUtility)) {
    report(path, 'semantic-typography', `${match[0].trim()} must be replaced by a documented semantic typography role`);
  }
  if (/text-xl[^\n"'`]*font-semibold[^\n"'`]*tracking-tight|text-xl[^\n"'`]*tracking-tight[^\n"'`]*font-semibold/.test(source)) {
    report(path, 'data-typography', 'prominent metric readouts must use the type-data semantic role');
  }
}

for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const repoPath = relative(root, path).replaceAll('\\', '/');
  const isPackageSource = repoPath.startsWith('packages/ui/src/');

  if (repoPath !== 'packages/ui/src/Select.tsx' && /<select(?:\s|>)/.test(source)) {
    report(path, 'shared-select', 'use the typed Select primitive');
  }
  if (repoPath !== 'packages/ui/src/Checkbox.tsx' && /type=["']checkbox["']/.test(source)) {
    report(path, 'shared-checkbox', 'use the Checkbox primitive');
  }
  if (repoPath !== 'packages/ui/src/FormControls.tsx' && /type=["']radio["']/.test(source)) {
    report(path, 'shared-radio', 'use the Radio primitive');
  }
  if (repoPath !== 'packages/ui/src/FormControls.tsx' && /role=["']switch["']/.test(source)) {
    report(path, 'shared-switch', 'use the Switch primitive');
  }
  if (isPackageSource && /(?:from\s+|import\s*)["']@\/|(?:from\s+|import\s*)["'][^"']*\/src\//.test(source)) {
    report(path, 'package-boundary', 'package modules cannot import Management Console application modules');
  }
  if (repoPath.startsWith('src/components/common/') && canonicalModules.has(repoPath.split('/').at(-1))) {
    report(path, 'local-reimplementation', 'canonical components must be imported from @acornops/ui');
  }
  if (isPackageSource) {
    for (const match of source.matchAll(/var\((--[a-z0-9-]+)/g)) {
      if (!match[1].startsWith('--ao-')) {
        report(path, 'namespaced-token', `${match[1]} must use the --ao-* namespace`);
      }
    }
  }
  if (/variant\s*=\s*["']accent["']|variant\s*:\s*["']accent["']/.test(source)) {
    report(path, 'button-intent', 'accent was renamed to activation');
  }
  if (/variant\s*=\s*["']activation["']|variant\s*:\s*["']activation["']/.test(source) && !exceptions.activationContexts.includes(repoPath)) {
    report(path, 'activation-context', 'orange activation buttons are limited to workflow launch/activation contexts');
  }

  const allowsIllustrationColor = exceptions.literalColorModules.includes(repoPath);
  if (!allowsIllustrationColor && /#[0-9a-fA-F]{3,8}\b|oklch\(/.test(source)) {
    report(path, 'token-colors', 'component-local literal colors are prohibited');
  }

  if (repoPath.startsWith('src/') && /px-4[^\n"'`]*sm:px-6[^\n"'`]*lg:px-10/.test(source)) {
    report(path, 'route-shell-copy', 'use PageShell or route padding tokens instead of copying responsive route margins');
  }

  const hasHandRolledLoadingBranch = /\{[^\n]*(?:isLoading\w*|loading)[^\n]*(?:\?|&&)/i.test(source);
  const hasHandRolledEmptyBranch = /\{[^\n]*(?:\.length\s*===\s*0|!\w+\.length)[^\n]*(?:\?|&&)/.test(source);
  if (
    hasHandRolledLoadingBranch
    && hasHandRolledEmptyBranch
    && !source.includes('CollectionState')
    && !source.includes('DataTableStateRow')
    && !exceptions.asyncCollectionStateExceptions?.[repoPath]
  ) {
    report(path, 'async-collection-state', 'compose loading and empty precedence through CollectionState or add a documented contextual exception');
  }

  for (const opening of jsxOpenings(source, /<(?:motion\.)?button\b/g)) {
    const isDesktopSidebarNavigationRow = repoPath === 'src/app/AppDesktopSidebarParts.tsx' && /navButtonClass\(/.test(opening.source);
    if (!approvedButtonSizingHelpers.test(opening.source) && !canonicalButtonTarget.test(opening.source) && !isDesktopSidebarNavigationRow) {
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'raw-button-target', `line ${line}: raw buttons require an approved shared sizing helper or a 44px mobile target (36px compact targets may begin at sm)`);
    }
  }

  for (const opening of jsxOpenings(source, /<(?:Button|MotionButton|(?:motion\.)?button)\b/g)) {
    if (!prohibitedActionTypography.test(opening.source)) continue;
    const line = source.slice(0, opening.start).split('\n').length;
    report(path, 'action-typography', `line ${line}: actions use type-ui sentence case; label, emphasis, uppercase, and wide-tracking roles are prohibited`);
  }

  for (const opening of jsxOpenings(source, /<(?:Button|MotionButton)\b/g)) {
    if (/\bvariant\s*=/.test(opening.source)) continue;
    const line = source.slice(0, opening.start).split('\n').length;
    report(path, 'implicit-button-variant', `line ${line}: shared buttons must declare their visual intent with an explicit variant`);
  }

  for (const opening of jsxOpenings(source, /<[A-Za-z][A-Za-z0-9.]*(?=[\s>])/g)) {
    const tagName = opening.source.match(/^<([A-Za-z][A-Za-z0-9.]*)/)?.[1];
    if (!tagName || ['button', 'motion.button', 'Button', 'MotionButton', 'IconTile'].includes(tagName)) continue;
    const classNameSource = topLevelClassNameValues(opening.source).map(({ value }) => value).join(' ');
    if (!classNameSource) continue;
    const isCenteredSquare = /(?:^|\s)(?:flex|inline-flex)(?:\s|$)/.test(classNameSource)
      && /(?:^|\s)items-center(?:\s|$)/.test(classNameSource)
      && /(?:^|\s)justify-center(?:\s|$)/.test(classNameSource)
      && /(?:^|\s)h-(?:7|8|9|10|11|12)(?:\s|$)/.test(classNameSource)
      && /(?:^|\s)w-(?:7|8|9|10|11|12)(?:\s|$)/.test(classNameSource);
    const reconstructsControlFrame = /(?:^|\s)border-ui-border(?:\s|$)/.test(classNameSource)
      && /(?:^|\s)bg-ui-(?:bg|surface)(?:\/[^\s]+)?(?:\s|$)/.test(classNameSource);
    if (!isCenteredSquare || !reconstructsControlFrame) continue;
    const line = source.slice(0, opening.start).split('\n').length;
    report(path, 'noninteractive-icon-tile', `line ${line}: use IconTile for flat context glyphs or Button for icon actions`);
  }

  for (const opening of jsxOpenings(source, /<[A-Za-z][A-Za-z0-9.]*(?=[\s>])/g)) {
    const classNameValues = topLevelClassNameValues(opening.source);
    const classNameSource = classNameValues.map(({ value }) => value).join(' ');
    if (!classNameSource) continue;
    for (const match of classNameSource.matchAll(typographyRoleUse)) {
      const role = match.groups?.role;
      if (!role) continue;
      if (canonicalTypographyRoles.has(role)) continue;
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'unknown-typography-role', `line ${line}: ${role} is not a defined semantic typography role`);
    }
    for (const { kind, value } of classNameValues) {
      if (kind !== 'literal') continue;
      const completeRoles = new Set([...value.matchAll(typographyRoleUse)]
        .map((match) => match.groups?.role)
        .filter((role) => role && completeTypographyRoles.has(role)));
      if (completeRoles.size > 1) {
        const line = source.slice(0, opening.start).split('\n').length;
        report(path, 'conflicting-typography-roles', `line ${line}: use one complete semantic typography role per element (${[...completeRoles].join(', ')})`);
      }
    }
  }

  for (const opening of jsxOpenings(source, /<h[1-6]\b/g)) {
    if (canonicalHeadingRole.test(opening.source)) continue;
    const line = source.slice(0, opening.start).split('\n').length;
    report(path, 'heading-typography', `line ${line}: headings require a canonical route, section, panel, row, or data typography role`);
  }

  if (isPackageSource) {
    for (const opening of jsxOpenings(source, /<[A-Za-z][A-Za-z0-9.]*(?=[\s>])/g)) {
      if (!/\brole\s*=\s*["'](?:alert|status)["']/.test(opening.source)) continue;
      if (!/\btext-(?:xs|sm|base|lg|xl)\b/.test(opening.source) || semanticTextRole.test(opening.source)) continue;
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'status-typography', `line ${line}: shared alert and status surfaces with explicit sizing require a semantic typography role`);
    }
  }

  if (repoPath !== 'packages/ui/src/DataTable.tsx' && !exceptions.rawTableHeaderExceptions?.[repoPath]) {
    for (const opening of jsxOpenings(source, /<th\b/g)) {
      if (/\bscope\s*=\s*["']row["']/.test(opening.source)) continue;
      const line = source.slice(0, opening.start).split('\n').length;
      report(path, 'shared-table-header', `line ${line}: visible column headers must compose through DataTableHeaderCell`);
    }
  }
}

for (const path of productionCopySources) {
  const source = readFileSync(path, 'utf8');
  const repoPath = relative(root, path).replaceAll('\\', '/');
  const allowedLowercaseLines = lowercaseRelativeTimeAllowlist.get(repoPath) || [];

  source.split('\n').forEach((lineSource, index) => {
    if (/\bJust Now\b/.test(lineSource)) {
      report(path, 'relative-time-capitalization', `line ${index + 1}: use sentence-case Just now`);
    }
    if (/\bjust now\b/.test(lineSource) && !allowedLowercaseLines.some((allowed) => lineSource.includes(allowed))) {
      report(path, 'relative-time-capitalization', `line ${index + 1}: lowercase just now is limited to documented sentence-fragment contexts`);
    }
    if (/\breturn\s+['"]now['"]/.test(lineSource)) {
      report(path, 'relative-time-capitalization', `line ${index + 1}: standalone relative-time values use sentence-case Now`);
    }
  });
}

for (const repoPath of resourceCardCatalogPaths) {
  const path = join(root, repoPath);
  const source = readFileSync(path, 'utf8');
  if (!source.includes('data-resource-card-catalog="true"') || !source.includes('resource-card-catalog')) {
    report(path, 'shared-resource-card-catalog', 'catalog must use the shared resource-card-catalog container');
  }
  if (!source.includes('data-resource-card-grid="true"') || !source.includes('resource-card-grid')) {
    report(path, 'shared-resource-card-grid', 'catalog must use the shared resource-card-grid layout');
  }
}

const stylesPath = join(root, 'src/styles.css');
const stylesSource = readFileSync(stylesPath, 'utf8');
const resourceCardCatalogRule = stylesSource.match(/\.resource-card-catalog\s*\{([^}]*)\}/)?.[1] ?? '';
for (const contractRule of ['container-name: resource-card-catalog', 'container-type: inline-size']) {
  if (!resourceCardCatalogRule.includes(contractRule)) {
    report(stylesPath, 'shared-resource-card-grid', `missing shared catalog rule ${contractRule}`);
  }
}
const resourceCardGridRule = stylesSource.match(/\.resource-card-grid\s*\{([^}]*)\}/)?.[1] ?? '';
for (const contractRule of [
  'display: grid',
  'grid-template-columns: repeat(auto-fill, minmax(min(100%, 27rem), 1fr))',
  'align-items: stretch'
]) {
  if (!resourceCardGridRule.includes(contractRule)) {
    report(stylesPath, 'shared-resource-card-grid', `missing shared layout rule ${contractRule}`);
  }
}
const resourceCardRule = stylesSource.match(/\.resource-card-grid > \*\s*\{([^}]*)\}/)?.[1] ?? '';
for (const contractRule of ['width: 100%', 'min-width: 0']) {
  if (!resourceCardRule.includes(contractRule)) {
    report(stylesPath, 'shared-resource-card-grid', `missing shared card rule ${contractRule}`);
  }
}
if (resourceCardRule.includes('max-width:')) {
  report(stylesPath, 'shared-resource-card-grid', 'shared resource cards must fill their grid tracks without a fixed maximum');
}
if (/(?:cluster|vm|agent)-card-grid[^{]*\{[^}]*grid-template-columns/s.test(stylesSource)) {
  report(stylesPath, 'shared-resource-card-grid', 'resource-card catalogs must not define feature-specific column rules');
}

const uiIndexSource = readFileSync(uiIndexPath, 'utf8');
const catalogSource = readFileSync(catalogPath, 'utf8');
const exportedModules = new Set(
  [...uiIndexSource.matchAll(/export \* from ['"]\.\/([^'"]+)['"]/g)].map((match) => match[1])
);
const catalogGroups = [
  ['catalogedModules', catalogInventory.catalogedModules],
  ['composedModules', catalogInventory.composedModules],
  ['nonVisualModules', catalogInventory.nonVisualModules]
];
const classifiedModules = new Map();

for (const [group, entries] of catalogGroups) {
  for (const [moduleName, evidence] of Object.entries(entries)) {
    if (classifiedModules.has(moduleName)) {
      report(uiIndexPath, 'catalog-inventory', `${moduleName} is classified more than once`);
    }
    classifiedModules.set(moduleName, group);
    if (!exportedModules.has(moduleName)) {
      report(uiIndexPath, 'catalog-inventory', `${moduleName} is classified but is not a public module`);
    }
    if (typeof evidence !== 'string' || evidence.trim().length < (group === 'catalogedModules' ? 3 : 30)) {
      report(catalogPath, 'catalog-evidence', `${moduleName} requires durable ${group} evidence`);
    }
    if (group === 'catalogedModules' && !catalogSource.includes(evidence)) {
      report(catalogPath, 'catalog-evidence', `${moduleName} evidence token ${evidence} is absent from the catalog`);
    }
  }
}

for (const moduleName of exportedModules) {
  if (!classifiedModules.has(moduleName)) {
    report(uiIndexPath, 'catalog-inventory', `${moduleName} must be cataloged, composed, or documented as non-visual`);
  }
}

const appPageContentSource = readFileSync(appPageContentPath, 'utf8');
const routedAuthenticatedPagePaths = new Set(
  [...appPageContentSource.matchAll(/import\(["']@\/pages\/([^"']+)["']\)/g)]
    .map((match) => `src/pages/${match[1]}.tsx`)
);
const authenticatedRoutePagePaths = new Set(exceptions.authenticatedRoutePages);

for (const repoPath of routedAuthenticatedPagePaths) {
  if (!authenticatedRoutePagePaths.has(repoPath)) {
    report(appPageContentPath, 'authenticated-route-inventory', `${repoPath} must be listed in authenticatedRoutePages`);
  }
}

for (const repoPath of authenticatedRoutePagePaths) {
  if (!routedAuthenticatedPagePaths.has(repoPath)) {
    report(appPageContentPath, 'authenticated-route-inventory', `${repoPath} is not loaded by AppPageContent`);
  }
}

for (const repoPath of exceptions.authenticatedRoutePages) {
  const source = readFileSync(join(root, repoPath), 'utf8');
  if (!source.includes('PageShell') && !exceptions.embeddedRouteExceptions[repoPath]) {
    report(join(root, repoPath), 'authenticated-route-shell', 'route must compose through PageShell');
  }
  if (jsxOpenings(source, /<PageShell\b/g).some((opening) => /\bwidth\s*=/.test(opening.source))) {
    report(join(root, repoPath), 'authenticated-route-width', 'authenticated routes use the default full-width PageShell');
  }
  if (!source.includes('PageHeader') && !exceptions.routeHeaderDelegates[repoPath] && !exceptions.embeddedRouteExceptions[repoPath]) {
    report(join(root, repoPath), 'authenticated-route-header', 'route must compose through PageHeader');
  }
}

for (const [repoPath, delegate] of Object.entries(exceptions.routeHeaderDelegates)) {
  const delegateSource = readFileSync(join(root, delegate), 'utf8');
  if (!delegateSource.includes('PageHeader')) {
    report(join(root, repoPath), 'route-header-delegate', `${delegate} must compose through PageHeader`);
  }
}

for (const [repoPath, reason] of Object.entries(exceptions.embeddedRouteExceptions)) {
  if (typeof reason !== 'string' || reason.trim().length < 20) {
    report(join(root, repoPath), 'documented-exception', 'embedded route exceptions require a durable reason');
  }
}

for (const [repoPath, reason] of Object.entries(exceptions.asyncCollectionStateExceptions || {})) {
  if (typeof reason !== 'string' || reason.trim().length < 30) {
    report(join(root, repoPath), 'documented-exception', 'async collection exceptions require a durable contextual reason');
  }
}

for (const [repoPath, reason] of Object.entries(exceptions.rawTableHeaderExceptions || {})) {
  if (typeof reason !== 'string' || reason.trim().length < 30) {
    report(join(root, repoPath), 'documented-exception', 'raw table-header exceptions require a durable contextual reason');
  }
}

if (failures.length > 0) {
  console.error(`Design-system check failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Design-system check passed across ${files.length} source files.`);
