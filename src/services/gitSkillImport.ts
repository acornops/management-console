import type { GitTargetSkillImportInput, ImportTargetSkillInput } from '@/services/controlPlaneApi';
import { isFrontendFixtureRuntime } from '@/config/appDataMode';

interface GitHubApiTreeEntry {
  path: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
}

interface GitLabApiTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  id: string;
}

interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  repoUrl: string;
  apiBaseUrl: string;
  embeddedPathSegments?: string[];
  embeddedRef?: string;
  embeddedSubpath?: string;
}

interface ParsedGitLabRepo {
  projectPath: string;
  repoUrl: string;
  apiBaseUrl: string;
  embeddedPathSegments?: string[];
  embeddedRef?: string;
  embeddedSubpath?: string;
}

const TARGET_SKILL_MAX_FILES = 16;
const TARGET_SKILL_MAX_FILE_BYTES = 32 * 1024;
const TARGET_SKILL_MAX_TOTAL_BYTES = 128 * 1024;

export type GitSkillImportErrorCode =
  | 'invalidRepoUrl'
  | 'invalidApiBaseUrl'
  | 'invalidRef'
  | 'invalidSubpath'
  | 'invalidBundle'
  | 'accessDenied'
  | 'notFound'
  | 'rateLimited'
  | 'providerUnavailable'
  | 'providerFailed';

export class GitSkillImportError extends Error {
  constructor(message: string, readonly code: GitSkillImportErrorCode = 'providerFailed') {
    super(message);
    this.name = 'GitSkillImportError';
  }
}

export async function importTargetSkillFromGit(input: GitTargetSkillImportInput): Promise<ImportTargetSkillInput> {
  return input.provider === 'gitlab'
    ? importTargetSkillFromGitLab(input)
    : importTargetSkillFromGitHub(input);
}

async function importTargetSkillFromGitHub(input: GitTargetSkillImportInput): Promise<ImportTargetSkillInput> {
  const parsedRepo = parseGitHubRepoUrl(input.repoUrl, input.apiBaseUrl);
  const normalizedInput = normalizeGitImportInput(input, parsedRepo);
  const repoInfo = await gitGet<{ default_branch?: string }>(`${parsedRepo.apiBaseUrl}/repos/${parsedRepo.owner}/${parsedRepo.repo}`);
  const effectiveRef = String(normalizedInput.ref || repoInfo.default_branch || '').trim();
  if (!effectiveRef) {
    throw new GitSkillImportError('Unable to determine a Git ref for the requested repository.', 'invalidRef');
  }

  const commit = await gitGet<{ sha?: string }>(
    `${parsedRepo.apiBaseUrl}/repos/${parsedRepo.owner}/${parsedRepo.repo}/commits/${encodeURIComponent(effectiveRef)}`
  );
  const commitSha = String(commit.sha || '').trim();
  if (!commitSha) {
    throw new GitSkillImportError('GitHub did not return a commit SHA for the requested ref.', 'invalidRef');
  }

  const normalizedSubpath = normalizeImportSubpath(normalizedInput.subpath);
  const tree = await gitGet<{ tree?: GitHubApiTreeEntry[]; truncated?: boolean }>(
    `${parsedRepo.apiBaseUrl}/repos/${parsedRepo.owner}/${parsedRepo.repo}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`
  );
  if (tree.truncated) {
    throw new GitSkillImportError('GitHub returned a truncated repository tree. Import a smaller skill folder using Subpath.', 'invalidSubpath');
  }

  const allEntries = Array.isArray(tree.tree) ? tree.tree : [];
  const bundleEntries = allEntries.filter((entry) => isEntryWithinSubpath(entry.path, normalizedSubpath));
  const fileEntries = bundleEntries.filter((entry) => entry.type === 'blob');
  if (fileEntries.length === 0) {
    throw new GitSkillImportError('The requested Git subpath does not exist or does not contain files.', 'invalidSubpath');
  }
  const invalidEntry = bundleEntries.find((entry) => entry.type !== 'tree' && entry.type !== 'blob');
  if (invalidEntry) {
    throw new GitSkillImportError(`Git import only supports regular repository files. Unsupported entry: ${invalidEntry.path}`, 'invalidBundle');
  }

  const skillFileEntries = validateSkillEntries(fileEntries, normalizedSubpath);
  const files: ImportTargetSkillInput['files'] = [];
  let totalBytes = 0;
  for (const entry of skillFileEntries.sort((left, right) => compareSkillPaths(left.path, right.path, normalizedSubpath))) {
    const blob = await gitGet<{ content?: string; encoding?: string }>(
      `${parsedRepo.apiBaseUrl}/repos/${parsedRepo.owner}/${parsedRepo.repo}/git/blobs/${encodeURIComponent(entry.sha)}`
    );
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') {
      throw new GitSkillImportError(`GitHub returned unsupported content encoding for ${entry.path}.`, 'invalidBundle');
    }
    const file = {
      path: toBundleRelativePath(entry.path, normalizedSubpath),
      content: decodeBase64Utf8(blob.content)
    };
    totalBytes = appendImportedFile(files, file, totalBytes);
  }

  return {
    files,
    source: {
      provider: 'github',
      repoUrl: parsedRepo.repoUrl,
      ...(input.apiBaseUrl ? { apiBaseUrl: parsedRepo.apiBaseUrl } : {}),
      ref: effectiveRef,
      ...(normalizedSubpath ? { subpath: normalizedSubpath } : {}),
      commitSha
    }
  };
}

