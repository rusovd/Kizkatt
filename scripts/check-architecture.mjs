import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const engineRoot = resolve(root, "packages/kizkatt-graphic-engine/src");
const uiRoot = resolve(root, "packages/kizkatt-ui/src");
const sourceExtensions = new Set([".ts", ".tsx"]);

async function getSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? getSourceFiles(path) : [path];
    })
  );

  return files.flat().filter((file) => sourceExtensions.has(extname(file)));
}

async function findForbiddenImports(directory, forbiddenPackages) {
  const violations = [];

  for (const file of await getSourceFiles(directory)) {
    const source = await readFile(file, "utf8");
    const imports = source.matchAll(/from\s+["']([^"']+)["']/g);

    for (const match of imports) {
      if (forbiddenPackages.some((name) => match[1] === name)) {
        violations.push(`${relative(root, file)} imports ${match[1]}`);
      }
    }
  }

  return violations;
}

const violations = [
  ...(await findForbiddenImports(engineRoot, [
    "react",
    "react-dom",
    "kizkatt-ui",
    "kizkatt-graphic-editor"
  ])),
  ...(await findForbiddenImports(uiRoot, ["kizkatt-graphic-editor"]))
];

const forbiddenUiImplementationPaths = [
  "controller/KizkattGraphicEditorController",
  "components/GraphicEditorView",
  "hooks/useCanvasHistory",
  "hooks/useCanvasAutosave",
  "tools/pointer",
  "export/clipboardExport"
];

for (const file of await getSourceFiles(uiRoot)) {
  const uiPath = relative(uiRoot, file);

  if (forbiddenUiImplementationPaths.some((path) => uiPath.includes(path))) {
    violations.push(`${relative(root, file)} contains product orchestration`);
  }
}

if (violations.length > 0) {
  console.error("Architecture boundary violations:\n");
  console.error(violations.map((violation) => `- ${violation}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture boundaries are valid.");
}
