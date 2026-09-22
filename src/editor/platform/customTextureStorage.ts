import type { TextureCatalogTexture } from "kizkatt-graphic-engine";

export type StoredCustomTexture = {
  categoryId: string;
  categoryName: string;
  collectionId: string;
  collectionName?: string;
  source: string;
  texture: TextureCatalogTexture;
};

export type CustomTextureStorage = {
  load: () => Promise<StoredCustomTexture[]>;
  save: (texture: StoredCustomTexture) => Promise<void>;
};

const DATABASE_NAME = "kizkatt-texture-library";
const DATABASE_VERSION = 1;
const TEXTURE_STORE_NAME = "textures";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredCustomTexture(value: unknown): value is StoredCustomTexture {
  if (!isRecord(value) || !isRecord(value.texture)) {
    return false;
  }

  return (
    typeof value.categoryId === "string" &&
    typeof value.categoryName === "string" &&
    typeof value.collectionId === "string" &&
    (value.collectionName === undefined ||
      typeof value.collectionName === "string") &&
    typeof value.source === "string" &&
    typeof value.texture.file === "string" &&
    typeof value.texture.id === "string" &&
    typeof value.texture.name === "string"
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

      if (!database.objectStoreNames.contains(TEXTURE_STORE_NAME)) {
        database.createObjectStore(TEXTURE_STORE_NAME, {
          keyPath: "texture.id"
        });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

export const browserCustomTextureStorage: CustomTextureStorage = {
  async load() {
    if (typeof indexedDB === "undefined") {
      return [];
    }

    const database = await openDatabase();

    try {
      const transaction = database.transaction(TEXTURE_STORE_NAME, "readonly");
      const values = await requestResult(
        transaction.objectStore(TEXTURE_STORE_NAME).getAll()
      );

      return values.filter(isStoredCustomTexture);
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
      const transaction = database.transaction(TEXTURE_STORE_NAME, "readwrite");

      transaction.objectStore(TEXTURE_STORE_NAME).put(texture);
      await waitForTransaction(transaction);
    } finally {
      database.close();
    }
  }
};
