#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const ADOPTION_RULES = [
  'native-control-bypass',
  'low-level-overlay',
  'native-visible-table',
  'raw-typography',
  'ui-export-shadow',
  'feature-owned-menu',
  'feature-owned-listbox',
  'shared-tab-copy',
  'semantic-callout-bypass'
];

const nativeControls = new Set(['button', 'input', 'textarea']);
const nativeTableElements = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td']);
const lowLevelOverlayExports = new Set(['Dialog', 'RightSidePanel']);
const rawTypographyPattern = /(?:^|\s)(text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black))(?=\s|$)/g;
const requiredExceptionFields = ['id', 'rule', 'path', 'scope', 'classification', 'rationale', 'owner', 'reviewedOn'];
const excludedFilePattern = /(?:^|\/)(?:dist|node_modules|__tests__)(?:\/|$)|\.(?:test|spec|stories)\.[cm]?[jt]sx?$/;

function normalizedPath(path) {
  return path.replaceAll('\\', '/');
}

function sourceFileFor(source, repoPath) {
  return ts.createSourceFile(
    repoPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    repoPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function jsxTagName(node) {
  const tagName = node.tagName;
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return `${tagName.expression.getText()}.${tagName.name.text}`;
  return tagName.getText();
}

function jsxAttribute(node, name) {
  return node.attributes.properties.find(
    (attribute) => ts.isJsxAttribute(attribute) && attribute.name.text === name
  );
}

function attributeStringValue(attribute) {
  if (!attribute?.initializer) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression
    && ts.isStringLiteralLike(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return undefined;
}

function isMarkdownTableRenderer(node, repoPath) {
  if (repoPath !== 'src/features/targets/chat/lib/markdown.tsx') return false;
  const rendererKeys = new Set(['table', 'th', 'tr', 'td']);
  let current = node;
  while (current) {
    if (
      ts.isPropertyAssignment(current)
      && (
        (ts.isIdentifier(current.name) && rendererKeys.has(current.name.text))
        || (ts.isStringLiteral(current.name) && rendererKeys.has(current.name.text))
      )
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function stringTokens(node) {
  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
  }
  return [];
}

function exportedValueNames(source, repoPath) {
  const sourceFile = sourceFileFor(source, repoPath);
  const names = new Set();
  const isExported = (node) => node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

  for (const statement of sourceFile.statements) {
    if (!isExported(statement)) continue;
    if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement))
      && statement.name
    ) {
      names.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
  }
  return names;
}

export function analyzeSource({
  source,
  repoPath,
  publicUiExports = new Set(),
  includePackageRules = true
}) {
  const normalizedRepoPath = normalizedPath(repoPath);
  const isApplication = normalizedRepoPath.startsWith('src/')
    && normalizedRepoPath !== 'src/design-system.tsx';
  const isUiPackage = normalizedRepoPath.startsWith('packages/ui/src/');
  const sourceFile = sourceFileFor(source, normalizedRepoPath);
  const violations = [];
  const overlayAliases = new Map();

  function add(rule, node, scope, detail) {
    violations.push({
      rule,
      path: normalizedRepoPath,
      line: lineOf(sourceFile, node),
      scope,
      detail
    });
  }

  function visit(node) {
    if (isApplication && ts.isImportDeclaration(node) && node.moduleSpecifier.text === '@acornops/ui') {
      const namedBindings = node.importClause?.namedBindings;
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) {
          const exportedName = element.propertyName?.text ?? element.name.text;
          if (lowLevelOverlayExports.has(exportedName)) {
            overlayAliases.set(element.name.text, exportedName);
            add(
              'low-level-overlay',
              element,
              `import:${exportedName}`,
              `application code must compose ${exportedName} through DialogFrame or DrawerFrame`
            );
          }
          if (exportedName === 'useFloatingActionMenu') {
            add(
              'feature-owned-menu',
              element,
              'import:useFloatingActionMenu',
              'application code must compose floating menus through ActionMenu'
            );
          }
        }
      }
    }

    if (isApplication && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))) {
      const tagName = jsxTagName(node);
      if (nativeControls.has(tagName) || tagName === 'motion.button') {
        add(
          'native-control-bypass',
          node,
          `jsx:${tagName}:${lineOf(sourceFile, node)}`,
          `${tagName} must be replaced by an @acornops/ui control`
        );
      }

      if (nativeTableElements.has(tagName)) {
        const markdownRenderer = isMarkdownTableRenderer(node, normalizedRepoPath);
        add(
          'native-visible-table',
          node,
          markdownRenderer ? 'renderer:table' : `jsx:${tagName}:${lineOf(sourceFile, node)}`,
          `${tagName} must compose through the complete DataTable primitive vocabulary`
        );
      }

      const role = attributeStringValue(jsxAttribute(node, 'role'));
      const isIntrinsic = tagName[0] === tagName[0]?.toLocaleLowerCase();
      if (isIntrinsic && (role === 'menu' || role?.startsWith('menuitem'))) {
        add(
          'feature-owned-menu',
          node,
          `jsx-role:${role}:${lineOf(sourceFile, node)}`,
          'application-owned menu markup must use ActionMenu, MenuSurface, MenuItem, or MenuLink'
        );
      }
      if (isIntrinsic && (role === 'listbox' || role === 'option')) {
        add(
          'feature-owned-listbox',
          node,
          `jsx-role:${role}:${lineOf(sourceFile, node)}`,
          'application-owned listbox markup must use the shared Combobox components'
        );
      }
      if (isIntrinsic && (role === 'tablist' || role === 'tab')) {
        add(
          'shared-tab-copy',
          node,
          `jsx-role:${role}:${lineOf(sourceFile, node)}`,
          'application-owned tab behavior must compose through SegmentedTabs'
        );
      }
      const className = attributeStringValue(jsxAttribute(node, 'className')) ?? '';
      if (
        isIntrinsic
        && (role === 'alert' || role === 'status')
        && /(?:^|\s)border(?:\s|$|-)/.test(className)
        && /(?:^|\s)bg-status-(?:danger|warning|success)-soft(?:\/\d+)?(?=\s|$)/.test(className)
      ) {
        add(
          'semantic-callout-bypass',
          node,
          `jsx-role:${role}:${lineOf(sourceFile, node)}`,
          'bordered semantic feedback must compose through InlineAlert'
        );
      }
      if (role === 'dialog') {
        add(
          'low-level-overlay',
          node,
          `jsx-role:${tagName}:${lineOf(sourceFile, node)}`,
          'handmade role="dialog" surfaces must use DialogFrame or DrawerFrame'
        );
      }
    }

    if (
      includePackageRules
      && (isApplication || isUiPackage)
      && (
        ts.isStringLiteral(node)
        || ts.isNoSubstitutionTemplateLiteral(node)
        || ts.isTemplateExpression(node)
      )
    ) {
      for (const text of stringTokens(node)) {
        const tokens = [...text.matchAll(rawTypographyPattern)].map((match) => match[1]);
        if (tokens.length > 0) {
          add(
            'raw-typography',
            node,
            `string:${lineOf(sourceFile, node)}:${[...new Set(tokens)].sort().join(',')}`,
            `${[...new Set(tokens)].join(', ')} must be replaced by semantic typography roles`
          );
        }
      }
    }

    if (isApplication) {
      const declarationName = (
        (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node))
        && node.name
        && node.name.text
      ) || (
        ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.name.text
      );
      if (declarationName && publicUiExports.has(declarationName)) {
        add(
          'ui-export-shadow',
          node,
          `declaration:${declarationName}`,
          `${declarationName} shadows a public @acornops/ui value export`
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  }).filter((path) => {
    const repoPath = normalizedPath(path);
    return ['.ts', '.tsx'].includes(extname(path)) && !excludedFilePattern.test(repoPath);
  });
}

