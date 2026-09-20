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

function injectBeforeClosingTag(html: string, tag: string, content: string): string {
  const idx = html.toLowerCase().lastIndexOf(tag);
  if (idx === -1) return html + content;
  return html.slice(0, idx) + content + html.slice(idx);
}

/**
 * Composes the iframe's srcDoc from the user's HTML/CSS/JS. The Tailwind
 * Play CDN is included so users can reach for utility classes in their own
 * markup without any extra setup, matching a typical playground experience.
 */
export function buildPreviewDocument(html: string, css: string, js: string): string {
  let doc =
    html && html.trim().length > 0
      ? html
      : "<!DOCTYPE html>\n<html>\n<head></head>\n<body></body>\n</html>";

  const headInjection = `
<script>${CONSOLE_BRIDGE}</script>
<script src="https://cdn.tailwindcss.com"></script>
<style>
${css}
</style>
`;
  doc = injectBeforeClosingTag(doc, "</head>", headInjection);

  const bodyInjection = `
<script>
${js}
</script>
`;
  doc = injectBeforeClosingTag(doc, "</body>", bodyInjection);

  return doc;
}
