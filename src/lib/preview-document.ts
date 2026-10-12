import { type FsNode, getChildren, getExtension, getNodePath } from "@/lib/file-tree";

const CONSOLE_BRIDGE = `
(function () {
  function serialize(arg) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack || (arg.name + ": " + arg.message);
    try {
      return JSON.stringify(arg, null, 2);
    } catch (e) {
      try {
        return String(arg);
      } catch (e2) {
        return "[unserializable value]";
      }
    }
  }

  function post(level, args) {
    try {
      window.parent.postMessage(
        {
          __playgroundConsole: true,
          level: level,
          message: Array.prototype.map.call(args, serialize).join(" "),
        },
        "*"
      );
    } catch (e) {
      /* ignore */
    }
  }

  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var original = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      if (
        level === "warn" &&
        typeof arguments[0] === "string" &&
        arguments[0].indexOf("cdn.tailwindcss.com") !== -1
      ) {
        return;
      }
      post(level === "debug" ? "log" : level, arguments);
      original.apply(console, arguments);
    };
  });

  window.addEventListener("error", function (event) {
    post("error", [event.error ? event.error : event.message]);
  });
  window.addEventListener("unhandledrejection", function (event) {
    post("error", ["Uncaught (in promise) " + serialize(event.reason)]);
  });
})();
`;

const DEFAULT_DOCUMENT = "<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>";

const HEAD_OPEN = /<head\b[^>]*>/i;
const HTML_OPEN = /<html\b[^>]*>/i;
const DOCTYPE = /^\s*<!doctype[^>]*>/i;

const MIME_BY_EXTENSION: Record<string, string> = {
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  cjs: "text/javascript",
  json: "application/json",
  svg: "image/svg+xml",
};

/**
 * Builds a `data:` URL for a source file.
 *
 * Why not a Blob URL: the preview iframe is sandboxed without
 * `allow-same-origin`, so it has an opaque origin. A parent-origin blob URL
 * is cross-origin to it, which makes the browser mask runtime errors from the
 * script as "Script error." (no message, no line). `data:` URLs are treated as
 * same-origin by the fetch spec, so full error details reach the console
 * bridge, and there is no object-URL lifecycle to clean up.
 */
function toDataUrl(mimeType: string, source: string): string {
  // encodeURIComponent leaves ' unescaped, which would break single-quoted attributes.
  const encoded = encodeURIComponent(source).replace(/'/g, "%27");
  return `data:${mimeType};charset=utf-8,${encoded}`;
}

function insertAfterFirstMatch(
  html: string,
  patterns: RegExp[],
  content: string,
): string {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const end = match.index + match[0].length;
      return html.slice(0, end) + content + html.slice(end);
    }
  }
  return content + html;
}

export function insertBeforeLastTag(
  html: string,
  tag: string,
  content: string,
): string | null {
  const index = html.toLowerCase().lastIndexOf(tag);
  if (index === -1) return null;
  return html.slice(0, index) + content + html.slice(index);
}

/** Normalises a reference found in the HTML (`./css/../style.css?v=2`) into a
 * project path (`style.css`), or `null` for URLs that point outside the project. */
function resolveProjectPath(reference: string): string | null {
  const trimmed = reference.trim();
  if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null; // https:, data:, blob:, ...

  const withoutSuffix = trimmed.split(/[?#]/)[0];
  let decoded = withoutSuffix;
  try {
    decoded = decodeURIComponent(withoutSuffix);
  } catch {
    // keep the raw value when it isn't valid percent-encoding
  }

  const segments: string[] = [];
  for (const segment of decoded.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") segments.pop();
    else segments.push(segment);
  }
  return segments.length > 0 ? segments.join("/") : null;
}

/** Rewrites `attribute` on every `<tagName ...>` whose value points at a project file. */
function rewriteReferences(
  doc: string,
  tagName: string,
  attribute: string,
  toUrl: (reference: string) => string | null,
): string {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  // The lookbehind keeps `data-src` / `data-href` from being mistaken for `src` / `href`.
  const attributePattern = new RegExp(
    `((?<![\\w-])${attribute}\\s*=\\s*)(["'])(.*?)\\2`,
    "i",
  );

  return doc.replace(tagPattern, (tag) =>
    tag.replace(
      attributePattern,
      (match, prefix: string, quote: string, value: string) => {
        const url = toUrl(value);
        return url ? `${prefix}${quote}${url}${quote}` : match;
      },
    ),
  );
}

function pickEntryHtml(
  files: ReadonlyMap<string, string>,
  nodes: readonly FsNode[],
): string | null {
  const index = files.get("index.html");
  if (index !== undefined) return index;

  const firstRootHtml = getChildren(nodes, null).find(
    (node) => node.type === "file" && getExtension(node.name) === "html",
  );
  return firstRootHtml?.type === "file" ? firstRootHtml.content : null;
}

/**
 * Composes the iframe's srcDoc from the project's files.
 *
 * - The entry page is `index.html` at the project root (or the first root
 *   `.html` file when there isn't one).
 * - Relative `<link href>`, `<script src>` and `<img src>` references are
 *   resolved against the file tree and replaced with the files' live
 *   content, so folders like `css/main.css` or `js/app.js` work like they
 *   would on a real server. References to other URLs are left untouched.
 * - The console bridge goes first in <head> so it also catches head scripts.
 * - The Tailwind Play CDN stays available for utility classes.
 */
export function buildPreviewDocument(nodes: readonly FsNode[]): string {
  const files = new Map<string, string>();
  for (const node of nodes) {
    if (node.type === "file") files.set(getNodePath(nodes, node.id), node.content);
  }

  const entry = pickEntryHtml(files, nodes);
  let doc = entry !== null && entry.trim().length > 0 ? entry : DEFAULT_DOCUMENT;

  const toFileUrl = (reference: string): string | null => {
    const path = resolveProjectPath(reference);
    if (path === null) return null;
    const content = files.get(path);
    if (content === undefined) return null;

    const extension = getExtension(path);
    const mime = MIME_BY_EXTENSION[extension] ?? "text/plain";
    if (extension === "css")
      return toDataUrl(mime, `${content}\n/*# sourceURL=${path} */`);
    if (mime === "text/javascript") {
      return toDataUrl(mime, `${content}\n//# sourceURL=${path}`);
    }
    return toDataUrl(mime, content);
  };

  doc = rewriteReferences(doc, "link", "href", toFileUrl);
  doc = rewriteReferences(doc, "script", "src", toFileUrl);
  doc = rewriteReferences(doc, "img", "src", toFileUrl);

  const headBlock = `\n<script>${CONSOLE_BRIDGE}</script>\n<script src="https://cdn.tailwindcss.com"></script>\n`;
  return insertAfterFirstMatch(doc, [HEAD_OPEN, HTML_OPEN, DOCTYPE], headBlock);
}
