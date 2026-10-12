"use client";

import {
  ChevronDown,
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { usePlayground } from "@/context/playground-context";
import {
  type FsNode,
  findNode,
  getChildren,
  MAX_NODE_NAME_LENGTH,
  validateNodeName,
} from "@/lib/file-tree";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";

type Draft =
  | { kind: "create"; type: "file" | "folder"; parentId: string | null }
  | { kind: "rename"; id: string };

const BASE_PADDING_PX = 8;
const INDENT_PX = 12;

interface TreeContext {
  nodes: readonly FsNode[];
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  activeFileId: string | null;
  draft: Draft | null;
  onSelect: (node: FsNode) => void;
  onStartRename: (node: FsNode) => void;
  onRequestDelete: (node: FsNode) => void;
  onCommitCreate: (
    parentId: string | null,
    type: "file" | "folder",
    name: string,
  ) => void;
  onCommitRename: (node: FsNode, name: string) => void;
  onCancelDraft: () => void;
}

interface NameInputProps {
  initialValue: string;
  depth: number;
  icon: ReactNode;
  validate: (name: string) => string | null;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

/** Inline name editor shown in the tree while creating or renaming (like VS Code). */
function NameInput({
  initialValue,
  depth,
  icon,
  validate,
  onCommit,
  onCancel,
}: NameInputProps) {
  const [value, setValue] = useState(initialValue);
  const [attempted, setAttempted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Enter and blur can both fire for one edit; only the first may win.
  const settledRef = useRef(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Rename selects the base name only, so the extension survives a quick edit.
    const dot = initialValue.lastIndexOf(".");
    input.setSelectionRange(0, dot > 0 ? dot : initialValue.length);
  }, [initialValue]);

  const isEmpty = value.trim().length === 0;
  const error = isEmpty && !attempted ? null : validate(value);

  function submit() {
    if (settledRef.current) return;
    if (validate(value) !== null) {
      setAttempted(true);
      return;
    }
    settledRef.current = true;
    onCommit(value.trim());
  }

  function cancel() {
    if (settledRef.current) return;
    settledRef.current = true;
    onCancel();
  }

  return (
    <div>
      <div
        className="flex h-6 items-center gap-1 pr-2"
        style={{ paddingLeft: BASE_PADDING_PX + depth * INDENT_PX }}
      >
        <span className="size-4 shrink-0" />
        {icon}
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          onBlur={() => {
            // Clicking away keeps a valid, changed name; anything else is discarded.
            if (!isEmpty && value.trim() !== initialValue && validate(value) === null)
              submit();
            else cancel();
          }}
          maxLength={MAX_NODE_NAME_LENGTH}
          spellCheck={false}
          autoComplete="off"
          aria-label="File or folder name"
          aria-invalid={error !== null}
          className={cn(
            "h-5 flex-1 rounded-sm px-1 text-xs shadow-none",
            error !== null && "border-destructive focus-visible:border-destructive",
          )}
        />
      </div>
      {error !== null && (
        <p
          role="alert"
          className="mr-2 mb-1 rounded-sm bg-destructive/15 px-2 py-1 text-[11px] text-destructive"
          style={{ marginLeft: BASE_PADDING_PX + depth * INDENT_PX + 20 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  tree,
}: {
  node: FsNode;
  depth: number;
  tree: TreeContext;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = isFolder && tree.expanded.has(node.id);
  const isRenaming = tree.draft?.kind === "rename" && tree.draft.id === node.id;
  const isActive = node.id === tree.activeFileId;
  const isSelected = node.id === tree.selectedId;

  if (isRenaming) {
    return (
      <NameInput
        initialValue={node.name}
        depth={depth}
        icon={
          isFolder ? (
            <Folder className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileIcon name={node.name} />
          )
        }
        validate={(name) => validateNodeName(tree.nodes, node.parentId, name, node.id)}
        onCommit={(name) => tree.onCommitRename(node, name)}
        onCancel={tree.onCancelDraft}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "group relative flex h-6 items-center text-xs",
          isActive
            ? "bg-accent text-foreground"
            : isSelected
              ? "bg-accent/60 text-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <button
          type="button"
          role="treeitem"
          aria-selected={isActive || isSelected}
          aria-expanded={isFolder ? isExpanded : undefined}
          onClick={() => tree.onSelect(node)}
          className="flex h-full min-w-0 flex-1 items-center gap-1 pr-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
          style={{ paddingLeft: BASE_PADDING_PX + depth * INDENT_PX }}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Folder className="size-4 shrink-0 text-muted-foreground" />
              )}
            </>
          ) : (
            <>
              <span className="size-4 shrink-0" />
              <FileIcon name={node.name} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>

        <div className="absolute inset-y-0 right-1 hidden items-center gap-0.5 bg-inherit pl-1 group-focus-within:flex group-hover:flex">
          <button
            type="button"
            title="Rename (F2)"
            aria-label={`Rename ${node.name}`}
            onClick={() => tree.onStartRename(node)}
            className="flex size-5 items-center justify-center rounded-sm hover:bg-secondary"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            title="Delete (Del)"
            aria-label={`Delete ${node.name}`}
            onClick={() => tree.onRequestDelete(node)}
            className="flex size-5 items-center justify-center rounded-sm hover:bg-secondary hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
      {isFolder && isExpanded && (
        <TreeBranch parentId={node.id} depth={depth + 1} tree={tree} />
      )}
    </>
  );
}

function TreeBranch({
  parentId,
  depth,
  tree,
}: {
  parentId: string | null;
  depth: number;
  tree: TreeContext;
}) {
  const children = getChildren(tree.nodes, parentId);
  const creating =
    tree.draft?.kind === "create" && tree.draft.parentId === parentId ? tree.draft : null;

  return (
    <>
      {creating && (
        <NameInput
          initialValue=""
          depth={depth}
          icon={
            creating.type === "folder" ? (
              <Folder className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <File className="size-4 shrink-0 text-muted-foreground" />
            )
          }
          validate={(name) => validateNodeName(tree.nodes, parentId, name)}
          onCommit={(name) => tree.onCommitCreate(parentId, creating.type, name)}
          onCancel={tree.onCancelDraft}
        />
      )}
      {children.map((node) => (
        <TreeRow key={node.id} node={node} depth={depth} tree={tree} />
      ))}
    </>
  );
}

interface FileExplorerProps {
  /** Called after a file was opened or created, e.g. so mobile can jump to the editor. */
  onOpenFile?: () => void;
}

export function FileExplorer({ onOpenFile }: FileExplorerProps) {
  const { state, actions } = usePlayground();
  const { nodes, activeFileId } = state;

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FsNode | null>(null);

  function expand(id: string) {
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** New items go into the selected folder, next to the selected file, or at the root. */
  function startCreate(type: "file" | "folder") {
    const selected = findNode(nodes, selectedId);
    const parentId = selected
      ? selected.type === "folder"
        ? selected.id
        : selected.parentId
      : null;
    if (parentId) expand(parentId);
    setDraft({ kind: "create", type, parentId });
  }

  const tree: TreeContext = {
    nodes,
    expanded,
    selectedId,
    activeFileId,
    draft,
    onSelect: (node) => {
      setSelectedId(node.id);
      if (node.type === "folder") {
        toggle(node.id);
        return;
      }
      actions.openFile(node.id);
      onOpenFile?.();
    },
    onStartRename: (node) => {
      setSelectedId(node.id);
      setDraft({ kind: "rename", id: node.id });
    },
    onRequestDelete: (node) => setDeleteTarget(node),
    onCommitCreate: (parentId, type, name) => {
      if (type === "file") {
        actions.createFile(parentId, name);
        onOpenFile?.();
      } else {
        actions.createFolder(parentId, name);
      }
      setDraft(null);
    },
    onCommitRename: (node, name) => {
      if (name !== node.name) actions.renameNode(node.id, name);
      setDraft(null);
    },
    onCancelDraft: () => setDraft(null),
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement) return;
    const node = findNode(nodes, selectedId);
    if (!node) return;
    if (event.key === "F2") {
      event.preventDefault();
      tree.onStartRename(node);
    } else if (event.key === "Delete") {
      event.preventDefault();
      setDeleteTarget(node);
    }
  }

  function handleBackgroundClick(event: MouseEvent<HTMLDivElement>) {
    // Clicking the empty area below the rows deselects, so "New File" targets the root again.
    if (event.target === event.currentTarget) setSelectedId(null);
  }

  const isEmpty = nodes.length === 0 && draft === null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-9 shrink-0 items-center justify-between pr-2 pl-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Files
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title="New File"
            aria-label="New File"
            onClick={() => startCreate("file")}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <FilePlus className="size-3.5" />
          </button>
          <button
            type="button"
            title="New Folder"
            aria-label="New Folder"
            onClick={() => startCreate("folder")}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>

      <div
        role="tree"
        aria-label="Project files"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={handleBackgroundClick}
        className="min-h-0 flex-1 overflow-y-auto pb-4 outline-none"
      >
        <TreeBranch parentId={null} depth={0} tree={tree} />
        {isEmpty && (
          <p className="px-4 pt-2 text-xs text-muted-foreground">
            No files yet. Use the buttons above to create a file or folder.
          </p>
        )}
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "folder"
                ? "This folder and everything inside it will be deleted."
                : "This file will be deleted."}{" "}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) actions.deleteNode(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