function publicUiValueExports(root) {
  const packageRoot = join(root, 'packages/ui/src');
  const indexSource = readFileSync(join(packageRoot, 'index.ts'), 'utf8');
  const indexFile = sourceFileFor(indexSource, 'packages/ui/src/index.ts');
  const modules = [];
  for (const statement of indexFile.statements) {
    if (
      ts.isExportDeclaration(statement)
      && statement.moduleSpecifier
      && ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      modules.push(statement.moduleSpecifier.text);
    }
  }

  const names = new Set();
  for (const moduleName of modules) {
    const path = join(packageRoot, `${moduleName.replace(/^\.\//, '')}.tsx`);
    const fallbackPath = join(packageRoot, `${moduleName.replace(/^\.\//, '')}.ts`);
    const resolvedPath = statOrUndefined(path) ? path : fallbackPath;
    if (!statOrUndefined(resolvedPath)) continue;
    const repoPath = normalizedPath(relative(root, resolvedPath));
    for (const name of exportedValueNames(readFileSync(resolvedPath, 'utf8'), repoPath)) names.add(name);
  }
  return names;
}

function statOrUndefined(path) {
  try {
    return statSync(path);
  } catch {
    return undefined;
  }
}

function exceptionKey(item) {
  return `${item.rule}|${item.path}|${item.scope}`;
}

