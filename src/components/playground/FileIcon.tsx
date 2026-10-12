import { Braces, FileCode, FileText } from "lucide-react";
import { type FileKind, getFileKind } from "@/lib/file-tree";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<FileKind, string> = {
  html: "text-html-accent",
  css: "text-css-accent",
  js: "text-js-accent",
  json: "text-js-accent",
  markdown: "text-muted-foreground",
  other: "text-muted-foreground",
};

/** Small coloured file-type icon used by the explorer and the editor tabs. */
export function FileIcon({ name, className }: { name: string; className?: string }) {
  const kind = getFileKind(name);
  const Icon =
    kind === "json"
      ? Braces
      : kind === "other" || kind === "markdown"
        ? FileText
        : FileCode;
  return (
    <Icon aria-hidden className={cn("size-4 shrink-0", KIND_COLOR[kind], className)} />
  );
}
