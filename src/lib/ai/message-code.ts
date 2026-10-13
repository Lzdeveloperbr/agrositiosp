import type { CodeHighlighterPlugin } from "@streamdown/code";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Import individual grammars, never Shiki's full language/theme registries.
const languages = {
  javascript: () => import("shiki/langs/javascript.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
};
const aliases: Record<string, string> = {
  js: "javascript", ts: "typescript", py: "python", sh: "bash", shell: "bash",
};
const normalize = (language: string) => {
  const value = language.trim().toLowerCase();
  return aliases[value] ?? value;
};
let highlighter: ReturnType<typeof createHighlighterCore> | undefined;
function getHighlighter() {
  highlighter ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine({ forgiving: true }),
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
    langs: Object.values(languages).map((load) => load()),
  });
  return highlighter;
}

export const messageCode: CodeHighlighterPlugin = {
  name: "shiki",
  type: "code-highlighter",
  getSupportedLanguages: () => Object.keys(languages) as ReturnType<CodeHighlighterPlugin["getSupportedLanguages"]>,
  getThemes: () => ["github-light", "github-dark"],
  supportsLanguage: (language) => Object.hasOwn(languages, normalize(language)),
  highlight({ code, language }, callback) {
    // Unsupported fences still render as plain code, including copy/download controls.
    const lang = this.supportsLanguage(language) ? normalize(language) : "text";
    void getHighlighter().then((instance) => {
      callback?.(instance.codeToTokens(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
      }));
    }).catch(() => {
      // Streamdown retains its plain-text fallback if highlighting is unavailable.
    });
    return null;
  },
};