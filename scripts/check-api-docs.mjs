import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
// Use the same parser installed by JSDoc rather than introducing a second parser.
const jsdocRequire = createRequire(require.resolve("jsdoc/package.json"));
const { parse } = jsdocRequire("@babel/parser");
const config = JSON.parse(readFileSync("jsdoc.json", "utf8"));
const manifest = JSON.parse(readFileSync("docs/p1-documentation.json", "utf8"));
const generated = spawnSync(process.execPath, [require.resolve("jsdoc/jsdoc.js"), "-c", "jsdoc.json", "-X"], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});
if (generated.status !== 0 || generated.stderr.trim()) {
  throw new Error(generated.error?.message || generated.stderr || "JSDoc could not parse its inputs.");
}
const doclets = JSON.parse(generated.stdout);
const failures = [];
const included = new Set(config.source.include);
const files = new Set(manifest.requirements.flatMap((requirement) => requirement.files));
let publicCount = 0;

for (const file of files) {
  if (!existsSync(file) || !included.has(file)) {
    failures.push(`${file}: missing file or JSDoc input`);
    continue;
  }
  const source = readFileSync(file, "utf8");
  const ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  for (const node of ast.program.body) {
    if (!["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(node.type)) continue;
    const declaration = node.declaration;
    if (!declaration) continue;
    const callables = [];
    if (["FunctionDeclaration", "ClassDeclaration"].includes(declaration.type)) {
      callables.push({ name: declaration.id?.name || "default", fn: declaration });
    }
    if (declaration.type === "VariableDeclaration") {
      for (const entry of declaration.declarations) {
        const initializer = entry.init;
        const fn = ["ArrowFunctionExpression", "FunctionExpression"].includes(initializer?.type)
          ? initializer
          : initializer?.type === "CallExpression" && initializer.callee.name === "respond"
            ? initializer.arguments[0]
            : null;
        if (fn) callables.push({ name: entry.id.name, fn });
      }
    }
    for (const { name, fn } of callables) {
      publicCount++;
      const documented = doclets.find((entry) =>
        entry.name === name && !entry.undocumented && !entry.ignore &&
        ["function", "class"].includes(entry.kind) && entry.meta &&
        resolve(entry.meta.path, entry.meta.filename) === resolve(file),
      );
      if (!documented?.description) {
        failures.push(`${file}: ${name} has no generated public documentation`);
        continue;
      }
      const params = fn.type === "ClassDeclaration"
        ? fn.body.body.find((method) => method.kind === "constructor")?.params || []
        : fn.params;
      const topLevelParams = (documented.params || []).filter((param) => !param.name.includes("."));
      if (params.length !== topLevelParams.length || (documented.params || []).some((param) => !param.description || !param.type)) {
        failures.push(`${file}: ${name} needs parameter descriptions`);
      }
      if (fn.type !== "ClassDeclaration" && !documented.returns?.some((result) => result.type && result.description)) {
        failures.push(`${file}: ${name} needs a documented return value`);
      }
    }
  }
}

const ids = manifest.requirements.map((requirement) => requirement.id);
if (new Set(ids).size !== ids.length) failures.push("Duplicate requirement IDs in the baseline.");
const covered = manifest.requirements.filter((requirement) => requirement.files.length);
const percent = covered.length / manifest.requirements.length * 100;
if (percent < 85) failures.push(`P1 source mapping is only ${percent.toFixed(1)}%.`);
if (failures.length) throw new Error(failures.join("\n"));

mkdirSync("docs/generated", { recursive: true });
const table = [
  "# M4 documentation coverage evidence", "",
  `${covered.length}/${manifest.requirements.length} explicitly P1 requirements mapped (${percent.toFixed(1)}%).`,
  `${publicCount} exported functions/classes documented across ${files.size} mapped files.`, "",
  "Documentation coverage only; this is not functional or statement test coverage.", "",
  "| P1 requirement | Feature | Source files / exclusion |",
  "| --- | --- | --- |",
  ...manifest.requirements.map((requirement) =>
    `| ${requirement.id} | ${requirement.title} | ${requirement.files.length
      ? requirement.files.map((file) => {
          const moduleName = file.replace(/\.js$/, "").replaceAll("(platform)", "platform").replaceAll("[", "").replaceAll("]", "");
          return `[${file}](api/module-${moduleName.replaceAll("/", "_")}.html)`;
        }).join("<br>")
      : requirement.note} |`,
  ),
  "",
];
writeFileSync("docs/generated/p1-coverage.md", table.join("\n"));
console.log(`Documentation verified: ${publicCount} public functions/classes in ${files.size} files; P1 mapping ${covered.length}/${manifest.requirements.length} (${percent.toFixed(1)}%).`);