async function importTargetSkillFromGitLab(input: GitTargetSkillImportInput): Promise<ImportTargetSkillInput> {
  const parsedRepo = parseGitLabRepoUrl(input.repoUrl, input.apiBaseUrl);
  const normalizedInput = normalizeGitImportInput(input, parsedRepo);
  const encodedProjectPath = encodeURIComponent(parsedRepo.projectPath);
  const project = await gitGet<{ default_branch?: string }>(`${parsedRepo.apiBaseUrl}/projects/${encodedProjectPath}`);
  const effectiveRef = String(normalizedInput.ref || project.default_branch || '').trim();
  if (!effectiveRef) {
    throw new GitSkillImportError('Unable to determine a Git ref for the requested repository.', 'invalidRef');
  }

  const commit = await gitGet<{ id?: string }>(
    `${parsedRepo.apiBaseUrl}/projects/${encodedProjectPath}/repository/commits/${encodeURIComponent(effectiveRef)}`
  );
  const commitSha = String(commit.id || '').trim();
  if (!commitSha) {
    throw new GitSkillImportError('GitLab did not return a commit SHA for the requested ref.', 'invalidRef');
  }

  const normalizedSubpath = normalizeImportSubpath(normalizedInput.subpath);
  const treeUrl = new URL(`${parsedRepo.apiBaseUrl}/projects/${encodedProjectPath}/repository/tree`);
  treeUrl.searchParams.set('ref', commitSha);
  treeUrl.searchParams.set('recursive', 'true');
  treeUrl.searchParams.set('per_page', '100');
  if (normalizedSubpath) treeUrl.searchParams.set('path', normalizedSubpath);
  const allEntries = (await gitLabGetAllPages<GitLabApiTreeEntry>(treeUrl.toString()))
    .map((entry) => ({ ...entry, path: normalizeGitLabTreeEntryPath(entry.path, normalizedSubpath) }));
  const bundleEntries = allEntries.filter((entry) => isEntryWithinSubpath(entry.path, normalizedSubpath));
  const fileEntries = bundleEntries.filter((entry) => entry.type === 'blob');
  if (fileEntries.length === 0) {
    throw new GitSkillImportError('The requested Git subpath does not exist or does not contain files.', 'invalidSubpath');
  }

  const skillFileEntries = validateSkillEntries(fileEntries, normalizedSubpath);
  const files: ImportTargetSkillInput['files'] = [];
  let totalBytes = 0;
  for (const entry of skillFileEntries.sort((left, right) => compareSkillPaths(left.path, right.path, normalizedSubpath))) {
    const blobUrl = `${parsedRepo.apiBaseUrl}/projects/${encodedProjectPath}/repository/blobs/${encodeURIComponent(entry.id)}/raw`;
    const file = {
      path: toBundleRelativePath(entry.path, normalizedSubpath),
      content: await gitGetText(blobUrl)
    };
    totalBytes = appendImportedFile(files, file, totalBytes);
  }

  return {
    files,
    source: {
      provider: 'gitlab',
      repoUrl: parsedRepo.repoUrl,
      ...(input.apiBaseUrl ? { apiBaseUrl: parsedRepo.apiBaseUrl } : {}),
      ref: effectiveRef,
      ...(normalizedSubpath ? { subpath: normalizedSubpath } : {}),
      commitSha
    }
  };
}

