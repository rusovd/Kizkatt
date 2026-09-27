import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  DEFAULT_SVG_TEXTURE_FILL,
  type BitmapTextureFill,
  type BitmapTextureSize,
  type BitmapTextureTargetTransform,
  type SvgTextureFill
} from "kizkatt-graphic-engine";
import formatXml from "xml-formatter";

import { BitmapTextureCropPreview } from "../../components/BitmapTextureCropPreview";
import { Panel } from "../../components/Panel";
import { useI18n } from "../../i18n";
import {
  createSvgTextureDataUrl,
  getSvgTextureCanvas
} from "../../model/svgTextures";
import {
  getSvgColorAdjustments,
  replaceSvgColor,
  scaleSvgStrokeWidths,
  svgHasEditableStrokes
} from "../../model/svgAdjustments";
import {
  ChevronDownIcon,
  CodeIcon,
  ResetIcon,
  SaveIcon,
  UploadIcon
} from "../icons";

const PANEL_ID = "svg-fill";
const LIBRARY_PANEL_ID = "svg-fill-library";
const SVG_FILE_ACCEPT = ".svg,image/svg+xml";
const DEFAULT_SCREEN_WIDTH = 1920;
const DEFAULT_SCREEN_HEIGHT = 1080;
type SvgTextureEditorTab = "adjustments" | "code";
const SvgCodeEditor = lazy(() =>
  import("../../components/SvgCodeEditor").then((module) => ({
    default: module.SvgCodeEditor
  }))
);

export type SvgTextureOption = {
  code: string;
  id: string;
  name: string;
  source: string;
};

export type SvgTextureSaveRequest = Omit<SvgTextureOption, "id">;

function getSvgCodeFromDataUrl(source?: string) {
  if (!source?.startsWith("data:image/svg+xml")) {
    return null;
  }

  const separator = source.indexOf(",");

  if (separator < 0) {
    return null;
  }

  try {
    const value = source.slice(separator + 1);

    return source.slice(0, separator).includes(";base64")
      ? globalThis.atob(value)
      : decodeURIComponent(value);
  } catch {
    return null;
  }
}

function isValidSvgCode(code: string) {
  if (!code.trim()) {
    return false;
  }

  const document = new DOMParser().parseFromString(code, "image/svg+xml");

  return (
    document.documentElement.localName === "svg" &&
    !document.querySelector("parsererror")
  );
}

function formatSvgCode(code: string) {
  try {
    return formatXml(code.replace(/^\uFEFF/, ""), {
      attributeQuotes: "double",
      indentation: "  ",
      lineSeparator: "\n",
      strictMode: true
    });
  } catch {
    return code;
  }
}

export function getScreenSizedSvgTextureSize(
  code: string,
  viewport: BitmapTextureSize = {
    height: globalThis.innerHeight || DEFAULT_SCREEN_HEIGHT,
    width: globalThis.innerWidth || DEFAULT_SCREEN_WIDTH
  }
): BitmapTextureSize {
  const canvas = getSvgTextureCanvas(code);
  const aspectRatio = canvas.width / canvas.height;
  const viewportWidth = Math.max(1, viewport.width);
  const viewportHeight = Math.max(1, viewport.height);

  return aspectRatio >= viewportWidth / viewportHeight
    ? { height: viewportWidth / aspectRatio, width: viewportWidth }
    : { height: viewportHeight, width: viewportHeight * aspectRatio };
}

