import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  BitmapTextureFill,
  BitmapTextureSize
} from "kizkatt-graphic-engine";
import {
  createBitmapTextureFillFromCatalogTexture,
  filterTextureCatalogEntries,
  getStoredTextureCategoryId,
  getStoredTextureId,
  getTextureCatalogEntries,
  groupTextureCatalogEntries,
  storeTextureCategoryId,
  storeTextureId,
  type TextureCatalogEntry
} from "kizkatt-graphic-editor";

import {
  getTextureById,
  getTextureThumbnailUrl,
  MONOCHROME_TEXTURE_COLLECTION_ID,
  textureCatalog
} from "../../assets/textures/monochrome/textureCatalog";
import { useI18n } from "../../i18n";
import { ImageIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

const PANEL_ID = "texture-library";

function getInitialCategoryId(collectionId: string) {
  const storedCategoryId = getStoredTextureCategoryId(collectionId);
  const categoryExists = textureCatalog.collections
    .filter(
      (collection) =>
        collectionId === "all" || collection.id === collectionId
    )
    .some((collection) =>
      collection.categories.some(
        (category) => category.id === storedCategoryId
      )
    );

  return categoryExists ? storedCategoryId ?? "all" : "all";
}

export function TextureLibraryPopover({
  activeTexture,
  anchorElement,
  initialCollectionId = MONOCHROME_TEXTURE_COLLECTION_ID,
  onClose,
  onTextureChange,
  reopenKey,
  targetSize
}: {
  activeTexture?: BitmapTextureFill;
  anchorElement: HTMLElement | null;
  initialCollectionId?: string;
  onClose: () => void;
  onTextureChange: (texture: BitmapTextureFill) => void;
  reopenKey: number;
  targetSize: BitmapTextureSize;
}) {
  const { strings } = useI18n();
  const popupRef = useRef<HTMLElement | null>(null);
  const entries = useMemo(
    () => getTextureCatalogEntries(textureCatalog),
    []
  );
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState(initialCollectionId);
  const [categoryId, setCategoryId] = useState(() =>
    getInitialCategoryId(initialCollectionId)
  );
  const [thumbnailColumns, setThumbnailColumns] = useState(2);
  const filteredEntries = filterTextureCatalogEntries(entries, {
    categoryId,
    collectionId,
    search
  });
  const groupedEntries = groupTextureCatalogEntries(filteredEntries);
  const activeCatalogTexture = activeTexture
    ? getTextureById(activeTexture.textureId)
    : null;
  const activeEntry = activeCatalogTexture
    ? entries.find((entry) => entry.texture.id === activeCatalogTexture.id)
    : null;
  const rememberedTextureId =
    collectionId === "all" ? null : getStoredTextureId(collectionId);
  const highlightedTextureId =
    activeEntry &&
    (collectionId === "all" || activeEntry.collectionId === collectionId)
      ? activeEntry.texture.id
      : rememberedTextureId;

  useEffect(() => {
    setCollectionId(initialCollectionId);
    setCategoryId(getInitialCategoryId(initialCollectionId));
  }, [initialCollectionId, reopenKey]);

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !popupRef.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePointerDown,
        true
      );
  }, [onClose]);

  const selectCatalogTexture = (entry: TextureCatalogEntry) => {
    storeTextureId(entry.collectionId, entry.texture.id);
    onTextureChange(
      createBitmapTextureFillFromCatalogTexture({
        base: activeTexture,
        targetSize,
        texture: entry.texture
      })
    );
  };

  return (
    <DraggablePanel
      anchorElement={anchorElement}
      id={PANEL_ID}
      defaultOrientation="vertical"
      draggable={false}
      orientationChangeable={false}
      reopenKey={reopenKey}
      showDragHandle={false}
      title={strings.textureLibrary.title}
    >
      {({ chrome, orientation }) => (
        <section
          ref={popupRef}
          className={`kizkatt-texture-library kizkatt-texture-library--${orientation}`}
          role="dialog"
          aria-label={strings.textureLibrary.title}
        >
          {chrome}

          <input
            className="kizkatt-texture-search"
            aria-label={strings.textureLibrary.search}
            placeholder={strings.textureLibrary.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label={strings.textureLibrary.collection}
            value={collectionId}
            onChange={(event) => {
              const nextCollectionId = event.target.value;

              setCollectionId(nextCollectionId);
              setCategoryId(getInitialCategoryId(nextCollectionId));
            }}
          >
            <option value="all">{strings.textureLibrary.all}</option>
            {textureCatalog.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>

          <select
            aria-label={strings.textureLibrary.category}
            value={categoryId}
            onChange={(event) => {
              const nextCategoryId = event.target.value;

              setCategoryId(nextCategoryId);
              storeTextureCategoryId(collectionId, nextCategoryId);
            }}
          >
            <option value="all">{strings.textureLibrary.allCategories}</option>
            {textureCatalog.collections
              .filter(
                (collection) =>
                  collectionId === "all" || collection.id === collectionId
              )
              .flatMap((collection) => collection.categories)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>

          <div
            className="kizkatt-texture-library-groups"
            style={
              {
                "--kizkatt-texture-columns": thumbnailColumns
              } as CSSProperties
            }
          >
            {[...groupedEntries.entries()].map(([key, group]) => (
              <section key={key} className="kizkatt-texture-library-group">
                <h3>
                  {`${group[0].collectionName} / ${group[0].categoryName}`}
                </h3>
                <div className="kizkatt-texture-grid">
                  {group.map((entry) => {
                    const source = getTextureThumbnailUrl(entry.texture);

                    return (
                      <button
                        key={entry.texture.id}
                        type="button"
                        className={
                          highlightedTextureId === entry.texture.id
                            ? "is-active"
                            : undefined
                        }
                        aria-label={entry.texture.name}
                        title={entry.texture.name}
                        onClick={() => selectCatalogTexture(entry)}
                      >
                        {source ? <img src={source} alt="" /> : ImageIcon}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {filteredEntries.length === 0 && (
              <p className="kizkatt-texture-library-empty">
                {strings.textureLibrary.empty}
              </p>
            )}
          </div>
          <footer className="kizkatt-texture-library-size">
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              aria-label={strings.textureLibrary.thumbnailColumns}
              value={thumbnailColumns}
              onChange={(event) =>
                setThumbnailColumns(Number(event.target.value))
              }
            />
            <output>{thumbnailColumns}</output>
          </footer>
        </section>
      )}
    </DraggablePanel>
  );
}