export function validateExceptionMetadata(document, violations, { final = true } = {}) {
  const errors = [];
  if (document?.schemaVersion !== 1 || !Array.isArray(document?.exceptions)) {
    return ['exception metadata must use schemaVersion 1 with an exceptions array'];
  }

  const violationKeys = new Set(violations.map(exceptionKey));
  const ids = new Set();
  const keys = new Set();
  for (const exception of document.exceptions) {
    for (const field of requiredExceptionFields) {
      if (typeof exception[field] !== 'string' || exception[field].trim() === '') {
        errors.push(`${exception.id || '<missing-id>'}: ${field} is required`);
      }
    }
    if (!ADOPTION_RULES.includes(exception.rule)) {
      errors.push(`${exception.id}: unknown rule ${exception.rule}`);
    }
    if (!['permanent', 'temporary'].includes(exception.classification)) {
      errors.push(`${exception.id}: classification must be permanent or temporary`);
    }
    if (exception.rationale?.trim().length < 40) {
      errors.push(`${exception.id}: rationale must contain at least 40 characters`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exception.reviewedOn || '')) {
      errors.push(`${exception.id}: reviewedOn must use YYYY-MM-DD`);
    }
    if (exception.classification === 'temporary' && !/^\d{4}-\d{2}-\d{2}$/.test(exception.expiresOn || '')) {
      errors.push(`${exception.id}: temporary exceptions require expiresOn`);
    }
    if (final && exception.classification === 'temporary') {
      errors.push(`${exception.id}: temporary exceptions are prohibited in final validation`);
    }
    const key = exceptionKey(exception);
    if (ids.has(exception.id)) errors.push(`${exception.id}: duplicate exception id`);
    if (keys.has(key)) errors.push(`${exception.id}: duplicate exception target ${key}`);
    if (!violationKeys.has(key)) errors.push(`${exception.id}: stale exception target ${key}`);
    ids.add(exception.id);
    keys.add(key);
  }
  return errors;
}

export function applyExceptions(violations, document) {
  const exceptionsByKey = new Map(document.exceptions.map((item) => [exceptionKey(item), item]));
  const excepted = [];
  const active = [];
  for (const violation of violations) {
    const exception = exceptionsByKey.get(exceptionKey(violation));
    if (exception) excepted.push({ ...violation, exception });
    else active.push(violation);
  }
  return { active, excepted };
}

export function analyzeRepository(root) {
  const publicUiExports = publicUiValueExports(root);
  const roots = [join(root, 'src'), join(root, 'packages/ui/src')];
  const files = roots.flatMap(sourceFiles);
  const violations = files.flatMap((path) => analyzeSource({
    source: readFileSync(path, 'utf8'),
    repoPath: normalizedPath(relative(root, path)),
    publicUiExports
  }));
  return { files, violations };
}

function categorySummary(violations) {
  return Object.fromEntries(ADOPTION_RULES.map((rule) => [
    rule,
    violations.filter((violation) => violation.rule === rule).length
  ]));
}

function printSummary({ fileCount, detected, excepted, active, exceptions }) {
  console.log(`Design-system adoption report across ${fileCount} production source files:`);
  const detectedSummary = categorySummary(detected);
  const exceptedSummary = categorySummary(excepted);
  const activeSummary = categorySummary(active);
  for (const rule of ADOPTION_RULES) {
    console.log(
      `- ${rule}: ${activeSummary[rule]} violation(s), `
      + `${exceptedSummary[rule]} excepted, ${detectedSummary[rule]} detected`
    );
  }
  const permanent = exceptions.filter((item) => item.classification === 'permanent').length;
  const temporary = exceptions.filter((item) => item.classification === 'temporary').length;
  console.log(`- exceptions: ${permanent} permanent, ${temporary} temporary`);
}

async function main() {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  const args = new Set(process.argv.slice(2));
  const reportOnly = args.has('--report');
  const exceptionDocument = JSON.parse(
    readFileSync(join(root, 'scripts/design-adoption-exceptions.json'), 'utf8')
  );
  const { files, violations } = analyzeRepository(root);
  const metadataErrors = validateExceptionMetadata(exceptionDocument, violations, { final: true });
  const { active, excepted } = applyExceptions(violations, exceptionDocument);

  printSummary({
    fileCount: files.length,
    detected: violations,
    excepted,
    active,
    exceptions: exceptionDocument.exceptions
  });

  if (reportOnly) {
    for (const error of metadataErrors) console.log(`- metadata: ${error}`);
    for (const violation of active) {
      console.log(`- ${violation.path}:${violation.line} [${violation.rule}] ${violation.detail}`);
    }
    return;
  }

  if (metadataErrors.length > 0 || active.length > 0) {
    console.error(
      `Design-system adoption failed with ${active.length} violation(s) `
      + `and ${metadataErrors.length} metadata error(s).`
    );
    for (const error of metadataErrors) console.error(`- metadata: ${error}`);
    for (const violation of active) {
      console.error(`- ${violation.path}:${violation.line} [${violation.rule}] ${violation.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Design-system adoption passed with zero violations and zero temporary exceptions.');
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  await main();
}
