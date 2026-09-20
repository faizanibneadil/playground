export const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Preview</title>
  </head>
  <body>
    <h1>Hello, Playground</h1>
    <p>Edit the HTML, CSS and JS tabs on the left. The preview updates live.</p>
    <button id="btn">Click me</button>
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

export const DEFAULT_FILES = {
  html: DEFAULT_HTML,
  css: DEFAULT_CSS,
  js: DEFAULT_JS,
};