function parseGitHubRepoUrl(rawUrl: string, rawApiBaseUrl?: string): ParsedGitHubRepo {
  const parsed = parseHttpsUrl(rawUrl);
  const explicitApiBaseUrl = normalizeProviderApiBaseUrl('github', rawApiBaseUrl);
  const repoPath = splitRepoPathSegments(parsed, explicitApiBaseUrl, '/api/v3');
  const segments = repoPath.segments;
  if (segments.length < 2) {
    throw new GitSkillImportError('Repository URL must point to a GitHub owner and repository.', 'invalidRepoUrl');
  }
  if (segments.length > 2 && segments[2] !== 'tree') {
    throw new GitSkillImportError('GitHub URL must point to a repository or tree path.', 'invalidRepoUrl');
  }
  const treePath = segments[2] === 'tree' ? segments.slice(3) : [];
  if (segments[2] === 'tree' && treePath.length === 0) {
    throw new GitSkillImportError('GitHub tree URL must include a ref such as main.', 'invalidRef');
  }
  const repo = stripGitSuffix(segments[1]);
  return {
    owner: segments[0],
    repo,
    repoUrl: `${parsed.origin}/${[...repoPath.prefixSegments, segments[0], repo].join('/')}`,
    apiBaseUrl: explicitApiBaseUrl || (parsed.hostname === 'github.com' ? 'https://api.github.com' : `${parsed.origin}/api/v3`),
    embeddedPathSegments: treePath.length > 0 ? treePath : undefined,
    embeddedRef: treePath[0],
    embeddedSubpath: treePath.slice(1).join('/') || undefined
  };
}

function parseGitLabRepoUrl(rawUrl: string, rawApiBaseUrl?: string): ParsedGitLabRepo {
  const parsed = parseHttpsUrl(rawUrl);
  const explicitApiBaseUrl = normalizeProviderApiBaseUrl('gitlab', rawApiBaseUrl);
  const repoPath = splitRepoPathSegments(parsed, explicitApiBaseUrl, '/api/v4');
  const segments = repoPath.segments;
  const treeIndex = segments.indexOf('-');
  const projectSegments = treeIndex === -1 ? segments : segments.slice(0, treeIndex);
  if (projectSegments.length < 1) {
    throw new GitSkillImportError('Repository URL must point to a GitLab project.', 'invalidRepoUrl');
  }
  if (treeIndex !== -1 && segments[treeIndex + 1] !== 'tree') {
    throw new GitSkillImportError('GitLab URL must point to a project or tree path.', 'invalidRepoUrl');
  }
  const treePath = treeIndex !== -1 ? segments.slice(treeIndex + 2) : [];
  if (treeIndex !== -1 && treePath.length === 0) {
    throw new GitSkillImportError('GitLab tree URL must include a ref such as main.', 'invalidRef');
  }
  const normalizedProjectSegments = projectSegments.map((segment, index) =>
    index === projectSegments.length - 1 ? stripGitSuffix(segment) : segment
  );
  const projectPath = normalizedProjectSegments.join('/');
  return {
    projectPath,
    repoUrl: `${parsed.origin}/${[...repoPath.prefixSegments, ...normalizedProjectSegments].join('/')}`,
    apiBaseUrl: explicitApiBaseUrl || `${parsed.origin}/api/v4`,
    embeddedPathSegments: treePath.length > 0 ? treePath : undefined,
    embeddedRef: treePath[0],
    embeddedSubpath: treePath.slice(1).join('/') || undefined
  };
}

