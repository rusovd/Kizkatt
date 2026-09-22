import { useEffect, useId, useState, type FormEvent } from "react";
import type { BitmapTextureSize } from "kizkatt-graphic-engine";

import { useI18n } from "../../i18n";

const NEW_OPTION_VALUE = "__new__";

export type TextureImportCategoryOption = {
  id: string;
  name: string;
};

export type TextureImportCollectionOption = {
  categories: readonly TextureImportCategoryOption[];
  id: string;
  name: string;
};

export type TextureImportMetadata = {
  author: string;
  categoryId?: string;
  categoryName?: string;
  collectionId?: string;
  collectionName?: string;
  from: string;
};

export type TextureImportRequest = TextureImportMetadata & {
  naturalSize: BitmapTextureSize;
  originalFileName: string;
  source: string;
};

export function TextureImportDialog({
  collections,
  fileName,
  onCancel,
  onConfirm
}: {
  collections: readonly TextureImportCollectionOption[];
  fileName: string;
  onCancel: () => void;
  onConfirm: (metadata: TextureImportMetadata) => void;
}) {
  const { strings } = useI18n();
  const titleId = useId();
  const [author, setAuthor] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [collectionValue, setCollectionValue] = useState("");
  const [from, setFrom] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const creatingCollection = collectionValue === NEW_OPTION_VALUE;
  const creatingCategory =
    creatingCollection || categoryValue === NEW_OPTION_VALUE;
  const selectedCollection = collections.find(
    (collection) => collection.id === collectionValue
  );
  const hasCollection = creatingCollection
    ? newCollectionName.trim().length > 0
    : Boolean(selectedCollection);
  const hasCategory = creatingCategory
    ? newCategoryName.trim().length > 0
    : categoryValue.length > 0;
  const canSubmit = hasCollection && hasCategory;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onConfirm({
      author: author.trim(),
      ...(creatingCategory
        ? { categoryName: newCategoryName.trim() }
        : { categoryId: categoryValue }),
      ...(creatingCollection
        ? { collectionName: newCollectionName.trim() }
        : { collectionId: collectionValue }),
      from: from.trim()
    });
  };

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <form
        aria-labelledby={titleId}
        aria-modal="true"
        className="kizkatt-confirmation-dialog kizkatt-texture-import-dialog"
        onSubmit={submit}
        role="dialog"
      >
        <h2 id={titleId}>{strings.textureLibrary.addTexture}</h2>

        <div className="kizkatt-texture-import-fields">
          <label>
            <span>{strings.textureLibrary.originalFileName}</span>
            <input readOnly value={fileName} />
          </label>

          <label>
            <span>{strings.textureLibrary.collection}</span>
            <select
              required
              autoFocus
              value={collectionValue}
              onChange={(event) => {
                setCollectionValue(event.target.value);
                setCategoryValue("");
                setNewCategoryName("");
              }}
            >
              <option disabled value="">
                {strings.textureLibrary.chooseCollection}
              </option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
              <option value={NEW_OPTION_VALUE}>
                {strings.textureLibrary.createCollection}
              </option>
            </select>
          </label>

          {creatingCollection && (
            <label>
              <span>{strings.textureLibrary.newCollection}</span>
              <input
                required
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder={strings.textureLibrary.newCollectionPlaceholder}
              />
            </label>
          )}

          {selectedCollection && (
            <label>
              <span>{strings.textureLibrary.category}</span>
              <select
                required
                value={categoryValue}
                onChange={(event) => setCategoryValue(event.target.value)}
              >
                <option disabled value="">
                  {strings.textureLibrary.chooseCategory}
                </option>
                {selectedCollection.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={NEW_OPTION_VALUE}>
                  {strings.textureLibrary.createCategory}
                </option>
              </select>
            </label>
          )}

          {creatingCategory && (
            <label>
              <span>{strings.textureLibrary.newCategory}</span>
              <input
                required
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={strings.textureLibrary.newCategoryPlaceholder}
              />
            </label>
          )}

          <label>
            <span>{strings.textureLibrary.author}</span>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </label>

          <label>
            <span>{strings.textureLibrary.from}</span>
            <input
              type="url"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              placeholder="https://"
            />
          </label>
        </div>

        <p className="kizkatt-texture-import-hint">
          {strings.textureLibrary.categoryNamingHint}
        </p>

        <div className="kizkatt-confirmation-dialog-actions">
          <button type="button" onClick={onCancel}>
            {strings.textureLibrary.cancel}
          </button>
          <button className="is-primary" disabled={!canSubmit} type="submit">
            {strings.textureLibrary.addTexture}
          </button>
        </div>
      </form>
    </div>
  );
}
