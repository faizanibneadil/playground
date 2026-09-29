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

const STYLE_FILE_NAME = "style.css";
const SCRIPT_FILE_NAME = "script.js";

const DEFAULT_DOCUMENT = "<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>";

// Matches <link ... href="style.css"> / <script ... src="./script.js"> so the
// reference can be swapped for the editor's live content.
const STYLE_LINK_PATTERN = /(<link\b[^>]*?\bhref\s*=\s*)(["'])(?:\.\/)?style\.css(?:[?#][^"']*)?\2/gi;
const SCRIPT_SRC_PATTERN =
  /(<script\b[^>]*?\bsrc\s*=\s*)(["'])(?:\.\/)?script\.js(?:[?#][^"']*)?\2/gi;

const HEAD_OPEN = /<head\b[^>]*>/i;
const HTML_OPEN = /<html\b[^>]*>/i;
const DOCTYPE = /^\s*<!doctype[^>]*>/i;

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

function insertAfterFirstMatch(html: string, patterns: RegExp[], content: string): string {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const end = match.index + match[0].length;
      return html.slice(0, end) + content + html.slice(end);
    }
  }
  return content + html;
}

function insertBeforeLastTag(html: string, tag: string, content: string): string | null {
  const index = html.toLowerCase().lastIndexOf(tag);
  if (index === -1) return null;
  return html.slice(0, index) + content + html.slice(index);
}

/**
 * Composes the iframe's srcDoc from the user's HTML/CSS/JS.
 *
 * - `<link href="style.css">` and `<script src="script.js">` written by the
 *   student are pointed at the live CSS/JS, like a real project.
 * - If the HTML doesn't reference them (older projects), they are injected
 *   automatically so nothing breaks.
 * - The console bridge goes first in <head> so it also catches head scripts.
 * - The Tailwind Play CDN stays available for utility classes.
 */
export function buildPreviewDocument(html: string, css: string, js: string): string {
  let doc = html.trim().length > 0 ? html : DEFAULT_DOCUMENT;

  const styleUrl = toDataUrl("text/css", `${css}\n/*# sourceURL=${STYLE_FILE_NAME} */`);
  const scriptUrl = toDataUrl("text/javascript", `${js}\n//# sourceURL=${SCRIPT_FILE_NAME}`);

  let hasStyleLink = false;
  doc = doc.replace(STYLE_LINK_PATTERN, (_match, prefix: string, quote: string) => {
    hasStyleLink = true;
    return `${prefix}${quote}${styleUrl}${quote}`;
  });

  let hasScriptTag = false;
  doc = doc.replace(SCRIPT_SRC_PATTERN, (_match, prefix: string, quote: string) => {
    hasScriptTag = true;
    return `${prefix}${quote}${scriptUrl}${quote}`;
  });

  let headBlock = `\n<script>${CONSOLE_BRIDGE}</script>\n<script src="https://cdn.tailwindcss.com"></script>\n`;

  if (!hasStyleLink) {
    const linkTag = `\n<link rel="stylesheet" href="${styleUrl}">\n`;
    const withLink = insertBeforeLastTag(doc, "</head>", linkTag);
    if (withLink) doc = withLink;
    else headBlock += linkTag;
  }

  if (!hasScriptTag) {
    const scriptTag = `\n<script src="${scriptUrl}"></script>\n`;
    doc = insertBeforeLastTag(doc, "</body>", scriptTag) ?? doc + scriptTag;
  }

  return insertAfterFirstMatch(doc, [HEAD_OPEN, HTML_OPEN, DOCTYPE], headBlock);
}