import type { FsNode } from "@/lib/file-tree";

export const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Hello, Playground</h1>
    <p>Edit the files in the Explorer on the left. The preview updates live.</p>
    <button id="btn">Click me</button>

    <script src="script.js"></script>
  </body>
</html>
`;

export const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  color: #1f2937;
}

h1 {
  color: #ea580c;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #ea580c;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
}

button:hover {
  background: #c2410c;
}
`;

export const DEFAULT_JS = `let count = 0;

const btn = document.getElementById("btn");
if (btn) {
  btn.addEventListener("click", function () {
    count++;
    console.log("Clicked", count, "time(s)");
    btn.textContent = "Clicked " + count + "x";
  });
}
`;

export const DEFAULT_INDEX_FILE_ID = "default-index-html";

/** Starter project. Ids are fixed so resetting is a pure, repeatable operation. */
export const DEFAULT_NODES: FsNode[] = [
  {
    id: DEFAULT_INDEX_FILE_ID,
    parentId: null,
    name: "index.html",
    type: "file",
    content: DEFAULT_HTML,
  },
  {
    id: "default-style-css",
    parentId: null,
    name: "style.css",
    type: "file",
    content: DEFAULT_CSS,
  },
  {
    id: "default-script-js",
    parentId: null,
    name: "script.js",
    type: "file",
    content: DEFAULT_JS,
  },
];
