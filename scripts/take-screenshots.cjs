/**
 * Screenshot script: captures GhostStack at 360/768/1440px in light + midnight themes.
 * Run: node scripts/take-screenshots.cjs
 */
const path = require("path");
const { mkdirSync } = require("fs");

// Use playwright from npx cache
const PW_PATH = "C:\\Users\\AS\\AppData\\Local\\npm-cache\\_npx\\41b79885fbdb2a18\\node_modules\\playwright";
const { chromium } = require(PW_PATH);

const OUT = path.join(__dirname, "../docs/screenshots");
mkdirSync(OUT, { recursive: true });

const BASE_URL = "http://localhost:5174/";
const WIDTHS = [360, 768, 1440];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Users\\AS\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe",
  });

  for (const width of WIDTHS) {
    const height = width < 600 ? 780 : 900;
    console.log(`\n── width ${width}px ──`);

    // light theme
    {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const file = path.join(OUT, `${width}-light.png`);
      await page.screenshot({ path: file });
      console.log("  saved:", file);
      await page.close();
    }

    // midnight theme: click moon toggle
    {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const btn = await page.$(".moon-button");
      if (btn) await btn.click();
      else console.warn("  .moon-button not found");
      await page.waitForTimeout(500);
      const file = path.join(OUT, `${width}-midnight.png`);
      await page.screenshot({ path: file });
      console.log("  saved:", file);
      await page.close();
    }
  }

  await browser.close();
  console.log("\nAll done.");
})();