function stripGitSuffix(segment: string): string {
  return segment.endsWith('.git') ? segment.slice(0, -4) : segment;
}

function splitRepoPathSegments(parsed: URL, apiBaseUrl: string | undefined, apiSuffix: '/api/v3' | '/api/v4'): { segments: string[]; prefixSegments: string[] } {
  const segments = parsed.pathname.replace(/\.git$/, '').split('/').filter(Boolean).map(decodePathSegment);
  if (!apiBaseUrl) return { segments, prefixSegments: [] };

  const apiBase = new URL(apiBaseUrl);
  if (apiBase.origin !== parsed.origin) return { segments, prefixSegments: [] };

  const apiPath = apiBase.pathname.replace(/\/+$/g, '');
  const prefixPath = apiPath.endsWith(apiSuffix) ? apiPath.slice(0, -apiSuffix.length) : '';
  const prefixSegments = prefixPath.split('/').filter(Boolean).map(decodePathSegment);
  if (prefixSegments.length === 0) return { segments, prefixSegments: [] };
  const hasPrefix = prefixSegments.every((segment, index) => segments[index] === segment);
  return hasPrefix
    ? { segments: segments.slice(prefixSegments.length), prefixSegments }
    : { segments, prefixSegments: [] };
}

function normalizeProviderApiBaseUrl(provider: 'github' | 'gitlab', rawApiBaseUrl: string | undefined): string | undefined {
  const trimmed = optionalTrimmedString(rawApiBaseUrl);
  if (!trimmed) return undefined;
  const parsed = parseHttpsUrl(trimmed);
  const normalized = `${parsed.origin}${parsed.pathname.replace(/\/+$/g, '')}`;
  const expectedSuffix = provider === 'github' ? '/api/v3' : '/api/v4';
  if (!normalized.endsWith(expectedSuffix)) {
    throw new GitSkillImportError(`${provider === 'github' ? 'GitHub' : 'GitLab'} API base URL must end with ${expectedSuffix}.`, 'invalidApiBaseUrl');
  }
  return normalized;
}

function parseHttpsUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new GitSkillImportError('Skill import only supports valid HTTPS Git repository URLs.', 'invalidRepoUrl');
  }
  if (parsed.protocol !== 'https:') {
    throw new GitSkillImportError('Skill import only supports HTTPS Git repository URLs.', 'invalidRepoUrl');
  }
  return parsed;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    throw new GitSkillImportError('Repository URL contains an invalid encoded path segment.', 'invalidRepoUrl');
  }
}

