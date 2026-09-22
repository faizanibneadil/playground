import { common, createLowlight } from "lowlight";

// The "common" bundle covers most languages people will actually type in
// the Theory tab (js, ts, css, json, python, bash, ...). A few short
// aliases people naturally reach for (```html, ```js, ```ts) are wired up
// to the grammars that actually cover them.
export const lowlight = createLowlight(common);
lowlight.register("html", common.xml);
lowlight.register("js", common.javascript);
lowlight.register("ts", common.typescript);