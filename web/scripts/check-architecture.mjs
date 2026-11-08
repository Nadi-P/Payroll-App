// Enforces the UI file rules:
//  1. Layout files (.tsx) in components/ and screens/ hold no class strings: styling lives in *.styles.ts.
//  2. Each component layout file exports exactly one component function.
//  3. Screens use only our components: no UI libraries and no raw text-bearing HTML elements.
//  4. Route files under app/ contain no styling.
//  5. No visible text literals in layout files: text comes from messages/*.json.
//  6. Every translation key used exists in all four locales.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const LOCALES = ["he", "en", "ar", "ru"];
const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const rel = (p) => relative(ROOT, p).split(sep).join("/");
const isLayout = (p) => p.endsWith(".tsx") && !/[\\/]use[A-Z][^\\/]*\.tsx$/.test(p);
const files = walk(SRC);

const CLASS_LITERAL = /className=\s*(["'`]|\{\s*["'`])/;
const TEXT_LITERAL = />\s*([^<>{}\n]*[A-Za-z֐-׿؀-ۿЀ-ӿ]{2,}[^<>{}\n]*)\s*</;
const BANNED_IN_SCREENS = ["@radix-ui/", "recharts", "lucide-react", "cmdk", "class-variance-authority"];
const RAW_ELEMENTS = /<(button|input|select|textarea|table|a|img|svg|label|span|p|h[1-6])[\s>]/;

for (const file of files) {
  const path = rel(file);
  const code = readFileSync(file, "utf8");
  const inComponents = path.startsWith("src/components/");
  const inScreens = path.startsWith("src/screens/");
  const inApp = path.startsWith("src/app/");

  if ((inComponents || inScreens) && isLayout(file)) {
    if (CLASS_LITERAL.test(code)) errors.push(`${path}: class string in a layout file; move it to the .styles.ts file`);
    const exportsFn = code.match(/^export (default )?(async )?function /gm) ?? [];
    const exportsConst = code.match(/^export const /gm) ?? [];
    if (exportsFn.length !== 1 || exportsConst.length > 0)
      errors.push(`${path}: a layout file must export exactly one component function`);
    const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const text = TEXT_LITERAL.exec(stripped.replace(/=>/g, "").replace(/<[A-Z][\w.]*<[^>]*>/g, ""));
    // Code between tags (ternaries, generics, arrow params) contains these; real text rarely does.
    if (text && !/[(){}=?:;&|]/.test(text[1])) errors.push(`${path}: visible text literal "${text[1].trim()}"; use messages`);
  }

  if (inScreens && file.endsWith(".tsx")) {
    for (const lib of BANNED_IN_SCREENS)
      if (code.includes(`from "${lib}`)) errors.push(`${path}: screens may not import ${lib}; wrap it in a component`);
    if (isLayout(file) && RAW_ELEMENTS.test(code) && !path.startsWith("src/screens/document/"))
      errors.push(`${path}: raw ${RAW_ELEMENTS.exec(code)[1]} element in a screen; use a component`);
  }

  if (inApp && file.endsWith(".tsx") && CLASS_LITERAL.test(code))
    errors.push(`${path}: route files render a screen only`);
}

// Translation keys: t("a.b.c") calls and the dynamic prefixes they build on.
const messages = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8"))]),
);
const has = (obj, key) => key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj) !== undefined;
const used = new Set();
for (const file of files.filter((f) => /\.(ts|tsx)$/.test(f))) {
  const code = readFileSync(file, "utf8");
  for (const m of code.matchAll(/\bt\(\s*"([a-zA-Z0-9_.-]+)"/g)) used.add(m[1]);
  for (const m of code.matchAll(/\bt\(\s*`([a-zA-Z0-9_.-]+)\.\$\{/g)) used.add(m[1]);
}
for (const key of used)
  for (const l of LOCALES) if (!has(messages[l], key)) errors.push(`messages/${l}.json: missing "${key}"`);

// Every locale must have the same keys as English.
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
const english = new Set(flatten(messages.en));
for (const l of LOCALES.filter((x) => x !== "en")) {
  const keys = new Set(flatten(messages[l]));
  for (const k of english) if (!keys.has(k)) errors.push(`messages/${l}.json: missing "${k}" (present in en)`);
  for (const k of keys) if (!english.has(k)) errors.push(`messages/${l}.json: extra "${k}" (absent in en)`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} architecture problem(s).`);
  process.exit(1);
}
console.log(`Architecture OK: ${files.length} files, ${used.size} translation keys in ${LOCALES.length} locales.`);
