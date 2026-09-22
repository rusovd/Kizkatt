import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
  BitmapTextureFill,
  BitmapTextureSize,
  TextureCatalog,
  TextureCatalogTexture
} from "kizkatt-graphic-engine";
import {
  createBitmapTextureFillFromCatalogTexture,
  filterTextureCatalogEntries,
  getTextureCatalogEntries,
  groupTextureCatalogEntries,
  type TextureCatalogEntry
} from "kizkatt-graphic-engine";
import {
  getStoredTextureCategoryId,
  getStoredTextureCollectionId,
  getStoredTextureId,
  storeTextureCategoryId,
  storeTextureCollectionId,
  storeTextureId
} from "../../platform/storage";

import { useI18n } from "../../i18n";
import { CheckIcon, ChevronDownIcon, ImageIcon } from "../icons";
import { Panel } from "../../components/Panel";

const PANEL_ID = "texture-library";

function getCategoryOptions(
  catalog: TextureCatalog,
  collectionId: string
) {
  return catalog.collections
    .filter(
      (collection) =>
        collectionId === "all" || collection.id === collectionId
    )
    .flatMap((collection) =>
      collection.categories.map((category) => ({
        categoryId: category.id,
        collectionId: collection.id,
        label:
          collectionId === "all"
            ? `${category.name} (${collection.name})`
            : category.name,
        value:
          collectionId === "all"
            ? `${collection.id}:${category.id}`
            : category.id
      }))
    );
}

