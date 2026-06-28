import React from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Edit3, Eye, GitBranch, MoreVertical, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuOptionClassName, menuSurfaceClassName } from '@/components/common/menuStyles';
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select';
import type { ControlPlaneTargetSkillsCatalog } from '@/services/controlPlaneApi';
import { sourceLabel, summarizeBytes, syncLabel } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';

type TargetSkillSummary = ControlPlaneTargetSkillsCatalog['items'][number];

interface TargetSkillsInventoryProps {
  skills: TargetSkillSummary[];
  canEditSkills: boolean;
  pendingToggleSkillId: string | null;
  onEditSkill: (skillId: string) => void;
  onDeleteSkill: (skillId: string) => void;
  onToggleSkill: (skillId: string, enabled: boolean) => void;
}

interface TargetSkillRowProps {
  skill: TargetSkillSummary;
  canEditSkills: boolean;
  pendingToggleSkillId: string | null;
  onEditSkill: (skillId: string) => void;
  onDeleteSkill: (skillId: string) => void;
  onToggleSkill: (skillId: string, enabled: boolean) => void;
}

const TargetSkillRow: React.FC<TargetSkillRowProps> = ({
  skill,
  canEditSkills,
  pendingToggleSkillId,
  onEditSkill,
  onDeleteSkill,
  onToggleSkill
}) => {
  const actionMenuId = React.useId();
  const actionMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const [actionMenuStyle, setActionMenuStyle] = React.useState<React.CSSProperties | null>(null);
  const isTogglingSkill = pendingToggleSkillId === skill.id;
  const isBlockedByOtherSkillToggle = Boolean(pendingToggleSkillId && !isTogglingSkill);
  const canToggleSkill = canEditSkills && !isBlockedByOtherSkillToggle && !isTogglingSkill;
  const assistantState = !skill.enabled
    ? 'Disabled'
    : skill.validationStatus === 'valid'
      ? 'Assistant-visible'
      : 'Needs fixes';
  const assistantStateClass = assistantState === 'Assistant-visible'
    ? 'bg-status-success-soft text-status-success-text'
    : assistantState === 'Disabled'
      ? 'bg-ui-bg text-ui-text-muted'
      : 'bg-status-warning-soft text-status-warning-text';
  const updateActionMenuPosition = React.useCallback(() => {
    const trigger = actionMenuButtonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 104;
    const top = Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8);
    setActionMenuStyle({
      left: Math.max(8, rect.right - menuWidth),
      top: Math.max(8, top),
      width: menuWidth
    });
  }, []);

  React.useEffect(() => {
    if (!actionMenuOpen) return undefined;

    updateActionMenuPosition();
    const closeMenu = () => setActionMenuOpen(false);
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuButtonRef.current?.contains(target) || actionMenuRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    const handleResize = () => updateActionMenuPosition();
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [actionMenuOpen, updateActionMenuPosition]);

  const closeActionMenu = () => setActionMenuOpen(false);
  const actionMenu = actionMenuOpen && actionMenuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={actionMenuRef}
          id={actionMenuId}
          role="menu"
          className={menuSurfaceClassName('fixed z-[130] p-1')}
          style={actionMenuStyle}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeActionMenu();
              onEditSkill(skill.id);
            }}
            className={menuOptionClassName()}
          >
            {canEditSkills ? (
              <Edit3 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            )}
            <span>{canEditSkills ? 'Edit skill' : 'View skill'}</span>
          </button>
          {canEditSkills && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeActionMenu();
                onDeleteSkill(skill.id);
              }}
              className={menuOptionClassName({ className: 'text-status-danger-text hover:bg-status-danger-soft' })}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Delete skill</span>
            </button>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <tr data-target-skill-row="true" className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45">
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-bg">
            <BookOpen className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            {skill.source.type === 'git_import' && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-ui-border bg-ui-surface shadow-sm">
                <GitBranch className="h-3 w-3 text-ui-text-muted" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ui-text">{skill.name}</span>
            <span className="mt-1 block truncate text-xs leading-5 text-ui-text-muted" title={skill.description}>{skill.description}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <span className={`type-micro-label rounded-full px-2.5 py-1 ${assistantStateClass}`}>
          {assistantState}
        </span>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          role="switch"
          aria-checked={skill.enabled}
          aria-disabled={!canToggleSkill}
          aria-label={`${skill.enabled ? 'Disable' : 'Enable'} ${skill.name}`}
          disabled={!canEditSkills}
          onClick={() => {
            if (!canToggleSkill) return;
            onToggleSkill(skill.id, !skill.enabled);
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed ${
            skill.enabled ? 'border-status-success bg-status-success' : 'border-ui-border bg-ui-text-muted/45'
          }`}
        >
          <span className="sr-only">{skill.enabled ? 'Enabled' : 'Disabled'}</span>
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-ui-surface shadow-sm transition-transform duration-200 ease-out ${
              skill.enabled ? 'translate-x-[22px]' : 'translate-x-1'
            }`}
          />
        </button>
      </td>
      <td className="hidden px-4 py-6 text-xs text-ui-text-muted sm:px-6 md:table-cell lg:px-8">
        {skill.bundleStats.fileCount} files, {summarizeBytes(skill.bundleStats.totalBytes)}
      </td>
      <td className="px-4 py-6 text-right sm:px-6 lg:px-8">
        <button
          ref={actionMenuButtonRef}
          data-target-skill-primary-actions="true"
          type="button"
          onClick={() => setActionMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-haspopup="menu"
          aria-expanded={actionMenuOpen}
          aria-controls={actionMenuOpen ? actionMenuId : undefined}
          aria-label={`Actions for ${skill.name}`}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        {actionMenu}
      </td>
    </tr>
  );
};

export const TargetSkillsInventory: React.FC<TargetSkillsInventoryProps> = ({
  skills,
  canEditSkills,
  pendingToggleSkillId,
  onEditSkill,
  onDeleteSkill,
  onToggleSkill
}) => {
  const { t } = useTranslation();
  const [skillSearch, setSkillSearch] = React.useState('');
  const [skillFilter, setSkillFilter] = React.useState<'all' | 'enabled' | 'disabled' | 'valid' | 'invalid'>('all');
  const filterOptions: Array<SelectOption<typeof skillFilter>> = [
    { value: 'all', label: 'All skills' },
    { value: 'enabled', label: 'Enabled' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'valid', label: 'Valid' },
    { value: 'invalid', label: 'Needs fixes' }
  ];

  const summary = React.useMemo(() => ({
    total: skills.length,
    assistantVisible: skills.filter((skill) => skill.enabled && skill.validationStatus === 'valid').length,
    enabled: skills.filter((skill) => skill.enabled).length,
    valid: skills.filter((skill) => skill.validationStatus === 'valid').length,
    needsFixes: skills.filter((skill) => skill.validationStatus !== 'valid').length,
    files: skills.reduce((total, skill) => total + skill.bundleStats.fileCount, 0)
  }), [skills]);

  const filteredSkills = React.useMemo(() => {
    const normalizedSearch = skillSearch.trim().toLowerCase();
    return skills.filter((skill) => {
      const searchableText = [
        skill.name,
        skill.description,
        skill.validationStatus === 'valid' ? 'valid' : 'needs fixes',
        skill.enabled ? 'enabled' : 'disabled',
        skill.source.type === 'git_import' ? sourceLabel(skill) : '',
        syncLabel(skill) || '',
        `${skill.bundleStats.fileCount} files`,
        summarizeBytes(skill.bundleStats.totalBytes)
      ].join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesFilter =
        skillFilter === 'all' ||
        (skillFilter === 'enabled' && skill.enabled) ||
        (skillFilter === 'disabled' && !skill.enabled) ||
        (skillFilter === 'valid' && skill.validationStatus === 'valid') ||
        (skillFilter === 'invalid' && skill.validationStatus !== 'valid');
      return matchesSearch && matchesFilter;
    });
  }, [skillFilter, skillSearch, skills]);

  return (
    <>
      <section data-target-skill-access-summary="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
          <div className="px-5 py-3.5">
            <h2 className="type-row-title">Skill inventory</h2>
            <p className="type-caption mt-1 min-h-10 text-ui-text-muted">
              Enabled valid skills appear in the composer and are frozen when a run starts. Changes affect future runs only.
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">Skills</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{summary.total}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">Assistant-visible</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {summary.assistantVisible}
              <span className="h-2 w-2 rounded-full bg-status-success" />
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">Enabled skills</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{summary.enabled}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">Needs fixes</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {summary.needsFixes}
              <span className="h-2 w-2 rounded-full bg-status-warning" />
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">Files</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{summary.files}</p>
          </div>
        </div>
      </section>

      <section data-target-skill-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
          <div className="relative min-w-0">
            <label htmlFor="target-skill-search" className="sr-only">{t('targetSkills.searchSkills')}</label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <input
              id="target-skill-search"
              type="text"
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
              placeholder={t('targetSkills.searchSkills')}
              className="w-full rounded-lg border border-transparent bg-ui-bg py-3 pl-11 pr-4 text-sm text-ui-text outline-none transition-colors placeholder:text-ui-text-muted/60 focus-visible:border-accent/30 focus-visible:ring-2 focus-visible:ring-accent/10"
            />
          </div>
          <Select<typeof skillFilter>
            value={skillFilter}
            options={filterOptions}
            onChange={setSkillFilter}
            className="w-full"
            ariaLabel={t('targetSkills.filterSkills')}
          />
          <span className="type-label flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-ui-border bg-ui-bg px-3 text-ui-text-muted">
            {t('targetSkills.showingItems', { count: filteredSkills.length, total: skills.length })}
          </span>
        </div>
        <div className="min-w-0">
          <table className="w-full table-fixed text-left" aria-label="Target skills">
            <caption className="sr-only">Target skills</caption>
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[23%]" />
              <col className="w-[11%]" />
              <col className="w-[21%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ui-border">
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">Skill</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">Assistant state</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">Enabled</th>
                <th scope="col" className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">Files</th>
                <th scope="col" className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.length > 0 ? filteredSkills.map((skill) => (
                <TargetSkillRow
                  key={skill.id}
                  skill={skill}
                  canEditSkills={canEditSkills}
                  pendingToggleSkillId={pendingToggleSkillId}
                  onEditSkill={onEditSkill}
                  onDeleteSkill={onDeleteSkill}
                  onToggleSkill={onToggleSkill}
                />
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center">
                    <p className="type-body">{skills.length === 0 ? 'No target skills configured.' : 'No skills match these filters.'}</p>
                    <p className="type-caption mt-1 text-ui-text-muted">
                      {skills.length === 0 ? 'Create or import a skill to add target-scoped prompt context.' : 'Adjust the search text or status filter.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};
