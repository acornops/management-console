import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, expect, it } from 'vitest';
import { initializeI18n } from '@/i18n';
import { TargetSkillSourceDetails } from './TargetSkillEditorDialog';

beforeAll(initializeI18n);
it('keeps full Git URL, ref and commit selectable without creating a navigation URL', () => {
  const repoUrl = 'https://github.com/example/very-long-repository-name';
  const commitSha = 'abcdef0123456789abcdef0123456789abcdef01';
  const html = renderToStaticMarkup(<TargetSkillSourceDetails source={{ type: 'git_import', repoUrl, ref: 'release/long-ref', commitSha, syncStatus: 'current' }} />);
  expect(html).toContain(repoUrl);
  expect(html).toContain(commitSha);
  expect(html).toContain('release/long-ref');
  expect(html).toContain('readOnly=""');
  expect(html).toContain('Select to copy');
  expect(html).not.toContain('href=');
});
