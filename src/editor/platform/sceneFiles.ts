import {
  decodeSceneFileContents,
  DEFAULT_SCENE_FILE_NAME,
  encodeSceneFileContents,
  getSceneFileExtension,
  getSceneFileFormat,
  getSceneFileMimeType,
  isKizkattSceneArchive,
  KIZKATT_SCENE_FILE_EXTENSION,
  KIZKATT_SCENE_JSON_MIME_TYPE,
  KIZKATT_SCENE_MIME_TYPE,
  normalizeSceneFileBaseName,
  SVG_FILE_EXTENSION,
  type SceneFileFormat
} from "kizkatt-graphic-engine";

export type SceneFileHandle = {
  createWritable: () => Promise<{
    close: () => Promise<void>;
    write: (contents: Uint8Array | string) => Promise<void>;
  }>;
  getFile: () => Promise<File>;
  name: string;
};

type FilePickerOptions = {
  excludeAcceptAllOption?: boolean;
  id?: string;
  multiple?: boolean;
  startIn?: string;
  suggestedName?: string;
  types: Array<{
    accept: Record<string, string[]>;
    description: string;
  }>;
};

type FilePickerWindow = Window & {
  showOpenFilePicker?: (
    options: FilePickerOptions
  ) => Promise<SceneFileHandle[]>;
  showSaveFilePicker?: (
    options: FilePickerOptions
  ) => Promise<SceneFileHandle>;
};

const LOAD_PICKER_ID = "kizkatt-scene-load";
const SAVE_PICKER_ID = "kizkatt-scene-save";
const SCENE_FILE_TYPES: FilePickerOptions["types"] = [
  {
    accept: {
      [KIZKATT_SCENE_MIME_TYPE]: [KIZKATT_SCENE_FILE_EXTENSION],
      [KIZKATT_SCENE_JSON_MIME_TYPE]: [KIZKATT_SCENE_FILE_EXTENSION]
    },
    description: "Kizkatt scene"
  },
  {
    accept: { "image/svg+xml": [SVG_FILE_EXTENSION] },
    description: "SVG image"
  }
];

function getFileTypes(format?: SceneFileFormat) {
  if (!format) {
    return SCENE_FILE_TYPES;
  }

  return SCENE_FILE_TYPES.filter((_, index) =>
    format === "kk" ? index === 0 : index === 1
  );
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function triggerDownload(
  contents: Uint8Array | string,
  fileName: string,
  mimeType: string
) {
  const blobPart = typeof contents === "string"
    ? contents
    : contents.buffer instanceof ArrayBuffer &&
        contents.byteOffset === 0 &&
        contents.byteLength === contents.buffer.byteLength
      ? contents.buffer
      : contents.slice().buffer;
  const blob = new Blob([blobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = fileName;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

async function readSceneFileContents(file: File, format: SceneFileFormat) {
  if (format === "svg") {
    return decodeSceneFileContents({
      contents: await file.text(),
      format
    });
  }

  const prefix = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  const archived = isKizkattSceneArchive(prefix);

  return decodeSceneFileContents({
    contents: archived
      ? new Uint8Array(await file.arrayBuffer())
      : await file.text(),
    format
  });
}

export async function saveSceneFile({
  archiveKk = true,
  format = "kk",
  getContents,
  handle,
  suggestedBaseName
}: {
  archiveKk?: boolean;
  format?: SceneFileFormat;
  getContents: () => Promise<string> | string;
  handle?: SceneFileHandle | null;
  suggestedBaseName?: string;
}) {
  const extension = getSceneFileExtension(format);
  const fileName = `${
    normalizeSceneFileBaseName(suggestedBaseName)
  }${extension}`;
  const pickerWindow = window as FilePickerWindow;

  try {
    if (handle) {
      const contents = await encodeSceneFileContents({
        contents: await getContents(),
        fileName: handle.name,
        format,
        archiveKk
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();

      return {
        archived: format === "kk" && archiveKk,
        format,
        handle,
        name: handle.name
      };
    }

    if (pickerWindow.showSaveFilePicker) {
      const selectedHandle = await pickerWindow.showSaveFilePicker({
        excludeAcceptAllOption: true,
        id: SAVE_PICKER_ID,
        startIn: "downloads",
        suggestedName: fileName,
        types: getFileTypes(format)
      });
      const contents = await encodeSceneFileContents({
        contents: await getContents(),
        fileName: selectedHandle.name,
        format,
        archiveKk
      });
      const writable = await selectedHandle.createWritable();
      await writable.write(contents);
      await writable.close();

      return {
        format,
        handle: selectedHandle,
        name: selectedHandle.name,
        archived: format === "kk" && archiveKk
      };
    }

    const contents = await encodeSceneFileContents({
      contents: await getContents(),
      fileName,
      format,
      archiveKk
    });
    triggerDownload(
      contents,
      fileName,
      getSceneFileMimeType(format, archiveKk)
    );

    return {
      archived: format === "kk" && archiveKk,
      format,
      name: fileName
    };
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }

    throw error;
  }
}

function chooseFallbackSceneFile(format?: SceneFileFormat) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }

      settled = true;
      window.removeEventListener("focus", handleWindowFocus);
      input.remove();
      resolve(file);
    };
    const handleWindowFocus = () => {
      window.setTimeout(() => finish(input.files?.[0] ?? null), 0);
    };

    input.accept = format === "kk"
      ? `${KIZKATT_SCENE_FILE_EXTENSION},${KIZKATT_SCENE_MIME_TYPE}`
      : format === "svg"
        ? `${SVG_FILE_EXTENSION},image/svg+xml`
        : `${KIZKATT_SCENE_FILE_EXTENSION},${SVG_FILE_EXTENSION},${KIZKATT_SCENE_MIME_TYPE},image/svg+xml`;
    input.hidden = true;
    input.type = "file";
    input.addEventListener("change", () => finish(input.files?.[0] ?? null), {
      once: true
    });
    document.body.append(input);
    window.addEventListener("focus", handleWindowFocus, { once: true });
    input.click();
  });
}

export async function loadSceneFile({
  format
}: {
  format?: SceneFileFormat;
} = {}) {
  const pickerWindow = window as FilePickerWindow;

  try {
    let handle: SceneFileHandle | undefined;
    let file: File | null;

    if (pickerWindow.showOpenFilePicker) {
      [handle] = await pickerWindow.showOpenFilePicker({
        excludeAcceptAllOption: true,
        id: LOAD_PICKER_ID,
        multiple: false,
        startIn: "downloads",
        types: getFileTypes(format)
      });
      file = handle ? await handle.getFile() : null;
    } else {
      file = await chooseFallbackSceneFile(format);
    }

    if (!file) {
      return null;
    }

    const detectedFormat = getSceneFileFormat(file.name);

    if (!detectedFormat || (format && detectedFormat !== format)) {
      return null;
    }

    const fileContents = await readSceneFileContents(file, detectedFormat);

    return {
      ...fileContents,
      file,
      format: detectedFormat,
      handle,
      name: file.name
    };
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }

    throw error;
  }
}
