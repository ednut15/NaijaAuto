import { describe, expect, it } from "vitest";

import { APP_THEMES, DEFAULT_THEME, isAppTheme } from "@/lib/theme";

describe("theme registry", () => {
  it("exposes a valid default theme", () => {
    expect(isAppTheme(DEFAULT_THEME)).toBe(true);
  });

  it("accepts known theme ids and rejects unknown ids", () => {
    for (const theme of APP_THEMES) {
      expect(isAppTheme(theme.id)).toBe(true);
    }

    expect(isAppTheme("unknown")).toBe(false);
    expect(isAppTheme("")).toBe(false);
  });
});
