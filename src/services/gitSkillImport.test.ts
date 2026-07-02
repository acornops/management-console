import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitSkillImportError, importTargetSkillFromGit } from './gitSkillImport';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

function textResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers
  });
}

function base64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

describe('client Git skill import', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/repos/openai/skills')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.endsWith('/repos/acme/skills')) {
        return jsonResponse({ default_branch: 'trunk' });
      }
      if (url.endsWith('/repos/openai/skills/commits/main')) {
        return jsonResponse({ sha: '0123456789abcdef0123456789abcdef01234567' });
      }
      if (url.endsWith('/repos/openai/skills/commits/feature%2Fimports')) {
        return jsonResponse({ sha: '0123456789abcdef0123456789abcdef01234567' });
      }
      if (url.endsWith('/repos/acme/skills/commits/trunk')) {
        return jsonResponse({ sha: 'fedcba9876543210fedcba9876543210fedcba98' });
      }
      if (url.endsWith('/github/api/v3/repos/platform/skills')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.endsWith('/github/api/v3/repos/platform/skills/commits/main')) {
        return jsonResponse({ sha: 'cccccccccccccccccccccccccccccccccccccccc' });
      }
      if (url.includes('/git/trees/0123456789abcdef0123456789abcdef01234567')) {
        return jsonResponse({
          tree: [
            { path: 'skills/.curated/cli-creator/SKILL.md', type: 'blob', sha: 'skill-sha' },
            { path: 'skills/.curated/cli-creator/references/setup.md', type: 'blob', sha: 'setup-sha' },
            { path: 'skills/.curated/cli-creator/package.json', type: 'blob', sha: 'package-sha' },
            { path: 'skills/.curated/other/SKILL.md', type: 'blob', sha: 'other-sha' }
          ]
        });
      }
      if (url.includes('/git/trees/fedcba9876543210fedcba9876543210fedcba98')) {
        return jsonResponse({
          tree: [
            { path: 'skills/demo/SKILL.md', type: 'blob', sha: 'enterprise-skill-sha' }
          ]
        });
      }
      if (url.includes('/git/trees/cccccccccccccccccccccccccccccccccccccccc')) {
        return jsonResponse({
          tree: [
            { path: 'skills/demo/SKILL.md', type: 'blob', sha: 'prefixed-github-skill-sha' }
          ]
        });
      }
      if (url.endsWith('/git/blobs/skill-sha')) {
        return jsonResponse({ encoding: 'base64', content: base64('---\nname: CLI Creator\ndescription: Build CLIs\n---\n') });
      }
      if (url.endsWith('/git/blobs/setup-sha')) {
        return jsonResponse({ encoding: 'base64', content: base64('# Setup\n') });
      }
      if (url.endsWith('/git/blobs/enterprise-skill-sha')) {
        return jsonResponse({ encoding: 'base64', content: base64('---\nname: Enterprise Skill\ndescription: Internal\n---\n') });
      }
      if (url.endsWith('/git/blobs/prefixed-github-skill-sha')) {
        return jsonResponse({ encoding: 'base64', content: base64('---\nname: Prefixed GitHub Skill\ndescription: Internal\n---\n') });
      }
      if (url.endsWith('/api/v4/projects/platform%2Fclone-style')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.endsWith('/api/v4/projects/platform%2Fclone-style/repository/commits/main')) {
        return jsonResponse({ id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
      }
      if (url.includes('/api/v4/projects/platform%2Fclone-style/repository/tree')) {
        return jsonResponse([
          { path: 'SKILL.md', type: 'blob', id: 'clone-style-skill-sha' }
        ]);
      }
      if (url.endsWith('/api/v4/projects/platform%2Fclone-style/repository/blobs/clone-style-skill-sha/raw')) {
        return textResponse('---\nname: Clone Style GitLab Skill\ndescription: Internal\n---\n');
      }
      if (url.endsWith('/gitlab/api/v4/projects/platform%2Fskills')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.endsWith('/gitlab/api/v4/projects/platform%2Fskills/repository/commits/main')) {
        return jsonResponse({ id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
      }
      if (url.includes('/gitlab/api/v4/projects/platform%2Fskills/repository/tree')) {
        return jsonResponse([
          { path: 'SKILL.md', type: 'blob', id: 'prefixed-gitlab-skill-sha' }
        ]);
      }
      if (url.endsWith('/gitlab/api/v4/projects/platform%2Fskills/repository/blobs/prefixed-gitlab-skill-sha/raw')) {
        return textResponse('---\nname: Prefixed GitLab Skill\ndescription: Internal\n---\n');
      }
      if (url.endsWith('/api/v4/projects/platform%2Fskills')) {
        return jsonResponse({ default_branch: 'main' });
      }
      if (url.endsWith('/api/v4/projects/platform%2Fskills/repository/commits/main')) {
        return jsonResponse({ id: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd' });
      }
      if (url.includes('/api/v4/projects/platform%2Fskills/repository/tree')) {
        return jsonResponse([
          { path: 'SKILL.md', type: 'blob', id: 'gitlab-skill-sha' },
          { path: 'references/setup.md', type: 'blob', id: 'gitlab-setup-sha' },
          { path: 'package.json', type: 'blob', id: 'gitlab-package-sha' }
        ]);
      }
      if (url.endsWith('/api/v4/projects/platform%2Fskills/repository/blobs/gitlab-skill-sha/raw')) {
        return textResponse('---\nname: GitLab Skill\ndescription: Internal\n---\n');
      }
      if (url.endsWith('/api/v4/projects/platform%2Fskills/repository/blobs/gitlab-setup-sha/raw')) {
        return textResponse('# GitLab setup\n');
      }
      return jsonResponse({ message: `unexpected request: ${url}` }, 500);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches Markdown skill files from GitHub in the browser and returns a control-plane import payload', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills/tree/main/skills/.curated/cli-creator'
    })).resolves.toEqual({
      files: [
        { path: 'SKILL.md', content: '---\nname: CLI Creator\ndescription: Build CLIs\n---\n' },
        { path: 'references/setup.md', content: '# Setup\n' }
      ],
      source: {
        provider: 'github',
        repoUrl: 'https://github.com/openai/skills',
        ref: 'main',
        subpath: 'skills/.curated/cli-creator',
        commitSha: '0123456789abcdef0123456789abcdef01234567'
      }
    });
  });

  it('uses GitHub Enterprise API routing for custom GitHub hosts', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.internal/acme/skills',
      subpath: 'skills/demo'
    })).resolves.toMatchObject({
      files: [
        { path: 'SKILL.md', content: '---\nname: Enterprise Skill\ndescription: Internal\n---\n' }
      ],
      source: {
        provider: 'github',
        repoUrl: 'https://github.internal/acme/skills',
        ref: 'trunk',
        subpath: 'skills/demo',
        commitSha: 'fedcba9876543210fedcba9876543210fedcba98'
      }
    });
    expect(fetch).toHaveBeenCalledWith('https://github.internal/api/v3/repos/acme/skills', expect.any(Object));
  });

  it('uses explicit API base URLs for path-prefixed GitHub Enterprise deployments', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://git.internal/github/platform/skills',
      apiBaseUrl: 'https://git.internal/github/api/v3',
      subpath: 'skills/demo'
    })).resolves.toEqual({
      files: [
        { path: 'SKILL.md', content: '---\nname: Prefixed GitHub Skill\ndescription: Internal\n---\n' }
      ],
      source: {
        provider: 'github',
        repoUrl: 'https://git.internal/github/platform/skills',
        apiBaseUrl: 'https://git.internal/github/api/v3',
        ref: 'main',
        subpath: 'skills/demo',
        commitSha: 'cccccccccccccccccccccccccccccccccccccccc'
      }
    });
    expect(fetch).toHaveBeenCalledWith('https://git.internal/github/api/v3/repos/platform/skills', expect.any(Object));
  });

  it('fetches Markdown skill files from self-managed GitLab', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'gitlab',
      repoUrl: 'https://gitlab.internal/platform/skills/-/tree/main/skills/demo'
    })).resolves.toEqual({
      files: [
        { path: 'SKILL.md', content: '---\nname: GitLab Skill\ndescription: Internal\n---\n' },
        { path: 'references/setup.md', content: '# GitLab setup\n' }
      ],
      source: {
        provider: 'gitlab',
        repoUrl: 'https://gitlab.internal/platform/skills',
        ref: 'main',
        subpath: 'skills/demo',
        commitSha: 'abcdefabcdefabcdefabcdefabcdefabcdefabcd'
      }
    });
    expect(fetch).toHaveBeenCalledWith('https://gitlab.internal/api/v4/projects/platform%2Fskills', expect.any(Object));
  });

  it('uses explicit API base URLs for path-prefixed GitLab deployments', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'gitlab',
      repoUrl: 'https://git.internal/gitlab/platform/skills',
      apiBaseUrl: 'https://git.internal/gitlab/api/v4',
      subpath: 'skills/demo'
    })).resolves.toEqual({
      files: [
        { path: 'SKILL.md', content: '---\nname: Prefixed GitLab Skill\ndescription: Internal\n---\n' }
      ],
      source: {
        provider: 'gitlab',
        repoUrl: 'https://git.internal/gitlab/platform/skills',
        apiBaseUrl: 'https://git.internal/gitlab/api/v4',
        ref: 'main',
        subpath: 'skills/demo',
        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      }
    });
    expect(fetch).toHaveBeenCalledWith('https://git.internal/gitlab/api/v4/projects/platform%2Fskills', expect.any(Object));
  });

  it('normalizes clone-style .git suffixes before calling provider APIs', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'gitlab',
      repoUrl: 'https://gitlab.internal/platform/clone-style.git',
      subpath: 'skills/demo'
    })).resolves.toMatchObject({
      source: {
        provider: 'gitlab',
        repoUrl: 'https://gitlab.internal/platform/clone-style',
        ref: 'main',
        subpath: 'skills/demo',
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      }
    });
    expect(fetch).toHaveBeenCalledWith('https://gitlab.internal/api/v4/projects/platform%2Fclone-style', expect.any(Object));
  });

  it('rejects API base URLs that do not match the selected provider API shape', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'gitlab',
      repoUrl: 'https://gitlab.internal/platform/skills',
      apiBaseUrl: 'https://gitlab.internal/api/v3',
      subpath: 'skills/demo'
    })).rejects.toThrow('/api/v4');
    expect(fetch).not.toHaveBeenCalledWith('https://gitlab.internal/api/v3/projects/platform%2Fskills', expect.any(Object));
  });

  it('rejects conflicting explicit subpaths for tree URLs', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills/tree/main/skills/.curated/cli-creator',
      subpath: 'skills/.curated/other'
    })).rejects.toBeInstanceOf(GitSkillImportError);
  });

  it('uses the repository default branch when importing from a bare repository URL', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills',
      subpath: 'skills/.curated/cli-creator'
    })).resolves.toMatchObject({
      source: {
        provider: 'github',
        repoUrl: 'https://github.com/openai/skills',
        ref: 'main',
        subpath: 'skills/.curated/cli-creator'
      }
    });
  });

  it('allows explicit slash-containing refs to disambiguate tree URLs', async () => {
    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills/tree/feature/imports/skills/.curated/cli-creator',
      ref: 'feature/imports',
      subpath: 'skills/.curated/cli-creator'
    })).resolves.toMatchObject({
      source: {
        provider: 'github',
        repoUrl: 'https://github.com/openai/skills',
        ref: 'feature/imports',
        subpath: 'skills/.curated/cli-creator',
        commitSha: '0123456789abcdef0123456789abcdef01234567'
      }
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/openai/skills/commits/feature%2Fimports',
      expect.any(Object)
    );
  });

  it('rejects truncated GitHub trees instead of importing partial content', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ default_branch: 'main' }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ sha: '0123456789abcdef0123456789abcdef01234567' }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ tree: [], truncated: true }));

    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills',
      subpath: 'skills/.curated/cli-creator'
    })).rejects.toThrow('truncated');
  });

  it('rejects oversized Git imports before downloading blob contents', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ default_branch: 'main' }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ sha: '0123456789abcdef0123456789abcdef01234567' }));
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({
      tree: [
        { path: 'skills/demo/SKILL.md', type: 'blob', sha: 'skill-sha' },
        ...Array.from({ length: 16 }, (_, index) => ({
          path: `skills/demo/references/${index}.md`,
          type: 'blob',
          sha: `reference-${index}-sha`
        }))
      ]
    }));

    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills',
      subpath: 'skills/demo'
    })).rejects.toMatchObject({
      code: 'invalidBundle'
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('normalizes Git provider HTTP failures to friendly messages', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => jsonResponse({ message: '404 Project Not Found: internal provider detail' }, 404));

    await expect(importTargetSkillFromGit({
      provider: 'gitlab',
      repoUrl: 'https://gitlab.internal/platform/skills',
      subpath: 'skills/demo'
    })).rejects.toMatchObject({
      code: 'notFound',
      message: 'Repository, ref, or subpath was not found. Check the Git URL, ref, and subpath.'
    });
  });

  it('normalizes malformed provider JSON to a friendly message', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => textResponse('not json', 200));

    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills',
      subpath: 'skills/.curated/cli-creator'
    })).rejects.toMatchObject({
      code: 'providerFailed',
      message: 'Git provider returned an unexpected response. Check the Git URL, ref, and subpath.'
    });
  });

  it('normalizes Git provider network failures to friendly messages', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(importTargetSkillFromGit({
      provider: 'github',
      repoUrl: 'https://github.com/openai/skills',
      subpath: 'skills/.curated/cli-creator'
    })).rejects.toMatchObject({
      code: 'providerUnavailable',
      message: 'Git provider could not be reached. Check browser access to the Git host and try again.'
    });
  });
});
