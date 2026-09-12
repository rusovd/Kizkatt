const LEGACY_SCENE_ARCHIVE_ENTRY_NAME = "scene.json";

const ZIP_LOCAL_FILE_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const;
const JSON_FILE_SUFFIX = ".json";
const KIZKATT_FILE_SUFFIX = ".kk";
const MAX_SCENE_ARCHIVE_ENTRY_BYTES = 64 * 1024 * 1024;

let fflateModulePromise: Promise<typeof import("fflate")> | null = null;

function loadFflate() {
  fflateModulePromise ??= import("fflate");

  return fflateModulePromise;
}

async function compressArchive(files: Record<string, Uint8Array>) {
  const { zip } = await loadFflate();

  return new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 6 }, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(archive);
    });
  });
}

async function decompressArchive(archive: Uint8Array) {
  const { unzip } = await loadFflate();
  let hasSelectedEntry = false;

  return new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(
      archive,
      {
        filter: ({ name, originalSize }) => {
          const normalizedName = name.toLowerCase();
          const isSceneEntry =
            normalizedName === LEGACY_SCENE_ARCHIVE_ENTRY_NAME ||
            normalizedName.endsWith(KIZKATT_FILE_SUFFIX) ||
            normalizedName.endsWith(JSON_FILE_SUFFIX);

          if (
            hasSelectedEntry ||
            !isSceneEntry ||
            originalSize > MAX_SCENE_ARCHIVE_ENTRY_BYTES
          ) {
            return false;
          }

          hasSelectedEntry = true;

          return true;
        }
      },
      (error, files) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(files);
      }
    );
  });
}

export function isKizkattSceneArchive(contents: Uint8Array) {
  return ZIP_LOCAL_FILE_SIGNATURE.every(
    (byte, index) => contents[index] === byte
  );
}

export function getKizkattSceneArchiveEntryName(archiveFileName: string) {
  const fileName = archiveFileName.split(/[\\/]/).at(-1)?.trim() ?? "";

  return fileName || "scene.kk";
}

export async function createKizkattSceneArchive(
  documentJson: string,
  archiveFileName = "scene.kk"
) {
  const { strToU8 } = await loadFflate();

  return compressArchive({
    [getKizkattSceneArchiveEntryName(archiveFileName)]: strToU8(documentJson)
  });
}

export async function extractKizkattSceneArchive(archive: Uint8Array) {
  const { strFromU8 } = await loadFflate();
  const files = await decompressArchive(archive);
  const sceneEntry = files[LEGACY_SCENE_ARCHIVE_ENTRY_NAME] ??
    Object.entries(files).find(([name]) =>
      name.toLowerCase().endsWith(KIZKATT_FILE_SUFFIX)
    )?.[1] ??
    Object.entries(files).find(([name]) =>
      name.toLowerCase().endsWith(JSON_FILE_SUFFIX)
    )?.[1];

  if (!sceneEntry) {
    throw new Error("The Kizkatt archive does not contain a scene file.");
  }

  return strFromU8(sceneEntry);
}
