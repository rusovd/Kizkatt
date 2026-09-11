import {
  KIZKATT_SCENE_FILE_EXTENSION,
  KIZKATT_SCENE_MIME_TYPE,
  SVG_IMAGE_MIME_TYPE
} from "kizkatt-graphic-engine";

export type SceneFileFormat = "kk" | "svg";

export type SceneFileHandle = {
  createWritable: () => Promise<{
    close: () => Promise<void>;
    write: (contents: Blob | string) => Promise<void>;
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
const DEFAULT_SCENE_FILE_NAME = "untitled";
const SVG_FILE_EXTENSION = ".svg";
const SCENE_FILE_TYPES: FilePickerOptions["types"] = [
  {
    accept: { [KIZKATT_SCENE_MIME_TYPE]: [KIZKATT_SCENE_FILE_EXTENSION] },
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

function getExtension(format: SceneFileFormat) {
  return format === "svg" ? SVG_FILE_EXTENSION : KIZKATT_SCENE_FILE_EXTENSION;
}

function getMimeType(format: SceneFileFormat) {
  return format === "svg" ? SVG_IMAGE_MIME_TYPE : KIZKATT_SCENE_MIME_TYPE;
}

function stripSupportedExtension(fileName: string) {
  return fileName.replace(/\.(?:kk|svg)$/i, "");
}

function normalizeBaseName(value?: string) {
  const baseName = stripSupportedExtension(value?.trim() || DEFAULT_SCENE_FILE_NAME)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return baseName || DEFAULT_SCENE_FILE_NAME;
}

export function getSceneFileFormat(fileName: string): SceneFileFormat | null {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName.endsWith(KIZKATT_SCENE_FILE_EXTENSION)) {
    return "kk";
  }

  return normalizedName.endsWith(SVG_FILE_EXTENSION) ? "svg" : null;
}

function triggerDownload(contents: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
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

export async function saveSceneFile({
  format = "kk",
  getContents,
  handle,
  suggestedBaseName
}: {
  format?: SceneFileFormat;
  getContents: () => Promise<string> | string;
  handle?: SceneFileHandle | null;
  suggestedBaseName?: string;
}) {
  const extension = getExtension(format);
  const fileName = `${normalizeBaseName(suggestedBaseName)}${extension}`;
  const pickerWindow = window as FilePickerWindow;

  try {
    if (handle) {
      const contents = await getContents();
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();

      return { format, handle, name: handle.name };
    }

    if (pickerWindow.showSaveFilePicker) {
      const selectedHandle = await pickerWindow.showSaveFilePicker({
        excludeAcceptAllOption: true,
        id: SAVE_PICKER_ID,
        startIn: "downloads",
        suggestedName: fileName,
        types: getFileTypes(format)
      });
      const contents = await getContents();
      const writable = await selectedHandle.createWritable();
      await writable.write(contents);
      await writable.close();

      return {
        format,
        handle: selectedHandle,
        name: selectedHandle.name
      };
    }

    const contents = await getContents();
    triggerDownload(contents, fileName, getMimeType(format));

    return { format, name: fileName };
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

    return {
      contents: await file.text(),
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
