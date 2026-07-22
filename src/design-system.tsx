import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { Check, Clock, Moon, MoreHorizontal, Plus, Rocket, Sun, Trash2 } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CollectionState } from '@/components/common/CollectionState';
import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@/components/common/DiscoveryFilterBar';
import { EmptyState } from '@/components/common/EmptyState';
import { FieldValidationMessage } from '@/components/common/FieldValidationMessage';
import { FieldLabel, HelpText, MenuItem, MenuTrigger, Radio, Switch } from '@/components/common/FormControls';
import { InlineAlert } from '@/components/common/InlineAlert';
import { DialogFrame, DrawerFrame } from '@/components/common/OverlayFrames';
import { DataSurface, PageBackLink, PageHeader, PageSection, PageShell, TableToolbar } from '@/components/common/PageComposition';
import { DataTable, DataTableFrame, DataTableHeaderCell, DataTableStateRow } from '@/components/common/DataTable';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import '@/fonts';
import {
  CloseButton,
  FilterToggleGroup,
  SegmentedTabs,
  TextInput,
  type CompactControlItem
} from '@/components/common/ComponentVocabulary';
import '@/styles.css';

type CatalogTab = 'overview' | 'runs';
type CatalogFilter = 'all' | 'attention';
type CatalogSourceFilter = 'all' | 'registry' | 'community';
type CatalogCompatibilityFilter = 'all' | 'compatible' | 'incompatible';

const catalogTabs: Array<CompactControlItem<CatalogTab>> = [
  { value: 'overview', label: 'Overview' },
  { value: 'runs', label: 'Runs', count: 4 }
];

const catalogFilters: Array<CompactControlItem<CatalogFilter>> = [
  { value: 'all', label: 'All', count: 12 },
  { value: 'attention', label: 'Needs attention', count: 2 }
];

