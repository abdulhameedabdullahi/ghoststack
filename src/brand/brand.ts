/** Brand constants. All user-visible fixed strings live here. */

export const BRAND_NAME = "GhostStack";
export const BRAND_TAGLINE = "Raise your shop.";
export const BRAND_SUBLINE = "Stock, sales and debts. Offline. In Naira.";
export const MASCOT_NAME = "Kobo";

/**
 * Brand colour tokens — CSS custom property names defined in theme.css.
 * Never duplicate hex values here; always read from the theme.
 */
export const BRAND_COLOUR_TOKENS = {
  midnight:      "--color-bg",         // deep midnight  #07050f (dark) / #ffffff (light)
  moonlight:     "--color-ghost",       // ghost lavender #d8c4ff (dark) / #000000 (light)
  candleGold:    "--color-moon-icon",   // Naira gold     #d4a030
  ghostLavender: "--color-ghost-cap",   // deep lavender  #ff4de8 (dark) / #5b2fa0 (light)
  neonAccent:    "--color-accent",      // neon purple    #9254ff (dark) / #000000 (light)
} as const;

export type BrandColourToken = keyof typeof BRAND_COLOUR_TOKENS;
