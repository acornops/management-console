import React from 'react';
import { MenuItem, Switch } from '@/components/common/FormControls';
import { EmptyState } from '@/components/common/EmptyState';
import { createPortal } from 'react-dom';
import { BookOpen, Edit3, Eye, GitBranch, MoreVertical, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { menuSurfaceClassName } from '@/components/common/menuStyles';
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import type { ControlPlaneTargetSkillsCatalog } from '@/services/controlPlaneApi';
import { sourceLabel, summarizeBytes, syncLabel } from '@/features/targets/admin/targetSkillsViewModel';
import { useFloatingActionMenu } from '@/hooks/useFloatingActionMenu';

type TargetSkillSummary = ControlPlaneTargetSkillsCatalog['items'][number];

const targetSkillSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 font-normal');

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
  const { t } = useTranslation();
  const actionMenuId = React.useId();
  const [actionMenuOpen, setActionMenuOpen] = React.useState(false);
  const {
    triggerRef: actionMenuButtonRef,
    menuRef: actionMenuRef,
    style: actionMenuStyle,
    close: closeActionMenu
  } = useFloatingActionMenu({ open: actionMenuOpen, setOpen: setActionMenuOpen, estimatedHeight: 104 });
  const isTogglingSkill = pendingToggleSkillId === skill.id;
  const isBlockedByOtherSkillToggle = Boolean(pendingToggleSkillId && !isTogglingSkill);
  const canToggleSkill = canEditSkills && !isBlockedByOtherSkillToggle && !isTogglingSkill;
  const assistantState = !skill.enabled
    ? 'disabled'
    : skill.validationStatus === 'valid'
      ? 'assistantVisible'
      : 'needsFixes';
  const assistantStateClass = assistantState === 'assistantVisible'
    ? 'bg-status-success-soft text-status-success-text'
    : assistantState === 'disabled'
      ? 'bg-ui-bg text-ui-text-muted'
      : 'bg-status-warning-soft text-status-warning-text';
  const actionMenu = actionMenuOpen && actionMenuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={actionMenuRef}
          id={actionMenuId}
          role="menu"
          className={menuSurfaceClassName('fixed z-[130] p-1')}
          style={actionMenuStyle}
        >
          <MenuItem
            onClick={() => {
              closeActionMenu();
              onEditSkill(skill.id);
            }}
          >
            {canEditSkills ? (
              <Edit3 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            )}
            <span>{t(canEditSkills ? 'targetSkills.editSkill' : 'targetSkills.viewSkill')}</span>
          </MenuItem>
          {canEditSkills && (
            <MenuItem
              destructive
              onClick={() => {
                closeActionMenu();
                onDeleteSkill(skill.id);
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t('targetSkills.deleteSkill')}</span>
            </MenuItem>
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
            <span className="mt-1 block line-clamp-2 break-words text-xs leading-5 text-ui-text-muted" title={skill.description}>{skill.description}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <span className={`type-micro-label rounded-full px-2.5 py-1 ${assistantStateClass}`}>
          {t(`targetSkills.state.${assistantState}`)}
        </span>
      </td>
      <td className="px-4 py-6 sm:px-6 lg:px-8">
        <Switch
          checked={skill.enabled}
          aria-disabled={!canToggleSkill}
          label={t(skill.enabled ? 'targetSkills.disableNamed' : 'targetSkills.enableNamed', { name: skill.name })}
          disabled={!canEditSkills}
          onCheckedChange={(enabled) => {
            if (!canToggleSkill) return;
            onToggleSkill(skill.id, enabled);
          }}
        />
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
          className="control-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-haspopup="menu"
          aria-expanded={actionMenuOpen}
          aria-controls={actionMenuOpen ? actionMenuId : undefined}
          aria-label={t('targetSkills.actionsNamed', { name: skill.name })}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))]">
          <div className="col-span-2 border-b border-ui-border px-5 py-3.5 sm:col-span-3 xl:col-span-1 xl:border-b-0 xl:border-r">
            <h2 className="type-row-title">{t('targetSkills.inventoryTitle')}</h2>
            <p className="type-caption mt-1 min-h-10 text-ui-text-muted">
              {t('targetSkills.inventoryBody')}
            </p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.skillsMetric')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{summary.total}</p>
          </div>
          <div className="border-b border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.assistantVisibleSkills')}</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {summary.assistantVisible}
              <span className="h-2 w-2 rounded-full bg-status-success" />
            </p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.enabledSkillsMetric')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{summary.enabled}</p>
          </div>
          <div className="border-r border-ui-border px-5 py-3.5 sm:border-r">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.needsFixes')}</p>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text">
              {summary.needsFixes}
              <span className="h-2 w-2 rounded-full bg-status-warning" />
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.filesMetric')}</p>
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
              className={targetSkillSearchInputClassName}
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
          <table className="w-full table-fixed text-left" aria-label={t('targetSkills.tableLabel')}>
            <caption className="sr-only">{t('targetSkills.tableLabel')}</caption>
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[23%]" />
              <col className="w-[11%]" />
              <col className="w-[21%]" />
              <col className="w-[11%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ui-border">
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('targetSkills.skillColumn')}</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('targetSkills.assistantStateColumn')}</th>
                <th scope="col" className="type-label px-4 py-5 sm:px-6 lg:px-8">{t('targetSkills.enabledColumn')}</th>
                <th scope="col" className="type-label hidden px-4 py-5 sm:px-6 md:table-cell lg:px-8">{t('targetSkills.filesColumn')}</th>
                <th scope="col" className="type-label px-4 py-5 text-right sm:px-6 lg:px-8">{t('targetSkills.actionsColumn')}</th>
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
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      embedded
                      headingLevel={3}
                      icon={skills.length === 0 ? <BookOpen /> : <Search />}
                      title={skills.length === 0 ? t('targetSkills.empty') : t('targetSkills.noSkillMatches')}
                      description={skills.length === 0 ? t('targetSkills.emptyHelp') : t('targetSkills.noSkillMatchesHelp')}
                    />
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
