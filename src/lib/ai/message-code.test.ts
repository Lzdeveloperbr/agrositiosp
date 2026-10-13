import { describe, expect, it } from "vitest";
import { messageCode } from "./message-code";

describe("lightweight message highlighting", () => {
  it("supports common languages and aliases without the full registry", () => {
    expect(messageCode.getSupportedLanguages()).toHaveLength(6);
    expect(messageCode.supportsLanguage("js")).toBe(true);
    expect(messageCode.supportsLanguage("python")).toBe(true);
    expect(messageCode.supportsLanguage("cobol")).toBe(false);
    expect(messageCode.getThemes()).toEqual(["github-light", "github-dark"]);
  });

  it("highlights code and preserves unsupported code as text", async () => {
    for (const language of ["javascript", "cobol"] as const) {
      const result = await new Promise<unknown>((resolve) => {
        messageCode.highlight({
          code: "const weight = 1500;",
          language,
          themes: messageCode.getThemes(),
        }, resolve);
      });
      expect(result).toHaveProperty("tokens");
    }
  });
});