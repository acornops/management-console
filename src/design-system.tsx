import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { Check, Moon, MoreHorizontal, Plus, Rocket, Sun, Trash2 } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { FieldValidationMessage } from '@/components/common/FieldValidationMessage';
import { FieldLabel, HelpText, MenuItem, MenuTrigger, Radio, Switch } from '@/components/common/FormControls';
import { InlineAlert } from '@/components/common/InlineAlert';
import { DialogFrame, DrawerFrame } from '@/components/common/OverlayFrames';
import { DataSurface, PageHeader, PageSection, PageShell, TableToolbar } from '@/components/common/PageComposition';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <PageShell className="min-h-screen overflow-visible" width="content">
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
          <DataSurface heading="Empty" state="empty" empty={<div className="p-8 text-center"><div className="type-section-title">No schedules yet</div><p className="type-body mt-2 text-ui-text-muted">Create one to automate a governed workflow.</p></div>} />
          <DataSurface heading="Error" state="error" error={<div className="p-surface"><InlineAlert tone="danger">Could not load inventory.</InlineAlert></div>} />
        </div>
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
