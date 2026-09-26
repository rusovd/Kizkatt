import type { SvgTextureOption } from "kizkatt-ui";

export type CustomSvgTextureStorage = {
  load: () => Promise<SvgTextureOption[]>;
  save: (texture: SvgTextureOption) => Promise<void>;
};

const DATABASE_NAME = "kizkatt-svg-fill-library";
const DATABASE_VERSION = 1;
const SVG_TEXTURE_STORE_NAME = "svg-fills";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSvgTextureOption(value: unknown): value is SvgTextureOption {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.source === "string"
  );
}

function requestResult<Result>(request: IDBRequest<Result>) {
  return new Promise<Result>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () => reject(transaction.error));
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(SVG_TEXTURE_STORE_NAME)) {
        database.createObjectStore(SVG_TEXTURE_STORE_NAME, {
          keyPath: "id"
        });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

export const browserCustomSvgTextureStorage: CustomSvgTextureStorage = {
  async load() {
    if (typeof indexedDB === "undefined") {
      return [];
    }

    const database = await openDatabase();

    try {
      const transaction = database.transaction(
        SVG_TEXTURE_STORE_NAME,
        "readonly"
      );
      const values = await requestResult(
        transaction.objectStore(SVG_TEXTURE_STORE_NAME).getAll()
      );

      return values.filter(isSvgTextureOption);
    } finally {
      database.close();
    }
  },

  async save(texture) {
    if (typeof indexedDB === "undefined") {
      return;
    }

    const database = await openDatabase();

    try {
      const transaction = database.transaction(
        SVG_TEXTURE_STORE_NAME,
        "readwrite"
      );

      transaction.objectStore(SVG_TEXTURE_STORE_NAME).put(texture);
      await waitForTransaction(transaction);
    } finally {
      database.close();
    }
  }
};