function normalizeGitImportInput(input: GitTargetSkillImportInput, parsedRepo: Pick<ParsedGitHubRepo | ParsedGitLabRepo, 'embeddedPathSegments' | 'embeddedRef' | 'embeddedSubpath'>): GitTargetSkillImportInput {
  const explicitRef = optionalTrimmedString(input.ref);
  const explicitSubpath = optionalTrimmedString(input.subpath);
  const embeddedPathSegments = parsedRepo.embeddedPathSegments || [];
  if (explicitRef && embeddedPathSegments.length > 0) {
    const explicitRefSegments = explicitRef.split('/').filter(Boolean);
    const treeUrlStartsWithExplicitRef = explicitRefSegments.length <= embeddedPathSegments.length
      && explicitRefSegments.every((segment, index) => embeddedPathSegments[index] === segment);
    if (!treeUrlStartsWithExplicitRef) {
      throw new GitSkillImportError('Repository tree URL already includes a different ref. Leave the Ref field empty or use a bare repository URL.', 'invalidRef');
    }
    const embeddedSubpath = embeddedPathSegments.slice(explicitRefSegments.length).join('/') || undefined;
    if (explicitSubpath && embeddedSubpath && normalizeImportSubpath(explicitSubpath) !== embeddedSubpath) {
      throw new GitSkillImportError('Repository tree URL already includes a subpath. Leave the Subpath field empty or use a bare repository URL.', 'invalidSubpath');
    }
    return {
      ...input,
      ref: explicitRef,
      subpath: explicitSubpath || embeddedSubpath
    };
  }
  if (explicitRef && parsedRepo.embeddedRef && explicitRef !== parsedRepo.embeddedRef) {
    throw new GitSkillImportError('Repository tree URL already includes a ref. Leave the Ref field empty or use a bare repository URL.', 'invalidRef');
  }
  if (explicitSubpath && parsedRepo.embeddedSubpath && normalizeImportSubpath(explicitSubpath) !== parsedRepo.embeddedSubpath) {
    throw new GitSkillImportError('Repository tree URL already includes a subpath. Leave the Subpath field empty or use a bare repository URL.', 'invalidSubpath');
  }
  return {
    ...input,
    ref: explicitRef || parsedRepo.embeddedRef,
    subpath: explicitSubpath || parsedRepo.embeddedSubpath
  };
}

function optionalTrimmedString(value: string | undefined): string | undefined {
  const trimmed = String(value || '').trim();
  return trimmed || undefined;
}

function normalizeImportSubpath(rawSubpath: string | undefined): string {
  const candidate = String(rawSubpath || '').replaceAll('\\', '/').trim().replace(/^\/+|\/+$/g, '');
  if (!candidate) return '';
  const segments = candidate.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)) {
    throw new GitSkillImportError('Git subpath contains an invalid path segment.', 'invalidSubpath');
  }
  return candidate;
}

function normalizeGitLabTreeEntryPath(entryPath: string, subpath: string): string {
  if (!subpath || isEntryWithinSubpath(entryPath, subpath)) return entryPath;
  return `${subpath}/${entryPath.replace(/^\/+/, '')}`;
}

function validateSkillEntries<T extends { path: string }>(fileEntries: T[], subpath: string): T[] {
  const skillFileEntries = fileEntries.filter((entry) => isAllowedSkillEntry(entry.path, subpath));
  if (skillFileEntries.length === 0) {
    throw new GitSkillImportError('The requested Git subpath does not contain SKILL.md or Markdown skill files.', 'invalidBundle');
  }
  if (!skillFileEntries.some((entry) => toBundleRelativePath(entry.path, subpath) === 'SKILL.md')) {
    throw new GitSkillImportError('Git import requires SKILL.md at the selected repository path. Provide Subpath to a specific skill folder.', 'invalidBundle');
  }
  if (skillFileEntries.length > TARGET_SKILL_MAX_FILES) {
    throw new GitSkillImportError(`Git import can include at most ${TARGET_SKILL_MAX_FILES} Markdown files. Import a smaller skill folder using Subpath.`, 'invalidBundle');
  }
  return skillFileEntries;
}

function isEntryWithinSubpath(entryPath: string, subpath: string): boolean {
  return !subpath || entryPath === subpath || entryPath.startsWith(`${subpath}/`);
}

function isAllowedSkillEntry(entryPath: string, subpath: string): boolean {
  const relativePath = toBundleRelativePath(entryPath, subpath);
  return relativePath === 'SKILL.md' || relativePath.endsWith('.md');
}

function toBundleRelativePath(entryPath: string, subpath: string): string {
  return subpath ? entryPath.slice(subpath.length + 1) : entryPath;
}

