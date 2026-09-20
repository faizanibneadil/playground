import * as prettier from "prettier/standalone";
import prettierHtml from "prettier/plugins/html";
import prettierPostcss from "prettier/plugins/postcss";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";

export type EditorLanguage = "html" | "css" | "javascript";

const PARSER_BY_LANGUAGE: Record<EditorLanguage, string> = {
  html: "html",
  css: "css",
  javascript: "babel",
};

/**
 * Formats a snippet of HTML, CSS or JS with Prettier (running fully in the
 * browser via the standalone build — no server round-trip required).
 */
export async function formatCode(
  code: string,
  language: EditorLanguage
): Promise<string> {
  return prettier.format(code, {
    parser: PARSER_BY_LANGUAGE[language],
    plugins: [prettierHtml, prettierPostcss, prettierBabel, prettierEstree],
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
    printWidth: 80,
  });
}
