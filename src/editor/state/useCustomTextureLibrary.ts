import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TextureCatalog,
  TextureCatalogCategory,
  TextureCatalogCollection,
  TextureCatalogTexture
} from "kizkatt-graphic-engine";
import type {
  SvgTextureOption,
  SvgTextureSaveRequest,
  TextureImportRequest
} from "kizkatt-ui";

import {
  browserCustomTextureStorage,
  type CustomTextureStorage,
  type StoredCustomTexture
} from "../platform/customTextureStorage";
import {
  browserCustomSvgTextureStorage,
  type CustomSvgTextureStorage
} from "../platform/customSvgTextureStorage";

type TextureLibraryBase = {
  catalog: TextureCatalog;
  defaultCollectionId: string;
  getTextureById: (textureId: string) => TextureCatalogTexture | null;
  getTextureSource: (textureId: string) => string | null;
  getTextureThumbnailSource: (
    texture: TextureCatalogTexture
  ) => string | null;
  svgTextures: readonly SvgTextureOption[];
};

function slug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "") || "category";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCategorySequence(
  category: Pick<TextureCatalogCategory, "name" | "textures">
) {
  const numberedName = new RegExp(
    `^${escapeRegExp(category.name)}\\s+(\\d+)$`,
    "i"
  );

  return category.textures.reduce((highest, texture) => {
    const match = numberedName.exec(texture.name.trim());
    const sequence = match ? Number.parseInt(match[1], 10) : 0;

    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0) + 1;
}

function getUniqueId(value: string, existingIds: readonly string[]) {
  const baseId = slug(value);
  const ids = new Set(existingIds);
  let candidate = baseId;
  let suffix = 2;

  while (ids.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function getSafeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "Texture";
}

function getFileExtension(fileName: string) {
  return /\.[a-z0-9]+$/i.exec(fileName)?.[0].toLocaleLowerCase() ?? "";
}

function getUniqueTextureId(
  collectionId: string,
  categoryId: string,
  name: string
) {
  const uniquePart = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `custom.${slug(collectionId)}.${slug(categoryId)}.${slug(name)}.${uniquePart}`;
}

export function mergeCustomTexturesIntoCatalog(
  catalog: TextureCatalog,
  storedTextures: readonly StoredCustomTexture[]
): TextureCatalog {
  if (storedTextures.length === 0) {
    return catalog;
  }

  const recordsByCollection = new Map<string, StoredCustomTexture[]>();

  storedTextures.forEach((record) => {
    const records = recordsByCollection.get(record.collectionId) ?? [];

    records.push(record);
    recordsByCollection.set(record.collectionId, records);
  });

  const collections = catalog.collections.map((collection) => {
    const records = recordsByCollection.get(collection.id);

    if (!records?.length) {
      return collection;
    }

    const categories = collection.categories.map((category) => ({
      ...category,
      textures: [
        ...category.textures,
        ...records
          .filter((record) => record.categoryId === category.id)
          .map((record) => record.texture)
      ]
    }));
    const knownCategoryIds = new Set(
      categories.map((category) => category.id)
    );

    records.forEach((record) => {
      if (knownCategoryIds.has(record.categoryId)) {
        return;
      }

      const categoryRecords = records.filter(
        (candidate) => candidate.categoryId === record.categoryId
      );

      categories.push({
        id: record.categoryId,
        name: record.categoryName,
        textures: categoryRecords.map((candidate) => candidate.texture)
      });
      knownCategoryIds.add(record.categoryId);
    });

    return { ...collection, categories };
  });
  const knownCollectionIds = new Set(
    collections.map((collection) => collection.id)
  );

  storedTextures.forEach((record) => {
    if (knownCollectionIds.has(record.collectionId)) {
      return;
    }

    const collectionRecords = storedTextures.filter(
      (candidate) => candidate.collectionId === record.collectionId
    );
    const categories: TextureCatalogCategory[] = [];
    const knownCategoryIds = new Set<string>();

    collectionRecords.forEach((collectionRecord) => {
      if (knownCategoryIds.has(collectionRecord.categoryId)) {
        return;
      }

      categories.push({
        id: collectionRecord.categoryId,
        name: collectionRecord.categoryName,
        textures: collectionRecords
          .filter(
            (candidate) =>
              candidate.categoryId === collectionRecord.categoryId
          )
          .map((candidate) => candidate.texture)
      });
      knownCategoryIds.add(collectionRecord.categoryId);
    });
    collections.push({
      categories,
      id: record.collectionId,
      name: record.collectionName ?? record.collectionId
    });
    knownCollectionIds.add(record.collectionId);
  });

  return { ...catalog, collections };
}

export function createStoredCustomTexture({
  catalog,
  request
}: {
  catalog: TextureCatalog;
  request: TextureImportRequest;
}): StoredCustomTexture {
  const requestedCollectionName = request.collectionName?.trim();
  const matchingNamedCollection = requestedCollectionName
    ? catalog.collections.find(
        (collection) =>
          collection.name.toLocaleLowerCase() ===
          requestedCollectionName.toLocaleLowerCase()
      )
    : undefined;
  const existingCollection = request.collectionId
    ? catalog.collections.find(
        (collection) => collection.id === request.collectionId
      )
    : matchingNamedCollection;

  if (request.collectionId && !existingCollection) {
    throw new Error(`Unknown texture collection: ${request.collectionId}`);
  }

  if (!existingCollection && !requestedCollectionName) {
    throw new Error("A texture collection is required.");
  }

  const collection: TextureCatalogCollection = existingCollection ?? {
    categories: [],
    id: getUniqueId(
      requestedCollectionName as string,
      catalog.collections.map((candidate) => candidate.id)
    ),
    name: requestedCollectionName as string
  };

  const requestedCategoryName = request.categoryName?.trim();
  const matchingNamedCategory = requestedCategoryName
    ? collection.categories.find(
        (category) =>
          category.name.toLocaleLowerCase() ===
          requestedCategoryName.toLocaleLowerCase()
      )
    : undefined;
  const existingCategory = request.categoryId
    ? collection.categories.find(
        (category) => category.id === request.categoryId
      )
    : matchingNamedCategory;

  if (request.categoryId && !existingCategory) {
    throw new Error(`Unknown texture category: ${request.categoryId}`);
  }

  if (!existingCategory && !requestedCategoryName) {
    throw new Error("A texture category is required.");
  }

  const category: TextureCatalogCategory = existingCategory ?? {
    id: getUniqueId(
      requestedCategoryName as string,
      collection.categories.map((candidate) => candidate.id)
    ),
    name: requestedCategoryName as string,
    textures: []
  };
  const sequence = getCategorySequence(category);
  const sequenceLabel = String(sequence).padStart(3, "0");
  const name = `${category.name} ${sequenceLabel}`;
  const fileBaseName = `${getSafeFilePart(category.name)}_${sequenceLabel}`;
  const texture: TextureCatalogTexture = {
    author: request.author,
    custom: true,
    file: `${getSafeFilePart(category.name)}/${fileBaseName}${getFileExtension(
      request.originalFileName
    )}`,
    from: request.from,
    height: request.naturalSize.height,
    id: getUniqueTextureId(collection.id, category.id, name),
    name,
    originalFileName: request.originalFileName,
    width: request.naturalSize.width
  };

  return {
    categoryId: category.id,
    categoryName: category.name,
    collectionId: collection.id,
    collectionName: collection.name,
    source: request.source,
    texture
  };
}

export function useCustomTextureLibrary(
  baseLibrary: TextureLibraryBase,
  storage: CustomTextureStorage = browserCustomTextureStorage,
  svgStorage: CustomSvgTextureStorage = browserCustomSvgTextureStorage
) {
  const [storedTextures, setStoredTextures] = useState<StoredCustomTexture[]>(
    []
  );
  const storedTexturesRef = useRef(storedTextures);
  const [storedSvgTextures, setStoredSvgTextures] = useState<
    SvgTextureOption[]
  >([]);
  const storedSvgTexturesRef = useRef(storedSvgTextures);
  const catalog = useMemo(
    () => mergeCustomTexturesIntoCatalog(baseLibrary.catalog, storedTextures),
    [baseLibrary.catalog, storedTextures]
  );
  const recordByTextureId = useMemo(
    () =>
      new Map(
        storedTextures.map((record) => [record.texture.id, record] as const)
      ),
    [storedTextures]
  );
  const svgTextureById = useMemo(
    () =>
      new Map(
        storedSvgTextures.map((texture) => [texture.id, texture] as const)
      ),
    [storedSvgTextures]
  );
  const svgTextures = useMemo(
    () => [...baseLibrary.svgTextures, ...storedSvgTextures],
    [baseLibrary.svgTextures, storedSvgTextures]
  );

  useEffect(() => {
    let active = true;

    void storage.load().then(
      (loadedTextures) => {
        if (!active || loadedTextures.length === 0) {
          return;
        }

        setStoredTextures((currentTextures) => {
          const currentIds = new Set(
            currentTextures.map((record) => record.texture.id)
          );
          const nextTextures = [
            ...loadedTextures.filter(
              (record) => !currentIds.has(record.texture.id)
            ),
            ...currentTextures
          ];

          storedTexturesRef.current = nextTextures;
          return nextTextures;
        });
      },
      () => undefined
    );

    return () => {
      active = false;
    };
  }, [storage]);

  useEffect(() => {
    let active = true;

    void svgStorage.load().then(
      (loadedTextures) => {
        if (!active || loadedTextures.length === 0) {
          return;
        }

        setStoredSvgTextures((currentTextures) => {
          const currentIds = new Set(
            currentTextures.map((texture) => texture.id)
          );
          const nextTextures = [
            ...loadedTextures.filter(
              (texture) => !currentIds.has(texture.id)
            ),
            ...currentTextures
          ];

          storedSvgTexturesRef.current = nextTextures;
          return nextTextures;
        });
      },
      () => undefined
    );

    return () => {
      active = false;
    };
  }, [svgStorage]);

  const addTexture = useCallback(
    (request: TextureImportRequest) => {
      const currentCatalog = mergeCustomTexturesIntoCatalog(
        baseLibrary.catalog,
        storedTexturesRef.current
      );
      const record = createStoredCustomTexture({
        catalog: currentCatalog,
        request
      });
      const nextTextures = [...storedTexturesRef.current, record];

      storedTexturesRef.current = nextTextures;
      setStoredTextures(nextTextures);
      void storage.save(record).catch(() => undefined);

      return record.texture;
    },
    [baseLibrary.catalog, storage]
  );
  const addSvgTexture = useCallback(
    (request: SvgTextureSaveRequest) => {
      const uniquePart = globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const texture: SvgTextureOption = {
        ...request,
        id: `svg.custom.${uniquePart}`
      };
      const nextTextures = [...storedSvgTexturesRef.current, texture];

      storedSvgTexturesRef.current = nextTextures;
      setStoredSvgTextures(nextTextures);
      void svgStorage.save(texture).catch(() => undefined);

      return texture;
    },
    [svgStorage]
  );
  const getTextureById = useCallback(
    (textureId: string) =>
      recordByTextureId.get(textureId)?.texture ??
      baseLibrary.getTextureById(textureId),
    [baseLibrary, recordByTextureId]
  );
  const getTextureSource = useCallback(
    (textureId: string) =>
      recordByTextureId.get(textureId)?.source ??
      svgTextureById.get(textureId)?.source ??
      baseLibrary.getTextureSource(textureId),
    [baseLibrary, recordByTextureId, svgTextureById]
  );
  const getTextureThumbnailSource = useCallback(
    (texture: TextureCatalogTexture) =>
      recordByTextureId.get(texture.id)?.source ??
      baseLibrary.getTextureThumbnailSource(texture),
    [baseLibrary, recordByTextureId]
  );

  return {
    ...baseLibrary,
    addTexture,
    addSvgTexture,
    catalog,
    getTextureById,
    getTextureSource,
    getTextureThumbnailSource,
    svgTextures
  };
}
