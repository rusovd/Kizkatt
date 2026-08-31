import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  createBitmapTextureFill,
  DEFAULT_BITMAP_TEXTURE_FILL,
  type BitmapTextureFill,
  type BitmapTextureSize
} from "kizkatt-graphic-engine";
import {
  filterTextureCatalogEntries,
  getTextureCatalogEntries,
  groupTextureCatalogEntries,
  type TextureCatalogEntry
} from "kizkatt-graphic-editor";

import {
  getTextureById,
  getTextureThumbnailUrl,
  textureCatalog
} from "../../assets/textures/monochrome/textureCatalog";
import { useI18n } from "../../i18n";
import { ImageIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

const PANEL_ID = "texture-library";

export function TextureLibraryPopover({
  activeTexture,
  onClose,
  onTextureChange,
  reopenKey,
  targetSize
}: {
  activeTexture?: BitmapTextureFill;
  onClose: () => void;
  onTextureChange: (texture: BitmapTextureFill) => void;
  reopenKey: number;
  targetSize: BitmapTextureSize;
}) {
  const { strings } = useI18n();
  const entries = useMemo(
    () => getTextureCatalogEntries(textureCatalog),
    []
  );
  const [search, setSearch] = useState("");
  const [collectionId, setCollectionId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
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
  const selectCatalogTexture = (entry: TextureCatalogEntry) => {
    onTextureChange(
      createBitmapTextureFill({
        base: activeTexture,
        name: entry.texture.name,
        naturalSize: {
          height:
            entry.texture.height ?? DEFAULT_BITMAP_TEXTURE_FILL.height,
          width: entry.texture.width ?? DEFAULT_BITMAP_TEXTURE_FILL.width
        },
        source: undefined,
        targetSize,
        textureId: entry.texture.id
      })
    );
  };

  return (
    <DraggablePanel
      id={PANEL_ID}
      closable
      defaultOrientation="vertical"
      minSize={{ height: 420, width: 380 }}
      onClose={onClose}
      pinnable
      reopenKey={reopenKey}
      resizable
      resizeAxes={{ horizontal: "vertical", vertical: "vertical" }}
      title={strings.textureLibrary.title}
    >
      {({ actions, chrome, orientation }) => (
        <section
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
              setCollectionId(event.target.value);
              setCategoryId("all");
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
            onChange={(event) => setCategoryId(event.target.value)}
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
                          activeCatalogTexture?.id === entry.texture.id
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
          {actions}
        </section>
      )}
    </DraggablePanel>
  );
}
