export const THEME_STORAGE_KEY = "naijaauto.theme";

export const APP_THEMES = [
  {
    id: "naija",
    label: "Naija",
  },
  {
    id: "savanna",
    label: "Savanna",
  },
  {
    id: "atlantic",
    label: "Atlantic",
  },
] as const;

export type AppTheme = (typeof APP_THEMES)[number]["id"];

export const DEFAULT_THEME: AppTheme = "naija";

const themeSet = new Set<AppTheme>(APP_THEMES.map((theme) => theme.id));

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && themeSet.has(value as AppTheme);
}
