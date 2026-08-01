import React from 'react';
import { ActionMenu, IconTile, MenuItem, StatusBadge, Switch } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { DataTableFrame, DataTableHeader, DataTableHeaderCell } from '@acornops/ui';
import { BookOpen, Edit3, Eye, GitBranch, MoreVertical, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select } from '@acornops/ui';
import type { SelectOption } from '@acornops/ui';
import { formInputClassName } from '@acornops/ui';
import type { ControlPlaneTargetSkillsCatalog } from '@/services/controlPlaneApi';
import { sourceLabel, summarizeBytes, syncLabel } from '@/features/targets/admin/targetSkillsViewModel';
import { Button, TextInput } from '@acornops/ui';
import { DataTable, DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

type TargetSkillSummary = ControlPlaneTargetSkillsCatalog['items'][number];

const targetSkillSearchInputClassName = formInputClassName('py-3 pl-11 pr-4 type-body');

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

const TargetSkillRow: React.FC<TargetSkillRowProps> = ({ skill, canEditSkills, pendingToggleSkillId, onEditSkill, onDeleteSkill, onToggleSkill }) => {
  const { t } = useTranslation();
  const isTogglingSkill = pendingToggleSkillId === skill.id;
  const isBlockedByOtherSkillToggle = Boolean(pendingToggleSkillId && !isTogglingSkill);
  const canToggleSkill = canEditSkills && !isBlockedByOtherSkillToggle && !isTogglingSkill;
  const canEditSource = canEditSkills && !skill.inherited;
  const canRemoveSource = canEditSkills && !skill.inherited;
  const assistantState = !skill.enabled ? 'disabled' : skill.validationStatus === 'valid' ? 'assistantVisible' : 'needsFixes';
  const actionMenu = (
    <ActionMenu
      label={t('targetSkills.actionsNamed', { name: skill.name })}
      estimatedHeight={104}
      trigger={(
        <Button
          data-target-skill-primary-actions="true"
          type="button"
          variant="tertiary"
          size="icon"
          className="control-target inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    >
            <MenuItem
              onClick={() => {
                onEditSkill(skill.id);
              }}
            >
              {canEditSource ? (
                <Edit3 className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
              )}
              <span>{t(canEditSource ? 'targetSkills.editSkill' : 'targetSkills.viewSkill')}</span>
            </MenuItem>
            {canRemoveSource && (
              <MenuItem
                destructive
                onClick={() => {
                  onDeleteSkill(skill.id);
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t('targetSkills.deleteSkill')}</span>
              </MenuItem>
            )}
    </ActionMenu>
  );

  return (
    <DataTableRow data-target-skill-row="true" className="group border-b border-ui-bg transition-colors hover:bg-accent-soft/45">
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 gap-3">
          <IconTile tone="accent" className="relative">
            <BookOpen className="h-5 w-5 text-accent-strong" aria-hidden="true" />
            {skill.source.type === 'git_import' && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md border border-ui-border bg-ui-surface shadow-sm">
                <GitBranch className="h-3 w-3 text-ui-text-muted" aria-hidden="true" />
              </span>
            )}
          </IconTile>
          <div className="min-w-0 flex-1">
            <span className="type-row-title block truncate">{skill.name}</span>
            {skill.inherited && (
              <StatusBadge tone="neutral" className="mt-1">Platform default</StatusBadge>
            )}
            <span className="mt-1 block line-clamp-2 break-words type-caption leading-5 text-ui-text-muted" title={skill.description}>
              {skill.description}
            </span>
          </div>
        </div>
      </DataTableCell>
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
        <StatusBadge tone={assistantState === 'assistantVisible' ? 'success' : assistantState === 'needsFixes' ? 'warning' : 'neutral'} className="px-2.5 py-1">{t(`targetSkills.state.${assistantState}`)}</StatusBadge>
      </DataTableCell>
      <DataTableCell className="px-4 py-6 sm:px-6 lg:px-8">
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
      </DataTableCell>
      <DataTableCell className="hidden px-4 py-6 type-caption text-ui-text-muted sm:px-6 md:table-cell lg:px-8">
        {skill.bundleStats.fileCount} files, {summarizeBytes(skill.bundleStats.totalBytes)}
      </DataTableCell>
      <DataTableCell className="px-4 py-6 text-right sm:px-6 lg:px-8">
        {actionMenu}
      </DataTableCell>
    </DataTableRow>
  );
};

export const TargetSkillsInventory: React.FC<TargetSkillsInventoryProps> = ({ skills, canEditSkills, pendingToggleSkillId, onEditSkill, onDeleteSkill, onToggleSkill }) => {
  const { t } = useTranslation();
  const [skillSearch, setSkillSearch] = React.useState('');
  const [skillFilter, setSkillFilter] = React.useState<'all' | 'enabled' | 'disabled' | 'valid' | 'invalid'>('all');
  const filterOptions: Array<SelectOption<typeof skillFilter>> = [
    { value: 'all', label: t('targetSkills.filterAll') },
    { value: 'enabled', label: t('targetSkills.filterEnabled') },
    { value: 'disabled', label: t('targetSkills.filterDisabled') },
    { value: 'valid', label: t('targetSkills.filterValid') },
    { value: 'invalid', label: t('targetSkills.filterInvalid') }
  ];

  const summary = React.useMemo(
    () => ({
      total: skills.length,
      assistantVisible: skills.filter((skill) => skill.enabled && skill.validationStatus === 'valid').length,
      enabled: skills.filter((skill) => skill.enabled).length,
      valid: skills.filter((skill) => skill.validationStatus === 'valid').length,
      needsFixes: skills.filter((skill) => skill.validationStatus !== 'valid').length,
      files: skills.reduce((total, skill) => total + skill.bundleStats.fileCount, 0)
    }),
    [skills]
  );

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
      ]
        .join(' ')
        .toLowerCase();
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
  const hasActiveFilters = Boolean(skillSearch.trim()) || skillFilter !== 'all';

  return (
    <>
      <section data-target-skill-access-summary="true" className="mb-6 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-[minmax(15rem,1.35fr)_repeat(5,minmax(7rem,1fr))]">
          <div className="col-span-2 border-b border-ui-border px-5 py-3.5 sm:col-span-3 xl:col-span-1 xl:border-b-0 xl:border-r">
            <h2 className="type-row-title">{t('targetSkills.inventoryTitle')}</h2>
            <p className="type-caption mt-1 min-h-10 text-ui-text-muted">{t('targetSkills.inventoryBody')}</p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.skillsMetric')}</p>
            <p className="type-data mt-0.5">{summary.total}</p>
          </div>
          <div className="border-b border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.assistantVisibleSkills')}</p>
            <p className="type-data mt-0.5 inline-flex items-center gap-2">
              {summary.assistantVisible}
              <span className="h-2 w-2 rounded-full bg-status-success" />
            </p>
          </div>
          <div className="border-b border-r border-ui-border px-5 py-3.5 sm:border-r xl:border-b-0">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.enabledSkillsMetric')}</p>
            <p className="type-data mt-0.5">{summary.enabled}</p>
          </div>
          <div className="border-r border-ui-border px-5 py-3.5 sm:border-r">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.needsFixes')}</p>
            <p className="type-data mt-0.5 inline-flex items-center gap-2">
              {summary.needsFixes}
              <span className="h-2 w-2 rounded-full bg-status-warning" />
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('targetSkills.filesMetric')}</p>
            <p className="type-data mt-0.5">{summary.files}</p>
          </div>
        </div>
      </section>

      <section data-target-skill-list="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        {(skills.length > 0 || hasActiveFilters) && (
          <div className="grid gap-4 border-b border-ui-border px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1fr)_12rem_9.5rem] xl:items-center">
            <div className="relative min-w-0">
              <label htmlFor="target-skill-search" className="sr-only">
                {t('targetSkills.searchSkills')}
              </label>
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
              <TextInput
                id="target-skill-search"
                type="text"
                value={skillSearch}
                onChange={(event) => setSkillSearch(event.target.value)}
                placeholder={t('targetSkills.searchSkills')}
                className={targetSkillSearchInputClassName}
              />
            </div>
            <Select<typeof skillFilter> value={skillFilter} options={filterOptions} onChange={setSkillFilter} className="w-full" ariaLabel={t('targetSkills.filterSkills')} />
            <span className="type-label flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-ui-border bg-ui-bg px-3 text-ui-text-muted">
              {t('targetSkills.showingItems', {
                count: filteredSkills.length,
                total: skills.length
              })}
            </span>
          </div>
        )}
        <div className="min-w-0">
          {filteredSkills.length === 0 ? (
            <EmptyState
              embedded
              headingLevel={3}
              icon={hasActiveFilters ? <Search /> : <BookOpen />}
              title={t(hasActiveFilters ? 'targetSkills.noSkillMatches' : 'targetSkills.empty')}
              description={t(hasActiveFilters ? 'targetSkills.noSkillMatchesHelp' : 'targetSkills.emptyHelp')}
            />
          ) : (
            <DataTableFrame data-target-capability-table-frame="true" className="rounded-none border-0 shadow-none custom-scrollbar">
              <DataTable caption={t('targetSkills.tableLabel')} className="w-full table-fixed text-left" aria-label={t('targetSkills.tableLabel')}>
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[23%]" />
                  <col className="w-[11%]" />
                  <col className="w-[21%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <DataTableHeader collectionState={{ phase: 'ready', itemCount: filteredSkills.length }}>
                  <DataTableRow>
                    <DataTableHeaderCell>{t('targetSkills.skillColumn')}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t('targetSkills.assistantStateColumn')}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t('targetSkills.enabledColumn')}</DataTableHeaderCell>
                    <DataTableHeaderCell className="hidden md:table-cell">{t('targetSkills.filesColumn')}</DataTableHeaderCell>
                    <DataTableHeaderCell numeric>{t('targetSkills.actionsColumn')}</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredSkills.map((skill) => (
                    <TargetSkillRow
                      key={skill.id}
                      skill={skill}
                      canEditSkills={canEditSkills}
                      pendingToggleSkillId={pendingToggleSkillId}
                      onEditSkill={onEditSkill}
                      onDeleteSkill={onDeleteSkill}
                      onToggleSkill={onToggleSkill}
                    />
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableFrame>
          )}
        </div>
      </section>
    </>
  );
};