function TextureCollectionPicker({
  catalog,
  label,
  onChange,
  value
}: {
  catalog: TextureCatalog;
  label: string;
  onChange: (collectionId: string) => void;
  value: string;
}) {
  const { strings } = useI18n();
  const [open, setOpen] = useState(false);
  const options = [
    { id: "all", name: strings.textureLibrary.all },
    ...catalog.collections
  ];
  const selectedName =
    options.find((option) => option.id === value)?.name ??
    strings.textureLibrary.all;

  return (
    <div
      className="kizkatt-texture-collection-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="kizkatt-texture-collection-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedName}</span>
        {ChevronDownIcon}
      </button>
      {open && (
        <div
          className="kizkatt-texture-collection-options"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const selected = option.id === value;

            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span className="kizkatt-texture-collection-check">
                  {selected ? CheckIcon : null}
                </span>
                <span>{option.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getInitialCategoryId(catalog: TextureCatalog, collectionId: string) {
  const storedCategoryId = getStoredTextureCategoryId(collectionId);
  const options = getCategoryOptions(catalog, collectionId);
  const storedOption = options.find(
    (option) => option.value === storedCategoryId
  );

  if (storedOption) {
    return storedOption.value;
  }

  
  const legacyStoredOption = options.find(
    (option) => option.categoryId === storedCategoryId
  );

  return legacyStoredOption?.value ?? "all";
}

function getInitialCollectionId(
  catalog: TextureCatalog,
  fallbackCollectionId: string,
  activeEntry?: TextureCatalogEntry
) {
  const collectionId =
    activeEntry?.collectionId ??
    getStoredTextureCollectionId() ??
    fallbackCollectionId;

  return catalog.collections.some(
    (collection) => collection.id === collectionId
  )
    ? collectionId
    : fallbackCollectionId;
}

export function TextureLibraryPopover({
  activeTexture,
  anchorElement,
  catalog,
  getTextureById,
  getTextureThumbnailSource,
  initialCollectionId,
  onClose,
  onCollectionChange,
  onTextureChange,
  reopenKey,
  targetSize
}: {
  activeTexture?: BitmapTextureFill;
  anchorElement: HTMLElement | null;
  catalog: TextureCatalog;
  getTextureById: (textureId: string) => TextureCatalogTexture | null;
  getTextureThumbnailSource: (
    texture: TextureCatalogTexture
  ) => string | null;
  initialCollectionId: string;
  onClose: () => void;
  onCollectionChange?: (collectionName: string) => void;
  onTextureChange: (texture: BitmapTextureFill) => void;
  reopenKey: number;
  targetSize: BitmapTextureSize;
}) {
  const { strings } = useI18n();
  const popupRef = useRef<HTMLElement | null>(null);
  const entries = useMemo(
    () => getTextureCatalogEntries(catalog),
    [catalog]
  );
  const activeCatalogTexture = activeTexture
    ? getTextureById(activeTexture.textureId)
    : null;
  const activeEntry = activeCatalogTexture
    ? entries.find((entry) => entry.texture.id === activeCatalogTexture.id)
    : undefined;
  const openingCollectionId = getInitialCollectionId(
    catalog,
    initialCollectionId,
    activeEntry
  );
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState(openingCollectionId);
  const [categoryId, setCategoryId] = useState(() =>
    activeEntry?.collectionId === openingCollectionId
      ? activeEntry.categoryId
      : getInitialCategoryId(catalog, openingCollectionId)
  );
  const [thumbnailColumns, setThumbnailColumns] = useState(2);
  const categoryOptions = useMemo(
    () => getCategoryOptions(catalog, collectionId),
    [catalog, collectionId]
  );
  const selectedCategory = categoryOptions.find(
    (option) => option.value === categoryId
  );
  const filteredEntries = useMemo(
    () =>
      filterTextureCatalogEntries(entries, {
        categoryId: selectedCategory?.categoryId ?? categoryId,
        collectionId: selectedCategory?.collectionId ?? collectionId,
        search
      }),
    [categoryId, collectionId, entries, search, selectedCategory]
  );
  const groupedEntries = useMemo(
    () => groupTextureCatalogEntries(filteredEntries),
    [filteredEntries]
  );
  const rememberedCollectionId = getStoredTextureCollectionId();
  const rememberedTextureId =
    collectionId === "all"
      ? rememberedCollectionId
        ? getStoredTextureId(rememberedCollectionId)
        : null
      : getStoredTextureId(collectionId);
  const highlightedTextureId =
    activeEntry &&
    (collectionId === "all" || activeEntry.collectionId === collectionId)
      ? activeEntry.texture.id
      : rememberedTextureId;

  useEffect(() => {
    const nextCollectionId = getInitialCollectionId(
      catalog,
      initialCollectionId,
      activeEntry
    );

    setCollectionId(nextCollectionId);
    setCategoryId(
      activeEntry?.collectionId === nextCollectionId
        ? activeEntry.categoryId
        : getInitialCategoryId(catalog, nextCollectionId)
    );
  }, [
    activeEntry?.categoryId,
    activeEntry?.collectionId,
    activeEntry?.texture.id,
    catalog,
    initialCollectionId,
    reopenKey
  ]);

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
    storeTextureCollectionId(entry.collectionId);
    storeTextureCategoryId(entry.collectionId, entry.categoryId);
    storeTextureId(entry.collectionId, entry.texture.id);
    onCollectionChange?.(entry.collectionName);
    onTextureChange(
      createBitmapTextureFillFromCatalogTexture({
        base: activeTexture,
        targetSize,
        texture: entry.texture
      })
    );
  };

  return (
    <Panel
      anchorElement={anchorElement}
      variant="popover"
      id={PANEL_ID}
      defaultOrientation="vertical"
      reopenKey={reopenKey}
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

          <TextureCollectionPicker
            catalog={catalog}
            label={strings.textureLibrary.collection}
            value={collectionId}
            onChange={(nextCollectionId) => {
              setCollectionId(nextCollectionId);
              setCategoryId(getInitialCategoryId(catalog, nextCollectionId));
              onCollectionChange?.(
                nextCollectionId === "all"
                  ? strings.textureLibrary.all
                  : catalog.collections.find(
                      (collection) => collection.id === nextCollectionId
                    )?.name ?? nextCollectionId
              );
            }}
          />

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
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
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
                    const source = getTextureThumbnailSource(entry.texture);
                    const title = [
                      entry.texture.name,
                      entry.texture.originalFileName
                        ? `${strings.textureLibrary.originalFileName}: ${entry.texture.originalFileName}`
                        : null,
                      entry.texture.author
                        ? `${strings.textureLibrary.author}: ${entry.texture.author}`
                        : null,
                      entry.texture.from
                        ? `${strings.textureLibrary.from}: ${entry.texture.from}`
                        : null
                    ].filter(Boolean).join("\n");

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
                        title={title}
                        onClick={() => selectCatalogTexture(entry)}
                      >
                        {source ? (
                          <img
                            src={source}
                            alt=""
                            decoding="async"
                            loading="lazy"
                          />
                        ) : (
                          ImageIcon
                        )}
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
    </Panel>
  );
}