const Catalog = () => {
  const [dark, setDark] = React.useState(false);
  const [checked, setChecked] = React.useState(true);
  const [selected, setSelected] = React.useState('all');
  const [catalogTab, setCatalogTab] = React.useState<CatalogTab>('overview');
  const [catalogFilter, setCatalogFilter] = React.useState<CatalogFilter>('all');
  const [searchOnlyQuery, setSearchOnlyQuery] = React.useState('cluster');
  const [singleFilterQuery, setSingleFilterQuery] = React.useState('');
  const [singleFilterStatus, setSingleFilterStatus] = React.useState<CatalogFilter>('attention');
  const [multiFilterQuery, setMultiFilterQuery] = React.useState('missing');
  const [multiFilterSource, setMultiFilterSource] = React.useState<CatalogSourceFilter>('community');
  const [multiFilterCompatibility, setMultiFilterCompatibility] = React.useState<CatalogCompatibilityFilter>('incompatible');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const multiFilterActive = Boolean(multiFilterQuery.trim()) || multiFilterSource !== 'all' || multiFilterCompatibility !== 'all';

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <PageShell className="min-h-screen overflow-visible" width="content">
      <PageBackLink href="/">Back to console</PageBackLink>
      <PageHeader
        context="Development catalog"
        title="Operator’s ledger"
        description="Canonical route composition, controls, states, and overlay anatomy. This entrypoint is served by Vite in development and is not part of the production app router."
        actions={
          <Button variant="secondary" onClick={() => setDark((value) => !value)} data-catalog-theme-toggle="true">
            {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            {dark ? 'Light theme' : 'Dark theme'}
          </Button>
        }
      />

      <PageSection title="Action hierarchy" description="Orange is reserved for workflow launch or activation.">
        <div className="flex flex-wrap gap-3 rounded-lg border border-ui-border bg-ui-surface p-surface">
          <Button variant="primary"><Plus className="h-4 w-4" />Create</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="icon" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
          <Button variant="danger"><Trash2 className="h-4 w-4" />Delete</Button>
          <Button variant="activation"><Rocket className="h-4 w-4" />Launch workflow</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" disabled aria-busy="true">Saving...</Button>
        </div>
      </PageSection>

      <PageSection title="Lifecycle actions" description="Standing surfaces stay neutral; emphasis belongs to the action and active confirmation.">
        <DangerZone>
          <DangerZoneRow
            id="catalog-leave-title"
            title="Leave workspace"
            description="Remove your access while keeping shared resources available to remaining members."
            action={<Button variant="secondary" className="w-full">Leave workspace</Button>}
          />
          <DangerZoneRow
            id="catalog-delete-title"
            title="Delete workspace"
            description="Permanently remove this workspace and its saved operational context."
            tone="danger"
            action={<Button variant="danger" className="w-full"><Trash2 className="h-4 w-4" />Delete workspace</Button>}
          />
        </DangerZone>
      </PageSection>

      <PageSection title="Tabs, filters, and compact controls" description="Shared state controls keep keyboard behavior, pressed state, and target sizing consistent.">
        <div className="space-y-5 rounded-lg border border-ui-border bg-ui-surface p-surface">
          <div>
            <SegmentedTabs<CatalogTab>
              activeValue={catalogTab}
              ariaLabel="Catalog section"
              idBase="catalog-section"
              items={catalogTabs}
              onValueChange={setCatalogTab}
            />
            <div
              id={`catalog-section-${catalogTab}-panel`}
              role="tabpanel"
              aria-labelledby={`catalog-section-${catalogTab}-tab`}
              className="type-body px-3 py-4 text-ui-text-muted"
            >
              {catalogTab === 'overview' ? 'Overview content renders immediately.' : 'Run content renders immediately.'}
            </div>
          </div>
          <FilterToggleGroup<CatalogFilter>
            activeValue={catalogFilter}
            ariaLabel="Catalog status filter"
            items={catalogFilters}
            onValueChange={setCatalogFilter}
          />
          <div className="flex flex-wrap items-center gap-3" data-catalog-control-sizes="true">
            <Button size="md" data-catalog-control="default">Default action</Button>
            <Button size="sm" data-catalog-control="compact">Compact action</Button>
            <Button variant="icon" size="icon" aria-label="Catalog icon action" data-catalog-control="icon"><MoreHorizontal className="h-4 w-4" /></Button>
            <CloseButton aria-label="Catalog close action" data-catalog-control="close" />
            <button type="button" className="control-target rounded-md border border-ui-border px-3 type-ui" data-catalog-control="raw">Local action</button>
          </div>
        </div>
      </PageSection>

      <PageSection title="Collection discovery" description="Top-level catalogs use one responsive search, typed-filter, result, and recovery pattern.">
        <div className="space-y-5">
          <div data-catalog-discovery="search-only">
            <DiscoveryFilterBar
              idPrefix="catalog-search-only"
              query={searchOnlyQuery}
              queryLabel="Search workflows"
              queryPlaceholder="Search workflows"
              queryClearLabel="Clear search"
              resultSummary={searchOnlyQuery ? '3 of 12 workflows' : '12 workflows'}
              filters={[]}
              clearAllLabel="Clear all"
              onQueryChange={setSearchOnlyQuery}
              onClearAll={() => setSearchOnlyQuery('')}
            />
          </div>
          <div data-catalog-discovery="single-filter">
            <DiscoveryFilterBar
              idPrefix="catalog-single-filter"
              query={singleFilterQuery}
              queryLabel="Search agents"
              queryPlaceholder="Search agents"
              queryClearLabel="Clear search"
              resultSummary={singleFilterStatus === 'attention' ? '2 of 12 agents' : '12 agents'}
              filters={[createDiscoveryFilterGroup<CatalogFilter>({
                id: 'status',
                value: singleFilterStatus,
                defaultValue: 'all',
                label: 'Agent status',
                options: [
                  { value: 'all', label: 'All', count: 12 },
                  { value: 'attention', label: 'Needs attention', count: 2 }
                ],
                onChange: setSingleFilterStatus
              })]}
              clearAllLabel="Clear all"
              onQueryChange={setSingleFilterQuery}
              onClearAll={() => { setSingleFilterQuery(''); setSingleFilterStatus('all'); }}
            />
          </div>
          <div data-catalog-discovery="multi-filter">
            <DiscoveryFilterBar
              idPrefix="catalog-multi-filter"
              query={multiFilterQuery}
              queryLabel="Search MCP catalog"
              queryPlaceholder="Search MCP servers"
              queryClearLabel="Clear search"
              resultSummary={multiFilterActive ? '0 of 12 servers' : '12 servers'}
              filters={[
                createDiscoveryFilterGroup<CatalogSourceFilter>({
                  id: 'source',
                  value: multiFilterSource,
                  defaultValue: 'all',
                  label: 'Catalog source',
                  options: [
                    { value: 'all', label: 'All sources', count: 12 },
                    { value: 'registry', label: 'Registry', count: 8 },
                    { value: 'community', label: 'Community', count: 4 }
                  ],
                  onChange: setMultiFilterSource
                }),
                createDiscoveryFilterGroup<CatalogCompatibilityFilter>({
                  id: 'compatibility',
                  value: multiFilterCompatibility,
                  defaultValue: 'all',
                  label: 'Compatibility',
                  options: [
                    { value: 'all', label: 'All compatibility', count: 12 },
                    { value: 'compatible', label: 'Compatible', count: 10 },
                    { value: 'incompatible', label: 'Incompatible', count: 2 }
                  ],
                  onChange: setMultiFilterCompatibility
                })
              ]}
              clearAllLabel="Clear all"
              onQueryChange={setMultiFilterQuery}
              onClearAll={() => { setMultiFilterQuery(''); setMultiFilterSource('all'); setMultiFilterCompatibility('all'); }}
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Fields and selection controls">
        <div className="grid gap-5 rounded-lg border border-ui-border bg-ui-surface p-surface md:grid-cols-2">
          <div>
            <FieldLabel htmlFor="catalog-name">Field label</FieldLabel>
            <TextInput id="catalog-name" className="mt-2" defaultValue="Production workspace" />
            <HelpText>Stable 44px controls, token-driven focus and validation.</HelpText>
          </div>
          <div>
            <FieldLabel htmlFor="catalog-invalid">Validation</FieldLabel>
            <TextInput id="catalog-invalid" aria-invalid="true" className="mt-2 border-status-danger/45 bg-status-danger-soft focus:border-status-danger focus:ring-status-danger/20" defaultValue="Invalid value" />
            <FieldValidationMessage id="catalog-invalid-message" message="Use a unique workspace name." />
          </div>
          <div>
            <FieldLabel>Shared select</FieldLabel>
            <Select<string> className="mt-2" value={selected} onChange={setSelected} ariaLabel="Inventory filter" options={[{ value: 'all', label: 'All targets' }, { value: 'healthy', label: 'Healthy' }, { value: 'attention', label: 'Needs attention' }]} />
          </div>
          <label className="flex min-h-11 items-center gap-3"><Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span className="type-ui">Checkbox</span></label>
          <label className="flex min-h-11 items-center gap-3"><Radio name="catalog-radio" defaultChecked /><span className="type-ui">Radio</span></label>
          <div className="flex min-h-11 items-center justify-between gap-3"><span className="type-ui">Switch</span><Switch checked={checked} onCheckedChange={setChecked} label="Enable catalog example" /></div>
          <div className="flex items-center gap-2"><MenuTrigger aria-label="Open example menu"><MoreHorizontal className="h-4 w-4" /></MenuTrigger><div role="menu" className="w-48 rounded-md border border-ui-border bg-ui-surface p-1 shadow-lg"><MenuItem selected><Check className="h-4 w-4" />Selected item</MenuItem><MenuItem destructive><Trash2 className="h-4 w-4" />Delete item</MenuItem></div></div>
        </div>
      </PageSection>

      <PageSection title="Status and messages">
        <div className="grid gap-3 md:grid-cols-2">
          <InlineAlert tone="neutral">Inspect-only access keeps actions disabled.</InlineAlert>
          <InlineAlert tone="warning">This workflow can write to live systems.</InlineAlert>
          <InlineAlert tone="danger">The control plane could not load this surface.</InlineAlert>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ui-border bg-ui-surface p-4"><StatusBadge tone="success">Healthy</StatusBadge><StatusBadge tone="warning">Pending</StatusBadge><StatusBadge tone="danger">Failed</StatusBadge><StatusBadge tone="neutral">Paused</StatusBadge></div>
        </div>
      </PageSection>

      <PageSection title="Data surfaces">
        <div className="grid gap-4 xl:grid-cols-2">
          <DataSurface heading="Ready" count="12 targets" toolbar={<Button size="sm">Filter</Button>}><div className="p-surface type-body">Page code supplies data and semantic intent.</div></DataSurface>
          <DataSurface heading="Loading" state="loading" loading={<div className="space-y-2 p-surface" aria-label="Loading"><div className="h-10 rounded-md bg-ui-bg" /><div className="h-10 rounded-md bg-ui-bg" /></div>} />
          <DataSurface heading="Empty" state="empty" empty={<EmptyState embedded headingLevel={3} icon={<Clock />} title="No schedules yet" description="Create one to automate a governed workflow." />} />
          <DataSurface heading="Filtered empty" state="filtered-empty" filteredEmpty={<EmptyState embedded headingLevel={3} icon={<Clock />} title="No matching schedules" description="Clear the active filters to return to all schedules." />} />
          <DataSurface heading="Refreshing" state="refreshing" feedback={<InlineAlert tone="neutral">Refreshing while 12 targets remain visible.</InlineAlert>} statusAnnouncement="Target refresh started"><div className="p-surface type-body">Existing rows remain mounted and readable.</div></DataSurface>
          <DataSurface heading="Error" state="error" error={<div className="p-surface"><InlineAlert tone="danger">Could not load inventory.</InlineAlert></div>} />
        </div>
        <CollectionState phase="ready" itemCount={0} filtered loading={null} empty={null} filteredEmpty={<EmptyState embedded headingLevel={3} icon={<Clock />} title="No matching targets" description="Clear filters to restore the inventory." />} error={null} />
        <DataTableFrame className="mt-4">
          <DataTable caption="Collection table state example">
            <thead><tr><DataTableHeaderCell>Name</DataTableHeaderCell><DataTableHeaderCell numeric>Status</DataTableHeaderCell></tr></thead>
            <tbody><DataTableStateRow columns={2} phase="loading" itemCount={0} loading={<div className="p-surface type-body" role="status">Loading rows…</div>} empty={<EmptyState embedded headingLevel={3} icon={<Clock />} title="No rows" description="Rows will appear here when available." />} error={<InlineAlert tone="danger">Rows could not be loaded.</InlineAlert>} /></tbody>
          </DataTable>
        </DataTableFrame>
        <div className="mt-4 overflow-hidden rounded-lg border border-ui-border bg-ui-surface"><TableToolbar><span className="type-row-title">Table toolbar</span><span className="type-caption text-ui-text-muted">Dense rows use the canonical rhythm</span></TableToolbar><div className="divide-y divide-ui-border"><div className="px-surface py-row-y type-body">Cluster alpha</div><div className="px-surface py-row-y type-body">Cluster beta</div></div></div>
        <pre className="type-code mt-4 overflow-x-auto rounded-lg border border-code-text/10 bg-code-bg p-4 text-code-text" data-catalog-code-surface="true"><code>kubectl get pods --all-namespaces</code></pre>
      </PageSection>

      <PageSection title="Overlays" actions={<><Button onClick={() => setDialogOpen(true)}>Open dialog</Button><Button onClick={() => setDrawerOpen(true)}>Open drawer</Button></>}>
        <p className="type-body text-ui-text-muted">Both frames share close controls, focus containment, restoration, padding, and footer anatomy.</p>
      </PageSection>

      <DialogFrame open={dialogOpen} onClose={() => setDialogOpen(false)} titleId="catalog-dialog-title" title="Confirm change" description="Review the consequence before applying it." footer={<><Button variant="tertiary" onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setDialogOpen(false)}>Save</Button></>}><InlineAlert tone="warning">This change affects future workflow runs.</InlineAlert></DialogFrame>
      <DrawerFrame open={drawerOpen} onClose={() => setDrawerOpen(false)} titleId="catalog-drawer-title" title="Create schedule" description="Drawer anatomy remains stable at every width." footer={<><Button variant="tertiary" onClick={() => setDrawerOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setDrawerOpen(false)}>Create</Button></>}><FieldLabel htmlFor="catalog-schedule">Schedule name</FieldLabel><TextInput id="catalog-schedule" className="mt-2" /></DrawerFrame>
    </PageShell>
  );
};

const root = document.getElementById('design-system-root');
if (!root) throw new Error('Could not find the design system catalog root.');

ReactDOM.createRoot(root).render(<React.StrictMode><MotionConfig reducedMotion="user"><Catalog /></MotionConfig></React.StrictMode>);
