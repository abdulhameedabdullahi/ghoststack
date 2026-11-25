// Plain constants with no imports, so Node (Vite config) and Vitest can both load this file.

/** Where the app is hosted. Root for now (Vercel or Netlify). Change here only. */
export const BASE_PATH = "/";

export const MANIFEST = {
  id: BASE_PATH,
  name: "GhostStack",
  short_name: "GhostStack",
  description: "Track your stock, sales and money owed. Works with no internet.",
  start_url: BASE_PATH,
  scope: BASE_PATH,
  display: "standalone" as const,
  theme_color: "#000000", // equals --color-title-bg in the light theme
  background_color: "#ffffff", // equals --color-bg in the light theme
  icons: [
    { src: `${BASE_PATH}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${BASE_PATH}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: `${BASE_PATH}icons/icon-maskable-512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
