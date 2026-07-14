import React from 'react';
import { ChevronDown, FilePlus2, FileText, Folder, FolderPlus, X } from 'lucide-react';
import {
  createSkillFilePath,
  createSkillFolderPath,
  sortDraftFiles,
  type SkillDraftFile,
  validateSkillFilePath,
  validateSkillFolderPath
} from '@/features/targets/admin/targetSkillsViewModel';

type FileAction = 'file' | 'folder';
type RenameTarget = { type: 'file' | 'folder'; path: string } | null;

interface FileTreeFolder {
  name: string;
  path: string;
  folders: FileTreeFolder[];
  files: SkillDraftFile[];
}

interface TargetSkillFileTreeProps {
  files: SkillDraftFile[];
  activeFilePath: string;
  canEditSkills: boolean;
  resetKey: string;
  onFilesChange: (files: SkillDraftFile[]) => void;
  onActiveFilePathChange: (path: string) => void;
}

function getFileLabel(path: string): string {
  return path.split('/').pop() || path;
}

function getParentPath(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

function joinPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

function validateTreeItemName(value: string, type: FileAction): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return type === 'file' ? 'Enter a file name.' : 'Enter a folder name.';
  if (trimmedValue.includes('/') || trimmedValue.includes('\\')) {
    return type === 'file'
      ? 'Enter a file name. Select a folder first to create files inside it.'
      : 'Create one folder at a time.';
  }
  return null;
}

function replacePathPrefix(path: string, fromPath: string, toPath: string): string {
  if (path === fromPath) return toPath;
  if (path.startsWith(`${fromPath}/`)) return `${toPath}${path.slice(fromPath.length)}`;
  return path;
}

function buildFileTree(files: SkillDraftFile[], draftFolders: string[] = []): FileTreeFolder {
  const root: FileTreeFolder = { name: '', path: '', folders: [], files: [] };
  const foldersByPath = new Map<string, FileTreeFolder>([['', root]]);

  const ensureFolder = (folderPath: string): FileTreeFolder => {
    let currentFolder = root;
    let currentPath = '';
    folderPath.split('/').filter(Boolean).forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let folder = foldersByPath.get(currentPath);
      if (!folder) {
        folder = { name: part, path: currentPath, folders: [], files: [] };
        currentFolder.folders.push(folder);
        foldersByPath.set(currentPath, folder);
      }
      currentFolder = folder;
    });
    return currentFolder;
  };

  draftFolders.forEach(ensureFolder);

  sortDraftFiles(files.filter((file) => file.path !== 'SKILL.md')).forEach((file) => {
    const parts = file.path.split('/');
    if (parts.length === 1) {
      root.files.push(file);
      return;
    }

    const currentFolder = ensureFolder(parts.slice(0, -1).join('/'));
    currentFolder.files.push(file);
  });

  const sortFolder = (folder: FileTreeFolder) => {
    folder.folders.sort((left, right) => left.name.localeCompare(right.name));
    folder.files = sortDraftFiles(folder.files);
    folder.folders.forEach(sortFolder);
  };
  sortFolder(root);

  return root;
}