function compareSkillPaths(leftPath: string, rightPath: string, subpath: string): number {
  const left = toBundleRelativePath(leftPath, subpath);
  const right = toBundleRelativePath(rightPath, subpath);
  if (left === 'SKILL.md' && right !== 'SKILL.md') return -1;
  if (left !== 'SKILL.md' && right === 'SKILL.md') return 1;
  return left.localeCompare(right);
}

function decodeBase64Utf8(value: string): string {
  const binary = globalThis.atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function appendImportedFile(
  files: ImportTargetSkillInput['files'],
  file: ImportTargetSkillInput['files'][number],
  currentTotalBytes: number
): number {
  const sizeBytes = new TextEncoder().encode(file.content).byteLength;
  if (sizeBytes > TARGET_SKILL_MAX_FILE_BYTES) {
    throw new GitSkillImportError(`Git import file "${file.path}" exceeds the ${TARGET_SKILL_MAX_FILE_BYTES} byte limit.`, 'invalidBundle');
  }
  const nextTotalBytes = currentTotalBytes + sizeBytes;
  if (nextTotalBytes > TARGET_SKILL_MAX_TOTAL_BYTES) {
    throw new GitSkillImportError(`Git import exceeds the ${TARGET_SKILL_MAX_TOTAL_BYTES} byte limit.`, 'invalidBundle');
  }
  files.push(file);
  return nextTotalBytes;
}

async function gitGet<T>(url: string): Promise<T> {
  const response = await gitFetch(url, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw await gitErrorMessage(response);
  }
  try {
    return await response.json() as T;
  } catch {
    throw new GitSkillImportError('Git provider returned an unexpected response. Check the Git URL, ref, and subpath.', 'providerFailed');
  }
}

async function gitGetText(url: string): Promise<string> {
  const response = await gitFetch(url);
  if (!response.ok) {
    throw await gitErrorMessage(response);
  }
  return response.text();
}

async function gitLabGetAllPages<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | null = url;
  while (nextUrl) {
    const response = await gitFetch(nextUrl, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
      throw await gitErrorMessage(response);
    }
    let page: T[];
    try {
      page = await response.json() as T[];
    } catch {
      throw new GitSkillImportError('GitLab returned an unexpected repository tree response.', 'providerFailed');
    }
    if (!Array.isArray(page)) {
      throw new GitSkillImportError('GitLab returned an unexpected repository tree response.', 'providerFailed');
    }
    items.push(...page);
    const nextPage = response.headers.get('x-next-page');
    if (!nextPage) {
      nextUrl = null;
    } else {
      const parsed = new URL(nextUrl);
      parsed.searchParams.set('page', nextPage);
      nextUrl = parsed.toString();
    }
  }
  return items;
}

async function gitFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isFrontendFixtureRuntime()) {
    throw new GitSkillImportError(
      'Remote Git operations are unavailable in frontend fixture mode.',
      'providerUnavailable'
    );
  }
  try {
    return await fetch(url, init);
  } catch {
    throw new GitSkillImportError('Git provider could not be reached. Check browser access to the Git host and try again.', 'providerUnavailable');
  }
}

async function gitErrorMessage(response: Response): Promise<GitSkillImportError> {
  await response.text().catch(() => '');
  if (response.status === 401 || response.status === 403) {
    return new GitSkillImportError('Git provider denied access. Check repository visibility and browser access to the Git host.', 'accessDenied');
  }
  if (response.status === 404) {
    return new GitSkillImportError('Repository, ref, or subpath was not found. Check the Git URL, ref, and subpath.', 'notFound');
  }
  if (response.status === 429) {
    return new GitSkillImportError('Git provider rate limit reached. Wait a moment and try again.', 'rateLimited');
  }
  if (response.status >= 500) {
    return new GitSkillImportError('Git provider could not complete the request. Try again shortly.', 'providerUnavailable');
  }
  return new GitSkillImportError('Git provider request failed. Check the Git URL, ref, and subpath.', 'providerFailed');
}
