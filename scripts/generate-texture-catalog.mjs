import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const TEXTURE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp"
]);
const root = fileURLToPath(
  new URL(
    "../src/graphic-editor/assets/textures/monochrome/",
    import.meta.url
  )
);

function slug(value) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayName(value) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getJpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  const sizeMarkers = new Set([
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf
  ]);
  let offset = 2;

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset);

    if (sizeMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  return null;
}

function getImageSize(file) {
  const extension = extname(file).toLocaleLowerCase();

  if (extension === ".jpeg" || extension === ".jpg") {
    return getJpegSize(readFileSync(file));
  }

  return null;
}

function getTextureFiles(categoryRoot) {
  return readdirSync(categoryRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        TEXTURE_EXTENSIONS.has(extname(entry.name).toLocaleLowerCase())
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

const categories = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right))
  .map((categoryName) => {
    const categoryRoot = join(root, categoryName);
    const categoryId = slug(categoryName);
    const textures = getTextureFiles(categoryRoot).map((filename) => {
      const file = join(categoryRoot, filename);
      const relativeFile = relative(root, file).replaceAll("\\", "/");
      const thumbnailFile = join(categoryRoot, "thumbnails", filename);
      const size = getImageSize(file);

      return {
        file: relativeFile,
        ...(size ?? {}),
        id: `monochrome.${categoryId}.${slug(displayName(filename))}`,
        name: displayName(filename),
        ...(existsSync(thumbnailFile)
          ? {
              thumbnail: relative(root, thumbnailFile).replaceAll("\\", "/")
            }
          : {})
      };
    });

    return {
      id: categoryId,
      name: categoryName,
      textures
    };
  })
  .filter((category) => category.textures.length > 0);

const catalog = {
  version: 1,
  collections: [
    {
      id: "monochrome",
      name: "Monochrome",
      categories
    }
  ]
};

writeFileSync(join(root, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);

const textureCount = categories.reduce(
  (total, category) => total + category.textures.length,
  0
);

process.stdout.write(
  `Cataloged ${textureCount} textures in ${categories.length} categories.\n`
);