export const TargetSkillFileTree: React.FC<TargetSkillFileTreeProps> = ({
  files,
  activeFilePath,
  canEditSkills,
  resetKey,
  onFilesChange,
  onActiveFilePathChange
}) => {
  const [fileAction, setFileAction] = React.useState<FileAction | null>(null);
  const [fileActionValue, setFileActionValue] = React.useState('');
  const [fileActionError, setFileActionError] = React.useState<string | null>(null);
  const [selectedFolderPath, setSelectedFolderPath] = React.useState('');
  const [draftFolders, setDraftFolders] = React.useState<string[]>([]);
  const [collapsedFolderPaths, setCollapsedFolderPaths] = React.useState<Set<string>>(() => new Set());
  const [renameTarget, setRenameTarget] = React.useState<RenameTarget>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [renameError, setRenameError] = React.useState<string | null>(null);
  const fileActionInputRef = React.useRef<HTMLInputElement | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);
  const suppressFileActionBlurRef = React.useRef(false);
  const suppressRenameBlurRef = React.useRef(false);
  const fileTree = React.useMemo(() => buildFileTree(files, draftFolders), [draftFolders, files]);

  const cancelFileAction = () => {
    suppressFileActionBlurRef.current = true;
    setFileAction(null);
    setFileActionValue('');
    setFileActionError(null);
  };

  const cancelRename = () => {
    suppressRenameBlurRef.current = true;
    setRenameTarget(null);
    setRenameValue('');
    setRenameError(null);
  };

  React.useEffect(() => {
    setDraftFolders([]);
    setCollapsedFolderPaths(new Set());
    setSelectedFolderPath('');
    cancelFileAction();
    cancelRename();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  React.useEffect(() => {
    if (!fileAction) return;
    fileActionInputRef.current?.focus();
    fileActionInputRef.current?.select();
  }, [fileAction]);

  React.useEffect(() => {
    if (!renameTarget) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renameTarget]);

  const openFileAction = (action: FileAction) => {
    if (!canEditSkills) return;
    cancelRename();
    if (selectedFolderPath) {
      setCollapsedFolderPaths((current) => {
        if (!current.has(selectedFolderPath)) return current;
        const next = new Set(current);
        next.delete(selectedFolderPath);
        return next;
      });
    }
    setFileAction(action);
    setFileActionValue('');
    setFileActionError(null);
  };

  const startRename = (target: Exclude<RenameTarget, null>) => {
    if (!canEditSkills || target.path === 'SKILL.md') return;
    cancelFileAction();
    setRenameTarget(target);
    setRenameValue(getFileLabel(target.path));
    setRenameError(null);
  };

  const createPathInSelectedFolder = (action: FileAction, value: string): string => {
    const createdPath = action === 'file' ? createSkillFilePath(value) : createSkillFolderPath(value);
    return selectedFolderPath ? `${selectedFolderPath}/${createdPath}` : createdPath;
  };

  const createRenamedPath = (target: Exclude<RenameTarget, null>, value: string): string => {
    const parentPath = getParentPath(target.path);
    const renamed = target.type === 'file' ? createSkillFilePath(value) : createSkillFolderPath(value);
    return joinPath(parentPath, renamed);
  };

  const addDraftFolder = (folderPath: string) => {
    setDraftFolders((current) => current.includes(folderPath) ? current : [...current, folderPath].sort((left, right) => left.localeCompare(right)));
  };

  const toggleFolderCollapsed = (path: string) => {
    setCollapsedFolderPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const submitFileAction = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!fileAction) return;
    if (!fileActionValue.trim()) {
      cancelFileAction();
      return;
    }
    const itemNameError = validateTreeItemName(fileActionValue, fileAction);
    if (itemNameError) {
      setFileActionError(itemNameError);
      return;
    }
    const nextPath = createPathInSelectedFolder(fileAction, fileActionValue.trim());
    const validationError = fileAction === 'file'
      ? validateSkillFilePath(nextPath, files)
      : validateSkillFolderPath(nextPath, files, draftFolders);
    if (validationError) {
      setFileActionError(validationError);
      return;
    }
    if (fileAction === 'folder') {
      addDraftFolder(nextPath);
      setSelectedFolderPath(nextPath);
      setCollapsedFolderPaths((current) => {
        if (!current.has(nextPath)) return current;
        const next = new Set(current);
        next.delete(nextPath);
        return next;
      });
      cancelFileAction();
      return;
    }
    onFilesChange(sortDraftFiles([...files, { path: nextPath, content: '' }]));
    onActiveFilePathChange(nextPath);
    cancelFileAction();
  };

  const submitRename = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!renameTarget) return;
    if (!renameValue.trim()) {
      cancelRename();
      return;
    }
    const itemNameError = validateTreeItemName(renameValue, renameTarget.type);
    if (itemNameError) {
      setRenameError(itemNameError);
      return;
    }
    const nextPath = createRenamedPath(renameTarget, renameValue.trim());
    if (nextPath === renameTarget.path) {
      cancelRename();
      return;
    }

    const validationError = renameTarget.type === 'file'
      ? validateSkillFilePath(nextPath, files, renameTarget.path)
      : validateSkillFolderPath(nextPath, files, draftFolders.filter((folderPath) => folderPath !== renameTarget.path && !folderPath.startsWith(`${renameTarget.path}/`)));
    if (validationError) {
      setRenameError(validationError);
      return;
    }

    if (renameTarget.type === 'file') {
      onFilesChange(sortDraftFiles(files.map((file) => file.path === renameTarget.path ? { ...file, path: nextPath } : file)));
      if (activeFilePath === renameTarget.path) onActiveFilePathChange(nextPath);
      cancelRename();
      return;
    }

    const oldFolderPath = renameTarget.path;
    onFilesChange(sortDraftFiles(files.map((file) => file.path.startsWith(`${oldFolderPath}/`) ? { ...file, path: replacePathPrefix(file.path, oldFolderPath, nextPath) } : file)));
    setDraftFolders((current) => {
      const nextFolders = current.map((folderPath) => replacePathPrefix(folderPath, oldFolderPath, nextPath));
      nextFolders.push(nextPath);
      return Array.from(new Set(nextFolders)).sort((left, right) => left.localeCompare(right));
    });
    setCollapsedFolderPaths((current) => {
      const next = new Set<string>();
      current.forEach((folderPath) => {
        next.add(replacePathPrefix(folderPath, oldFolderPath, nextPath));
      });
      return next;
    });
    if (selectedFolderPath === oldFolderPath || selectedFolderPath.startsWith(`${oldFolderPath}/`)) {
      setSelectedFolderPath(replacePathPrefix(selectedFolderPath, oldFolderPath, nextPath));
    }
    if (activeFilePath.startsWith(`${oldFolderPath}/`)) {
      onActiveFilePathChange(replacePathPrefix(activeFilePath, oldFolderPath, nextPath));
    }
    cancelRename();
  };

  const renderRenameRow = (target: Exclude<RenameTarget, null>, depth: number) => {
    const Icon = target.type === 'folder' ? Folder : FileText;
    return (
      <form
        onSubmit={submitRename}
        className="rounded-md bg-accent-soft/10 px-2 py-2"
        style={{ marginLeft: `${depth * 1.1}rem` }}
        aria-label={target.type === 'folder' ? 'Rename folder' : 'Rename file'}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(event) => {
              setRenameValue(event.target.value);
              setRenameError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelRename();
              }
            }}
            onBlur={() => {
              if (suppressRenameBlurRef.current) {
                suppressRenameBlurRef.current = false;
                return;
              }
              submitRename();
            }}
            className="min-w-0 flex-1 rounded border border-accent/30 bg-ui-surface px-2 py-1.5 text-xs text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            aria-label={target.type === 'folder' ? 'Folder name' : 'File name'}
          />
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              suppressRenameBlurRef.current = true;
            }}
            onClick={cancelRename}
            className="control-target rounded p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text"
            title="Cancel rename"
            aria-label="Cancel rename"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {renameError && <p className="type-caption mt-1 pl-5 text-status-danger-text">{renameError}</p>}
      </form>
    );
  };

  const renderFileButton = (file: SkillDraftFile, className = '', depth = 0) => (
    renameTarget?.type === 'file' && renameTarget.path === file.path ? renderRenameRow(renameTarget, depth) :
    <button
      key={file.path}
      type="button"
      onClick={() => {
        setSelectedFolderPath('');
        onActiveFilePathChange(file.path);
      }}
      onDoubleClick={() => startRename({ type: 'file', path: file.path })}
      className={`control-target relative flex w-full min-w-0 items-center gap-2 rounded-md py-1.5 pr-2 text-left text-xs transition-colors ${
        activeFilePath === file.path
          ? 'bg-accent-soft/20 text-accent-strong'
          : 'text-ui-text-muted hover:bg-ui-surface hover:text-ui-text'
      } ${className}`}
      style={{ paddingLeft: `${0.625 + depth * 1.1}rem` }}
      title={file.path}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{getFileLabel(file.path)}</span>
    </button>
  );

  const renderInlineCreateRow = (depth = 0) => {
    if (!fileAction) return null;
    const Icon = fileAction === 'folder' ? Folder : FileText;
    const createPreviewPath = createPathInSelectedFolder(fileAction, fileActionValue);
    return (
      <form
        onSubmit={submitFileAction}
        className="rounded-md bg-accent-soft/10 px-2 py-2"
        style={{ marginLeft: `${depth * 1.1}rem` }}
        aria-label={fileAction === 'folder' ? 'Create folder' : 'Create file'}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
          <input
            ref={fileActionInputRef}
            value={fileActionValue}
            onChange={(event) => {
              setFileActionValue(event.target.value);
              setFileActionError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelFileAction();
              }
            }}
            onBlur={() => {
              if (suppressFileActionBlurRef.current) {
                suppressFileActionBlurRef.current = false;
                return;
              }
              submitFileAction();
            }}
            className="min-w-0 flex-1 rounded border border-accent/30 bg-ui-surface px-2 py-1.5 text-xs text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            aria-label={fileAction === 'folder' ? 'Folder path' : 'File path'}
          />
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              suppressFileActionBlurRef.current = true;
            }}
            onClick={cancelFileAction}
            className="control-target rounded p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-ui-text"
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {fileAction === 'folder' && fileActionValue.trim() && (
          <p className="type-caption mt-1 pl-5 text-ui-text-muted">
            Creates folder {createPreviewPath}.
          </p>
        )}
        {fileActionError && <p className="type-caption mt-1 pl-5 text-status-danger-text">{fileActionError}</p>}
      </form>
    );
  };

  const renderFolder = (folder: FileTreeFolder, depth: number): React.ReactNode => {
    const collapsed = collapsedFolderPaths.has(folder.path);
    return (
      <div key={folder.path} className="space-y-1">
        {renameTarget?.type === 'folder' && renameTarget.path === folder.path ? renderRenameRow(renameTarget, depth) : (
          <div
            className={`flex w-full min-w-0 items-center rounded-md pr-2 text-left text-xs font-semibold transition-colors ${
              selectedFolderPath === folder.path
                ? 'bg-accent-soft/20 text-accent-strong'
                : 'text-ui-text-muted hover:bg-ui-surface hover:text-ui-text'
            }`}
            style={{ paddingLeft: `${0.375 + depth * 1.1}rem` }}
            title={folder.path}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleFolderCollapsed(folder.path);
              }}
              className="control-target rounded p-1 text-current transition-colors hover:bg-ui-surface"
              aria-label={collapsed ? `Expand ${folder.name}` : `Collapse ${folder.name}`}
            >
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedFolderPath(folder.path)}
              onDoubleClick={() => startRename({ type: 'folder', path: folder.path })}
              className="control-target flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
            >
              <Folder className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{folder.name}</span>
            </button>
          </div>
        )}
        {!collapsed && fileAction && selectedFolderPath === folder.path && renderInlineCreateRow(depth + 1)}
        {!collapsed && folder.folders.map((childFolder) => renderFolder(childFolder, depth + 1))}
        {!collapsed && folder.files.map((file) => renderFileButton(file, '', depth + 1))}
      </div>
    );
  };

  return (
    <aside className="flex min-h-0 flex-col border-b border-ui-border bg-ui-bg lg:border-b-0 lg:border-r">
      <div className="border-b border-ui-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="type-row-title">Files</h4>
          <div className="flex gap-1">
            <button type="button" className="control-target rounded-md p-1.5 text-ui-text-muted hover:bg-ui-surface hover:text-ui-text disabled:opacity-50" disabled={!canEditSkills} onClick={() => openFileAction('file')} title="Add file" aria-label="Add file">
              <FilePlus2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="control-target rounded-md p-1.5 text-ui-text-muted hover:bg-ui-surface hover:text-ui-text disabled:opacity-50" disabled={!canEditSkills} onClick={() => openFileAction('folder')} title="Add folder" aria-label="Add folder">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {renderFileButton({ path: 'SKILL.md', content: files.find((file) => file.path === 'SKILL.md')?.content || '' })}
        {fileAction && !selectedFolderPath && renderInlineCreateRow()}
        {fileTree.files.length === 0 && fileTree.folders.length === 0 ? (
          <p className="type-caption ml-7 rounded-md px-2 py-1.5 text-ui-text-muted">
            No supporting files.
          </p>
        ) : (
          <div className="space-y-1">
            {fileTree.folders.map((folder) => renderFolder(folder, 0))}
            {fileTree.files.map((file) => renderFileButton(file))}
          </div>
        )}
      </div>
    </aside>
  );
};
