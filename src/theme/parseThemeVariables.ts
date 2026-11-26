/** Map from a CSS variable name (with the leading "--") to its final value text. */
export type ThemeVariables = Readonly<Record<string, string>>;

export interface ParsedTheme {
  /** Variables of the :root block (light theme), fully resolved. */
  light: ThemeVariables;
  /** Variables of the [data-theme="midnight"] block, with light values filled in for any variable it does not set. */
  midnight: ThemeVariables;
}

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const VAR_REF = /var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g;

function stripComments(text: string): string {
  const result = text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (result.includes("/*") || result.includes("*/")) {
    throw new Error("theme.css has an unclosed or stray CSS comment");
  }
  return result;
}

/** Returns the index of the "}" that matches the "{" at `open`. */
function findClosingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("theme.css has a block with no closing brace");
}

interface TopLevelBlocks {
  root: string | null;
  midnight: string | null;
}

/** Walks the text at brace depth 0 and collects the two blocks we need. At-rules are skipped. */
function findTopLevelBlocks(text: string): TopLevelBlocks {
  const blocks: TopLevelBlocks = { root: null, midnight: null };
  let pos = 0;
  while (pos < text.length) {
    const open = text.indexOf("{", pos);
    const semi = text.indexOf(";", pos);
    // A statement such as "@import ...;" has no block.
    if (semi !== -1 && (open === -1 || semi < open)) {
      pos = semi + 1;
      continue;
    }
    if (open === -1) break;
    const prelude = text.slice(pos, open).trim();
    const close = findClosingBrace(text, open);
    const body = text.slice(open + 1, close);
    if (!prelude.startsWith("@")) {
      const selector = prelude.replace(/\s+/g, "");
      if (selector === ":root") {
        blocks.root = (blocks.root ?? "") + body + ";";
      } else if (
        selector === '[data-theme="midnight"]' ||
        selector === "[data-theme='midnight']" ||
        selector === "[data-theme=midnight]"
      ) {
        blocks.midnight = (blocks.midnight ?? "") + body + ";";
      }
    }
    pos = close + 1;
  }
  return blocks;
}

/** Reads every `--name: value;` declaration. The last one for a name wins. */
function readDeclarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]*);/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

function resolveAll(raw: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};

  const resolve = (name: string, chain: string[]): string => {
    if (name in resolved) return resolved[name];
    const value = raw[name];
    const here = [...chain, name];
    const replaced = value.replace(VAR_REF, (_whole, ref: string) => {
      if (here.includes(ref)) {
        throw new Error(
          `Circular variable reference: ${[...here, ref].join(" -> ")}`,
        );
      }
      if (!(ref in raw)) {
        throw new Error(`Unknown variable ${ref} used by ${name}`);
      }
      return resolve(ref, here);
    });
    if (replaced.includes("var(")) {
      throw new Error(
        `Cannot follow var() in ${name}: "${value}". Only var(--name) is supported.`,
      );
    }
    resolved[name] = replaced;
    return replaced;
  };

  for (const name of Object.keys(raw)) resolve(name, []);

  for (const [name, value] of Object.entries(resolved)) {
    if (name.startsWith("--color-") && !HEX_COLOUR.test(value)) {
      throw new Error(`${name} is not a hex colour: "${value}"`);
    }
  }
  return resolved;
}

/** Reads the text of theme.css. Throws Error with a clear message on a bad file. */
export function parseThemeVariables(cssText: string): ParsedTheme {
  const blocks = findTopLevelBlocks(stripComments(cssText));
  if (blocks.root === null) throw new Error("theme.css has no :root block");
  if (blocks.midnight === null) {
    throw new Error('theme.css has no [data-theme="midnight"] block');
  }
  const lightRaw = readDeclarations(blocks.root);
  const midnightRaw = { ...lightRaw, ...readDeclarations(blocks.midnight) };
  return {
    light: resolveAll(lightRaw),
    midnight: resolveAll(midnightRaw),
  };
}
