/**
 * Colour pairs that the palette test checks in `theme.css`.
 * Pure data. No React.
 */

export type PairKind = "text" | "ui";
export type ThemeName = "light" | "midnight";

export interface PalettePair {
  /** Short plain name used in failure messages, for example "body text on page". */
  name: string;
  /** Variable name of the foreground, for example "--color-fg". */
  fg: string;
  /** Variable name of the background, for example "--color-bg". */
  bg: string;
  kind: PairKind;
  /** 4.5 for text pairs, 3 for ui pairs. */
  minRatio: number;
  /** Themes the pair is checked in. Normally both. */
  themes: readonly ThemeName[];
}

const BOTH: readonly ThemeName[] = ["light", "midnight"];

function text(name: string, fg: string, bg: string): PalettePair {
  return { name, fg, bg, kind: "text", minRatio: 4.5, themes: BOTH };
}

function ui(name: string, fg: string, bg: string): PalettePair {
  return { name, fg, bg, kind: "ui", minRatio: 3, themes: BOTH };
}

export const PAIR_LIST: readonly PalettePair[] = [
  text("body text on page", "--color-fg", "--color-bg"),
  text("body text on card", "--color-fg", "--color-surface"),
  text("muted text on page", "--color-muted-fg", "--color-bg"),
  text("muted text on card", "--color-muted-fg", "--color-surface"),
  text("title text on title bar", "--color-title-fg", "--color-title-bg"),
  text("accent button text on accent", "--color-accent-fg", "--color-accent"),
  text("danger text on danger", "--color-danger-fg", "--color-danger-bg"),
  text("warning text on warning", "--color-warning-fg", "--color-warning-bg"),
  text("hover text on hover background", "--color-hover-fg", "--color-hover-bg"),
  text("active text on active background", "--color-active-fg", "--color-active-bg"),
  text("disabled text on disabled background", "--color-disabled-fg", "--color-disabled-bg"),
  text("error text on page", "--color-error-fg", "--color-bg"),
  text("error text on card", "--color-error-fg", "--color-surface"),
  text("notice text on notice background", "--color-notice-fg", "--color-notice-bg"),
  text(
    "selected tab text on selected tab background",
    "--color-tab-selected-fg",
    "--color-tab-selected-bg",
  ),
  text(
    "unselected tab text on unselected tab background",
    "--color-tab-fg",
    "--color-tab-bg",
  ),
  ui("focus outline on page", "--color-focus", "--color-bg"),
  ui("focus outline on card", "--color-focus", "--color-surface"),
  ui("border on page", "--color-border", "--color-bg"),
  ui("border on card", "--color-border", "--color-surface"),
  ui("ghost fill on page", "--color-ghost", "--color-bg"),
  ui("ghost fill on card", "--color-ghost", "--color-surface"),
  ui("nightcap on page", "--color-ghost-cap", "--color-bg"),
  ui("nightcap on card", "--color-ghost-cap", "--color-surface"),
  ui("ghost on title bar", "--color-title-fg", "--color-title-bg"),
  ui("moon icon on moon button", "--color-moon-icon", "--color-moon-bg"),
  ui("pressed moon icon on pressed moon button", "--color-moon-pressed-icon", "--color-moon-pressed-bg"),
];

/**
 * Colour variables that are drawn but are not used for text, with a short reason each.
 * Every colour variable in the theme already appears in a pair above
 * (`--color-accent` is covered by "accent button text on accent"), so this is empty.
 * Add an entry here, with a one-line comment, for any new colour variable that has no pair.
 */
export const NOT_USED_FOR_TEXT: Readonly<Record<string, string>> = {};
