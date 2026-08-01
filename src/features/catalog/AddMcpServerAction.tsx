import React from 'react';
import { ChevronDown, Link2, Plus, Search } from 'lucide-react';

import {
  ActionMenu,
  Button,
  getFloatingMenuPosition,
  MenuItem,
  MenuLink
} from '@acornops/ui';

export const getMcpMenuPosition = getFloatingMenuPosition;

interface AddMcpServerActionProps {
  browseHref: string;
  disabled?: boolean;
  onConnectByUrl: () => void;
  size?: React.ComponentProps<typeof Button>['size'];
}

export const AddMcpServerAction: React.FC<AddMcpServerActionProps> = ({ browseHref, disabled = false, onConnectByUrl, size = 'md' }) => (
  <ActionMenu
    label="Add MCP server"
    disabled={disabled}
    estimatedHeight={144}
    width={256}
    className="p-1.5"
    trigger={(
      <Button type="button" variant="secondary" size={size}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add MCP server
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </Button>
    )}
  >
    {(close) => (
      <>
        <MenuLink href={browseHref} className="min-h-11 items-start rounded-md py-2 sm:min-h-11">
          <Search className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span>
            <span className="block type-body type-emphasis">Browse registries</span>
            <span className="type-caption text-ui-text-muted">Install a pinned server from an approved source.</span>
          </span>
        </MenuLink>
        <MenuItem
          className="min-h-11 items-start rounded-md py-2 sm:min-h-11"
          onClick={() => {
            close();
            onConnectByUrl();
          }}
        >
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          <span>
            <span className="block type-body type-emphasis">Connect by URL</span>
            <span className="type-caption text-ui-text-muted">Use an HTTPS Streamable HTTP endpoint.</span>
          </span>
        </MenuItem>
      </>
    )}
  </ActionMenu>
);