function getImportedTextureName(fileName: string) {
  return fileName
    .replace(/\.svg$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Custom SVG";
}

function getCustomTextureId() {
  const uniquePart = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `svg.custom.${uniquePart}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getNextSvgTextureName(
  currentName: string,
  textures: readonly Pick<SvgTextureOption, "name">[]
) {
  const baseName = currentName.trim().replace(/_\d{4}$/i, "") || "SVG";
  const numberedName = new RegExp(
    `^${escapeRegExp(baseName)}_(\\d{4})$`,
    "i"
  );
  const sequence = textures.reduce((highest, texture) => {
    const match = numberedName.exec(texture.name.trim());
    const value = match ? Number.parseInt(match[1], 10) : 0;

    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0) + 1;

  return `${baseName}_${String(sequence).padStart(4, "0")}`;
}

function SvgTextureSaveDialog({
  defaultName,
  onCancel,
  onConfirm
}: {
  defaultName: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const { strings } = useI18n();
  const labels = strings.svgTextureFill;
  const [name, setName] = useState(defaultName);

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

    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <form
        aria-label={labels.saveAs}
        aria-modal="true"
        className="kizkatt-confirmation-dialog kizkatt-svg-texture-save-dialog"
        onSubmit={submit}
        role="dialog"
      >
        <h2>{labels.saveAs}</h2>
        <label>
          <span>{labels.saveName}</span>
          <input
            required
            autoFocus
            aria-label={labels.saveName}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="kizkatt-confirmation-dialog-actions">
          <button type="button" onClick={onCancel}>
            {labels.cancel}
          </button>
          <button className="is-primary" disabled={!name.trim()} type="submit">
            {labels.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function SvgTextureLibraryPopover({
  activeTextureId,
  anchorElement,
  onChange,
  onClose,
  reopenKey,
  textures
}: {
  activeTextureId?: string;
  anchorElement: HTMLElement | null;
  onChange: (texture: SvgTextureOption) => void;
  onClose: () => void;
  reopenKey: number;
  textures: readonly SvgTextureOption[];
}) {
  const { strings } = useI18n();
  const labels = strings.svgTextureFill;
  const popupRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const filteredTextures = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return query
      ? textures.filter((option) =>
          option.name.toLocaleLowerCase().includes(query)
        )
      : textures;
  }, [search, textures]);

  useEffect(() => {
    setSearch("");
  }, [reopenKey]);

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !popupRef.current?.contains(target) &&
        !anchorElement?.contains(target)
      ) {
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
  }, [anchorElement, onClose]);

  return (
    <Panel
      anchorElement={anchorElement}
      defaultOrientation="vertical"
      id={LIBRARY_PANEL_ID}
      reopenKey={reopenKey}
      title={labels.library}
      variant="popover"
    >
      {({ chrome }) => (
        <section
          ref={popupRef}
          aria-label={labels.library}
          className="kizkatt-svg-texture-library"
          role="dialog"
        >
          {chrome}
          <input
            aria-label={labels.search}
            className="kizkatt-svg-texture-search"
            placeholder={labels.search}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div
            aria-label={labels.library}
            className="kizkatt-svg-texture-grid"
            role="listbox"
          >
            {filteredTextures.map((option) => {
              const active = option.id === activeTextureId;

              return (
                <button
                  aria-label={option.name}
                  aria-selected={active}
                  className={active ? "is-active" : undefined}
                  key={option.id}
                  role="option"
                  title={option.name}
                  type="button"
                  onClick={() => onChange(option)}
                >
                  <img alt="" decoding="async" loading="lazy" src={option.source} />
                  <span>{option.name}</span>
                </button>
              );
            })}
            {filteredTextures.length === 0 && (
              <p className="kizkatt-svg-texture-empty">{labels.empty}</p>
            )}
          </div>
        </section>
      )}
    </Panel>
  );
}

export function SvgTextureFillPanel({
  onChange,
  onChangeEnd,
  onClose,
  onSaveTexture,
  reopenKey,
  targetSize,
  targetTransform,
  texture,
  textures
}: {
  onChange: (
    texture: SvgTextureFill,
    options?: { transient?: boolean }
  ) => void;
  onChangeEnd: () => void;
  onClose: () => void;
  onSaveTexture: (request: SvgTextureSaveRequest) => SvgTextureOption;
  reopenKey: number;
  targetSize: BitmapTextureSize;
  targetTransform?: BitmapTextureTargetTransform;
  texture?: SvgTextureFill;
  textures: readonly SvgTextureOption[];
}) {
  const { strings } = useI18n();
  const labels = strings.svgTextureFill;
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const [libraryAnchor, setLibraryAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryReopenKey, setLibraryReopenKey] = useState(0);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeEditorTab, setActiveEditorTab] =
    useState<SvgTextureEditorTab>("adjustments");
  const [lineWidthScale, setLineWidthScale] = useState(100);
  const activeTexture = textures.find(
    (option) => option.id === texture?.textureId
  );
  const source = texture?.source ?? activeTexture?.source;
  const resolvedCode = useMemo(() => {
    const customCode = getSvgCodeFromDataUrl(texture?.source);

    return customCode ??
      (activeTexture?.code ? formatSvgCode(activeTexture.code) : "");
  }, [activeTexture?.code, texture?.source]);
  const [code, setCode] = useState(resolvedCode);
  const [name, setName] = useState(texture?.name ?? "");
  const [codeValid, setCodeValid] = useState(
    !resolvedCode || isValidSvgCode(resolvedCode)
  );
  const draftSource = codeValid && code.trim()
    ? createSvgTextureDataUrl(code)
    : source;
  const draftChanged = code !== resolvedCode || name !== (texture?.name ?? "");
  const colorAdjustments = useMemo(
    () => codeValid ? getSvgColorAdjustments(code) : [],
    [code, codeValid]
  );
  const hasEditableStrokes = useMemo(
    () => codeValid && svgHasEditableStrokes(code),
    [code, codeValid]
  );
  const sourceNaturalSize = useMemo(
    () => getScreenSizedSvgTextureSize(codeValid ? code : resolvedCode),
    [code, codeValid, resolvedCode]
  );
  const normalizedTexture: SvgTextureFill = {
    ...DEFAULT_SVG_TEXTURE_FILL,
    ...texture,
    fitToObject:
      texture?.fitToObject ?? DEFAULT_SVG_TEXTURE_FILL.fitToObject,
    height: texture?.height ?? sourceNaturalSize.height,
    name: texture?.name ?? name,
    offsetX: texture?.offsetX ?? DEFAULT_SVG_TEXTURE_FILL.offsetX,
    offsetY: texture?.offsetY ?? DEFAULT_SVG_TEXTURE_FILL.offsetY,
    rotation: texture?.rotation ?? DEFAULT_SVG_TEXTURE_FILL.rotation,
    skew: texture?.skew ?? DEFAULT_SVG_TEXTURE_FILL.skew,
    skewY: texture?.skewY ?? DEFAULT_SVG_TEXTURE_FILL.skewY,
    textureId: texture?.textureId ?? "",
    width: texture?.width ?? sourceNaturalSize.width
  };
  const previewTexture: BitmapTextureFill = {
    ...DEFAULT_BITMAP_TEXTURE_FILL,
    fitToObject:
      normalizedTexture.fitToObject ?? DEFAULT_SVG_TEXTURE_FILL.fitToObject,
    height: normalizedTexture.height ?? sourceNaturalSize.height,
    name: normalizedTexture.name,
    offsetX:
      normalizedTexture.offsetX ?? DEFAULT_SVG_TEXTURE_FILL.offsetX,
    offsetY:
      normalizedTexture.offsetY ?? DEFAULT_SVG_TEXTURE_FILL.offsetY,
    rotation:
      normalizedTexture.rotation ?? DEFAULT_SVG_TEXTURE_FILL.rotation,
    skew: normalizedTexture.skew ?? DEFAULT_SVG_TEXTURE_FILL.skew,
    skewY: normalizedTexture.skewY ?? DEFAULT_SVG_TEXTURE_FILL.skewY,
    source: draftSource,
    textureId: normalizedTexture.textureId,
    width: normalizedTexture.width ?? sourceNaturalSize.width
  };
  const hasTarget = targetSize.width > 0 && targetSize.height > 0;

  useEffect(() => {
    setCode(resolvedCode);
    setName(texture?.name ?? "");
    setCodeValid(!resolvedCode || isValidSvgCode(resolvedCode));
    setActiveEditorTab("adjustments");
    setLineWidthScale(100);
    setLibraryOpen(false);
    setSaveDialogOpen(false);
  }, [reopenKey, resolvedCode, texture?.name, texture?.textureId]);

  const close = () => {
    setLibraryOpen(false);
    setSaveDialogOpen(false);
    onClose();
  };
  const updateTextureTransform = (
    change: Partial<BitmapTextureFill>,
    options?: { transient?: boolean }
  ) => {
    onChange(
      {
        ...normalizedTexture,
        fitToObject: change.fitToObject ?? normalizedTexture.fitToObject,
        height: change.height ?? normalizedTexture.height,
        offsetX: change.offsetX ?? normalizedTexture.offsetX,
        offsetY: change.offsetY ?? normalizedTexture.offsetY,
        rotation: change.rotation ?? normalizedTexture.rotation,
        skew: change.skew ?? normalizedTexture.skew,
        skewY: change.skewY ?? normalizedTexture.skewY,
        width: change.width ?? normalizedTexture.width
      },
      options
    );
  };
  const resetCropTransformations = (fitToObject = true) => {
    onChange({
      ...normalizedTexture,
      ...DEFAULT_SVG_TEXTURE_FILL,
      fitToObject,
      height: sourceNaturalSize.height,
      width: sourceNaturalSize.width
    });
    onChangeEnd();
  };
  const chooseTexture = (option: SvgTextureOption) => {
    const nextSourceSize = getScreenSizedSvgTextureSize(option.code);

    setCode(formatSvgCode(option.code));
    setName(option.name);
    setCodeValid(true);
    setActiveEditorTab("adjustments");
    setLineWidthScale(100);
    onChange({
      ...DEFAULT_SVG_TEXTURE_FILL,
      height: nextSourceSize.height,
      name: option.name,
      textureId: option.id,
      width: nextSourceSize.width
    });
    onChangeEnd();
    setLibraryOpen(false);
  };
  const updateCode = (nextCode: string) => {
    const valid = isValidSvgCode(nextCode);

    setCode(nextCode);
    setCodeValid(valid);
    setLineWidthScale(100);
  };
  const updateColorAdjustment = (previousColor: string, nextColor: string) => {
    setCode(formatSvgCode(replaceSvgColor(code, previousColor, nextColor)));
    setCodeValid(true);
  };
  const updateLineWidthScale = (nextScale: number) => {
    const factor = nextScale / lineWidthScale;

    setCode(formatSvgCode(scaleSvgStrokeWidths(code, factor)));
    setCodeValid(true);
    setLineWidthScale(nextScale);
  };
  const applyCode = () => {
    if (!codeValid || !code.trim()) {
      return;
    }

    onChange({
      ...normalizedTexture,
      name: name.trim() || labels.namePlaceholder,
      source: createSvgTextureDataUrl(code),
      textureId: texture?.textureId || getCustomTextureId()
    });
    onChangeEnd();
  };
  const resetCode = () => {
    setCode(resolvedCode);
    setCodeValid(!resolvedCode || isValidSvgCode(resolvedCode));
    setName(texture?.name ?? "");
    setLineWidthScale(100);
  };
  const importTexture = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const nextCode = formatSvgCode(await file.text());
    const valid = isValidSvgCode(nextCode);

    setCode(nextCode);
    setCodeValid(valid);
    setLineWidthScale(100);

    if (!valid) {
      return;
    }

    setName(getImportedTextureName(file.name));
  };
  const saveCode = (savedName: string) => {
    if (!codeValid || !code.trim()) {
      return;
    }

    const savedTexture = onSaveTexture({
      code,
      name: savedName,
      source: createSvgTextureDataUrl(code)
    });

    setName(savedTexture.name);
    setCode(savedTexture.code);
    onChange({
      ...normalizedTexture,
      name: savedTexture.name,
      source: savedTexture.source,
      textureId: savedTexture.id
    });
    onChangeEnd();
    setSaveDialogOpen(false);
  };

  return (
    <>
      <Panel
        closable
        defaultOrientation="vertical"
        id={PANEL_ID}
        minSize={{ height: 440, width: 720 }}
        onClose={close}
        orientationChangeable={false}
        pinnable
        positionStorageId="fill-settings"
        reopenKey={reopenKey}
        resizable
        resizeAxes={{ vertical: "both" }}
        title={labels.title}
      >
        {({ chrome }) => (
          <section
            aria-label={labels.title}
            className="kizkatt-svg-texture-panel"
          >
            {chrome}
            <div className="kizkatt-svg-texture-content">
              <div className="kizkatt-svg-texture-source-column">
                <label className="kizkatt-svg-texture-name">
                  <span>{labels.name}</span>
                  <span className="kizkatt-svg-texture-name-controls">
                    <button
                      ref={setLibraryAnchor}
                      aria-expanded={libraryOpen}
                      aria-haspopup="dialog"
                      aria-label={labels.choose}
                      className="kizkatt-svg-texture-fill-button"
                      title={labels.choose}
                      type="button"
                      onClick={() => {
                        setLibraryOpen((current) => !current);
                        setLibraryReopenKey((value) => value + 1);
                      }}
                    >
                      {draftSource ? <img alt="" src={draftSource} /> : CodeIcon}
                      {ChevronDownIcon}
                    </button>
                    <input
                      aria-label={labels.name}
                      disabled={!code}
                      placeholder={labels.namePlaceholder}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                    <button
                      aria-label={labels.chooseFile}
                      className="kizkatt-svg-texture-upload-button"
                      title={labels.chooseFile}
                      type="button"
                      onClick={() => sourceInputRef.current?.click()}
                    >
                      {UploadIcon}
                    </button>
                    <button
                      aria-label={labels.save}
                      className="kizkatt-svg-texture-save-button"
                      disabled={!codeValid || !code.trim()}
                      title={labels.save}
                      type="button"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      {SaveIcon}
                    </button>
                    <input
                      ref={sourceInputRef}
                      accept={SVG_FILE_ACCEPT}
                      className="kizkatt-file-input"
                      type="file"
                      onChange={(event) => void importTexture(event)}
                    />
                  </span>
                </label>

                <div className="kizkatt-svg-texture-preview-actions">
                  <button
                    aria-label={labels.resetTransformations}
                    title={labels.resetTransformations}
                    type="button"
                    onClick={() => resetCropTransformations(true)}
                  >
                    {ResetIcon}
                  </button>
                  <label className="kizkatt-svg-texture-fit-control">
                    <input
                      checked={previewTexture.fitToObject}
                      disabled={!hasTarget}
                      type="checkbox"
                      onChange={(event) =>
                        resetCropTransformations(event.target.checked)
                      }
                    />
                    {labels.fitToObjectSize}
                  </label>
                </div>

                <div
                  aria-label={labels.preview}
                  className="kizkatt-svg-texture-preview-area"
                >
                  {previewTexture.fitToObject ? (
                    <div className="kizkatt-svg-texture-preview is-fit-to-object">
                      {draftSource ? (
                        <>
                          <img alt="" draggable={false} src={draftSource} />
                          {hasTarget && (
                            <span
                              aria-label={labels.crop}
                              className="kizkatt-svg-texture-fit-crop"
                              data-bitmap-texture-crop
                            />
                          )}
                        </>
                      ) : (
                        <span>{labels.choose}</span>
                      )}
                    </div>
                  ) : (
                    <BitmapTextureCropPreview
                      combinedTransformHandles
                      cropEnabled={hasTarget}
                      freeDeformation
                      labels={{
                        crop: labels.crop,
                        move: labels.moveCrop,
                        resize: labels.resizeCrop,
                        rotate: labels.rotateCrop,
                        skew: labels.skewCrop
                      }}
                      naturalSize={sourceNaturalSize}
                      source={draftSource}
                      targetSize={targetSize}
                      targetTransform={targetTransform}
                      texture={previewTexture}
                      onTextureChange={(change) =>
                        updateTextureTransform(change, { transient: true })
                      }
                      onTextureChangeEnd={onChangeEnd}
                    />
                  )}
                </div>

              </div>

              <div className="kizkatt-svg-texture-code-column">
                <nav
                  aria-label={labels.title}
                  className="kizkatt-svg-texture-editor-tabs"
                  role="tablist"
                >
                  {(["adjustments", "code"] as const).map((tab) => (
                    <button
                      aria-selected={activeEditorTab === tab}
                      className={activeEditorTab === tab ? "is-active" : undefined}
                      key={tab}
                      role="tab"
                      type="button"
                      onClick={() => setActiveEditorTab(tab)}
                    >
                      {labels[tab]}
                    </button>
                  ))}
                </nav>
                <div className="kizkatt-svg-texture-editor-body">
                  {activeEditorTab === "code" ? (
                    <>
                      <Suspense
                        fallback={
                          <div className="kizkatt-svg-code-editor is-loading" />
                        }
                      >
                        <SvgCodeEditor
                          invalid={!codeValid}
                          label={labels.code}
                          value={code}
                          onBlur={() => undefined}
                          onChange={updateCode}
                        />
                      </Suspense>
                      {!codeValid && (
                        <span className="kizkatt-svg-texture-code-error">
                          {labels.codeError}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="kizkatt-svg-texture-adjustments">
                      <section>
                        <h3>{labels.colors}</h3>
                        {colorAdjustments.length > 0 ? (
                          <div className="kizkatt-svg-texture-color-grid">
                            {colorAdjustments.map((adjustment) => (
                              <label key={adjustment.value}>
                                <input
                                  aria-label={`${labels.changeColor} ${adjustment.value}`}
                                  type="color"
                                  value={adjustment.color}
                                  onChange={(event) =>
                                    updateColorAdjustment(
                                      adjustment.value,
                                      event.target.value
                                    )
                                  }
                                />
                                <code>{adjustment.value}</code>
                                <small>×{adjustment.count}</small>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p>{labels.noColors}</p>
                        )}
                      </section>
                      <section>
                        <h3>{labels.lines}</h3>
                        {hasEditableStrokes ? (
                          <label className="kizkatt-svg-texture-line-width">
                            <span>{labels.lineWidth}</span>
                            <input
                              aria-label={labels.lineWidth}
                              max="400"
                              min="10"
                              step="5"
                              type="range"
                              value={lineWidthScale}
                              onChange={(event) =>
                                updateLineWidthScale(Number(event.target.value))
                              }
                            />
                            <output>{lineWidthScale}%</output>
                          </label>
                        ) : (
                          <p>{labels.noLines}</p>
                        )}
                      </section>
                    </div>
                  )}
                </div>
                <div className="kizkatt-svg-texture-code-actions">
                  <button
                    disabled={!draftChanged}
                    type="button"
                    onClick={resetCode}
                  >
                    {labels.reset}
                  </button>
                  <button
                    className="is-primary"
                    disabled={!codeValid || !code.trim() || !draftChanged}
                    type="button"
                    onClick={applyCode}
                  >
                    {labels.apply}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </Panel>

      {libraryOpen && (
        <SvgTextureLibraryPopover
          activeTextureId={texture?.textureId}
          anchorElement={libraryAnchor}
          onChange={chooseTexture}
          onClose={() => setLibraryOpen(false)}
          reopenKey={libraryReopenKey}
          textures={textures}
        />
      )}
      {saveDialogOpen && (
        <SvgTextureSaveDialog
          defaultName={getNextSvgTextureName(name, textures)}
          onCancel={() => setSaveDialogOpen(false)}
          onConfirm={saveCode}
        />
      )}
    </>
  );
}
