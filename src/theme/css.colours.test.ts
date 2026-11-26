import { describe, expect, it } from "vitest";

// The module name is built at run time because the project has no Node type package.
type Fs = {
  readdirSync(
    path: URL,
    options: { withFileTypes: true },
  ): { name: string; isDirectory(): boolean }[];
  readFileSync(path: URL, encoding: "utf8"): string;
};
const fs = (await import(/* @vite-ignore */["node", "fs"].join(":"))) as Fs;

function findCssFiles(dir: URL): URL[] {
  const found: URL[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...findCssFiles(new URL(`${entry.name}/`, dir)));
    } else if (entry.name.endsWith(".css")) {
      found.push(new URL(entry.name, dir));
    }
  }
  return found;
}

const ALLOWED_WORDS = new Set(["transparent", "inherit", "currentcolor"]);

const NAMED_COLOURS = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue " +
    "blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk " +
    "crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki " +
    "darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen " +
    "darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue " +
    "dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite " +
    "gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan " +
    "lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen " +
    "lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen " +
    "mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream " +
    "mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid " +
    "palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
    "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen " +
    "steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow " +
    "yellowgreen"
  ).split(" "),
);

const COLOUR_FUNCTION =
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i;
const HEX = /#[0-9a-f]{3,8}\b/i;

/** Removes comments, quoted strings and url(...) contents. */
function strip(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
    .replace(/url\([^)]*\)/gi, "url()");
}

/** Returns "property: value" declarations. Selectors and at-rule preludes are skipped. */
function declarations(css: string): { prop: string; value: string }[] {
  const out: { prop: string; value: string }[] = [];
  let buf = "";
  const flush = () => {
    const i = buf.indexOf(":");
    if (i > 0) {
      out.push({ prop: buf.slice(0, i).trim(), value: buf.slice(i + 1).trim() });
    }
    buf = "";
  };
  for (const ch of strip(css)) {
    if (ch === "{") buf = "";
    else if (ch === ";" || ch === "}") flush();
    else buf += ch;
  }
  flush();
  return out;
}

/** Lists every colour value found in the property values of a stylesheet. */
export function findColours(css: string): string[] {
  const flagged: string[] = [];
  for (const { prop, value } of declarations(css)) {
    const hex = HEX.exec(value);
    if (hex) flagged.push(`${prop}: ${hex[0]}`);
    const fn = COLOUR_FUNCTION.exec(value);
    if (fn) flagged.push(`${prop}: ${fn[0]}`);
    // Words with a hyphen (var names, ease-in, ...) are ignored.
    for (const word of value.match(/-{0,2}[a-z][a-z0-9-]*(?!\()/gi) ?? []) {
      if (word.includes("-")) continue;
      const lower = word.toLowerCase();
      if (ALLOWED_WORDS.has(lower)) continue;
      if (NAMED_COLOURS.has(lower)) flagged.push(`${prop}: ${word}`);
    }
  }
  return flagged;
}

const srcDir = new URL("../", import.meta.url);
const cssFiles = findCssFiles(srcDir).filter(
  (f) => !f.pathname.endsWith("/theme.css"),
);

describe("colour scan (Requirements 4.5, 4.9, 13.9)", () => {
  it("finds CSS files to scan", () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  it("flags hex, rgb(), hsl() and named colours in property values", () => {
    const bad = `
      .a { color: #fff; background: RGBA(0,0,0,.5); border-color: hsl(1 2% 3%); }
      .b { outline: 1px solid Red; box-shadow: 0 0 2px black; }
    `;
    expect(findColours(bad)).toHaveLength(5);
  });

  it("allows variables, keywords, hyphenated words, breakpoints, comments, strings and ch units", () => {
    const good = `
      /* color: red; #fff */
      @media (min-width: 768px) { .a { max-width: 60ch; } }
      .a:hover { color: var(--color-text); background: transparent; border-color: currentColor; }
      .b { content: "red #fff"; transition: all 1s ease-in; color: inherit; }
      .red { margin: 0 auto; background: url(#white); font-family: var(--font-body, serif); }
    `;
    expect(findColours(good)).toEqual([]);
  });

  for (const file of cssFiles) {
    const name = file.pathname.split("/src/").pop();
    it(`${name} has no hard-coded colours`, () => {
      expect(findColours(fs.readFileSync(file, "utf8"))).toEqual([]);
    });
  }
});
