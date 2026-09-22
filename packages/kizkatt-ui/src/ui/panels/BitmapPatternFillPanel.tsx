import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  createBitmapTextureFill,
  getBitmapTexturePreviewGeometry,
  getResetBitmapTextureTransform,
  rgbToHexColor,
  type BitmapTextureFill,
  type BitmapTextureSize,
  type BitmapTextureTargetTransform,
  type TextureCatalogTexture
} from "kizkatt-graphic-engine";
import { BitmapTextureCropPreview } from "../../components/BitmapTextureCropPreview";
import { TextureInfoDialog } from "../../components/TextureInfoDialog";
import {
  TextureImportDialog,
  type TextureImportCollectionOption,
  type TextureImportMetadata,
  type TextureImportRequest
} from "../../components/TextureImportDialog";
import { useBitmapTextureDraft } from "../../hooks/useBitmapTextureDraft";
import {
  getCoveredImagePixelColor,
  getImageFileSize,
  readFileAsDataUrl,
  STANDARD_IMAGE_FILE_ACCEPT
} from "../../platform/imageFiles";

import { useI18n } from "../../i18n";
import {
  ChevronDownIcon,
  EyedropperIcon,
  EyeIcon,
  FreeDeformationIcon,
  ImageIcon,
  InfoIcon,
  MirrorHorizontalIcon,
  MirrorVerticalIcon,
  ResetIcon,
  TileIcon,
  UploadIcon
} from "../icons";
import { Panel } from "../../components/Panel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import { CollapsiblePanelSection } from "../../components/CollapsiblePanelSection";
import { EditableSliderInput } from "../../components/EditableSliderInput";

const PANEL_ID = "bitmap-pattern-fill";
const MIN_ADJUSTMENT = -100;
const MAX_ADJUSTMENT = 100;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function AdjustmentField({
  checked,
  disabled = false,
  label,
  max = MAX_ADJUSTMENT,
  min = MIN_ADJUSTMENT,
  onBlur,
  onCheckedChange,
  onValueChange,
  value
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onBlur: () => void;
  onCheckedChange: (checked: boolean) => void;
  onValueChange: (value: string) => void;
  value: number;
}) {
  const checkboxId = useId();

  return (
    <div
      className={`kizkatt-texture-adjustment${disabled ? " is-disabled" : ""}`}
    >
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <label htmlFor={checkboxId}>{label}</label>
      <input
        aria-label={`${label} value`}
        type="range"
        min={min}
        max={max}
        step="1"
        disabled={disabled || !checked}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onValueChange(event.target.value)}
        onPointerUp={onBlur}
      />
      <output>{value}</output>
    </div>
  );
}

function BlendAmountSlider({
  label,
  onBlur,
  onValueChange,
  value
}: {
  label: string;
  onBlur: () => void;
  onValueChange: (value: string) => void;
  value: number;
}) {
  return (
    <label className="kizkatt-bitmap-blend-adjustment">
      <span>{label}</span>
      <input
        aria-label={`${label} value`}
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onValueChange(event.target.value)}
        onPointerUp={onBlur}
      />
      <output>{value}</output>
    </label>
  );
}

function ToggleButton({
  active,
  children,
  label,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? "is-active" : undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function BitmapPatternFillPanel({
  onChange,
  onChangeEnd: commitAppliedChange,
  onClose,
  onImportTexture,
  onOpenLibrary,
  reopenKey,
  resolveTextureSource,
  targetSize,
  targetTransform,
  texture: textureValue,
  textureCollections,
  textureMetadata,
  textureTypeName
}: {
  onChange: (
    texture: BitmapTextureFill,
    options?: { transient?: boolean }
  ) => void;
  onChangeEnd: () => void;
  onClose: () => void;
  onImportTexture: (request: TextureImportRequest) => TextureCatalogTexture;
  onOpenLibrary: (anchor: HTMLButtonElement) => void;
  reopenKey: number;
  resolveTextureSource?: (textureId: string) => string | null;
  targetSize: BitmapTextureSize;
  targetTransform?: BitmapTextureTargetTransform;
  texture?: BitmapTextureFill;
  textureCollections: readonly TextureImportCollectionOption[];
  textureMetadata?: Pick<TextureCatalogTexture, "author" | "from">;
  textureTypeName: string;
}) {
  const { strings } = useI18n();
  const {
    overlayContrast,
    setOverlayContrast,
    setTextureFreeDeformation,
    textureFreeDeformation
  } = useGraphicEditorSettings();
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceNaturalSize, setSourceNaturalSize] =
    useState<BitmapTextureSize>({
      height: Math.max(1, textureValue?.height ?? targetSize.height),
      width: Math.max(1, textureValue?.width ?? targetSize.width)
    });
  const [pickingTransparencyColor, setPickingTransparencyColor] =
    useState(false);
  const [pendingImport, setPendingImport] = useState<{
    naturalSize: BitmapTextureSize;
    originalFileName: string;
    source: string;
  } | null>(null);
  const [textureInfoOpen, setTextureInfoOpen] = useState(false);
  const { apply, texture, update } = useBitmapTextureDraft({
    onCommit: commitAppliedChange,
    onPreview: onChange,
    reopenKey,
    value: textureValue
  });

  useEffect(() => {
    setPickingTransparencyColor(false);
    setPendingImport(null);
    setTextureInfoOpen(false);
  }, [reopenKey, textureValue?.textureId]);

  const onChangeEnd = apply;
  const source =
    texture.source ?? resolveTextureSource?.(texture.textureId) ?? null;
  const hasTarget = targetSize.width > 0 && targetSize.height > 0;
  const colorDisabled =
    texture.desaturateEnabled && texture.desaturate >= MAX_ADJUSTMENT;
  const transformationWidthMax = Math.max(
    1000,
    Math.ceil(
      Math.max(texture.width, sourceNaturalSize.width, targetSize.width) * 2
    )
  );
  const transformationHeightMax = Math.max(
    1000,
    Math.ceil(
      Math.max(texture.height, sourceNaturalSize.height, targetSize.height) * 2
    )
  );
  const transformationOffsetMax = Math.max(
    transformationWidthMax,
    transformationHeightMax
  );

  useEffect(() => {
    setSourceNaturalSize({
      height: Math.max(1, texture.height),
      width: Math.max(1, texture.width)
    });
  }, [source, texture.textureId]);

  const previewGeometry = useMemo(
    () =>
      getBitmapTexturePreviewGeometry(
        texture,
        sourceNaturalSize,
        targetSize,
        targetTransform
      ),
    [sourceNaturalSize, targetSize, targetTransform, texture]
  );

  useEffect(() => {
    if (texture.tile && !previewGeometry.tileAvailable) {
      update({ tile: false }, { transient: true });
    }
  }, [previewGeometry.tileAvailable, texture.tile, update]);

  const close = () => {
    apply();
    setPendingImport(null);
    setTextureInfoOpen(false);
    onClose();
  };
  const updateNumber = (
    property: keyof BitmapTextureFill,
    value: string,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY
  ) => {
    const current = texture[property];
    const fallback = typeof current === "number" ? current : 0;
    update(
      { [property]: clamp(parseNumber(value, fallback), min, max) },
      { transient: true }
    );
  };
  const chooseSource = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const sourceData = await readFileAsDataUrl(file);
    const naturalSize = await getImageFileSize(file, {
      height: texture.height,
      width: texture.width
    });
    setPendingImport({
      naturalSize,
      originalFileName: file.name,
      source: sourceData
    });
  };
  const importTexture = (metadata: TextureImportMetadata) => {
    if (!pendingImport) {
      return;
    }

    const importedTexture = onImportTexture({
      ...metadata,
      ...pendingImport
    });

    update(
      createBitmapTextureFill({
        base: texture,
        name: importedTexture.name,
        naturalSize: pendingImport.naturalSize,
        source: undefined,
        targetSize,
        textureId: importedTexture.id
      })
    );
    onChangeEnd();
    setPendingImport(null);
  };
  const resetCropTransformations = () => {
    update(getResetBitmapTextureTransform(sourceNaturalSize));
    onChangeEnd();
  };
  const pickTransparencyColor = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (!pickingTransparencyColor) {
      return;
    }

    const image = previewImageRef.current;

    if (!image) {
      return;
    }

    const bounds = image.getBoundingClientRect();
    const color = getCoveredImagePixelColor(image, bounds, {
      x: event.clientX,
      y: event.clientY
    });

    if (!color) {
      return;
    }

    update({
      transparencyColor: rgbToHexColor(color[0], color[1], color[2]),
      transparencyEnabled: true
    });
    onChangeEnd();
    setPickingTransparencyColor(false);
  };

  return (
    <>
      <Panel
      id={PANEL_ID}
      closable
      defaultOrientation="vertical"
      minSize={{ height: 540, width: 620 }}
      onClose={close}
      orientationChangeable={false}
      pinnable
      positionStorageId="fill-settings"
      reopenKey={reopenKey}
      resizable
      resizeAxes={{ vertical: "horizontal" }}
      title={`${strings.bitmapPattern.texture} - ${textureTypeName}`}
    >
      {({ actions, chrome, orientation }) => (
        <section
          className={`kizkatt-bitmap-pattern-panel kizkatt-bitmap-pattern-panel--${orientation}`}
          aria-label={`${strings.bitmapPattern.texture} - ${textureTypeName}`}
        >
          {chrome}
          <div className="kizkatt-bitmap-pattern-content">
            <div className="kizkatt-bitmap-pattern-source-column">
              <div className="kizkatt-bitmap-pattern-heading-row">
                <div className="kizkatt-bitmap-pattern-name">
                  <span>{strings.bitmapPattern.name}</span>
                  <span
                    className={`kizkatt-bitmap-pattern-name-controls${
                      textureMetadata?.author || textureMetadata?.from
                        ? " has-info"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="kizkatt-bitmap-pattern-fill-button"
                      aria-label={strings.textureLibrary.chooseTexture}
                      title={strings.textureLibrary.chooseTexture}
                      onClick={(event) => onOpenLibrary(event.currentTarget)}
                    >
                      {source ? (
                        <img src={source} alt="" decoding="async" />
                      ) : (
                        ImageIcon
                      )}
                      {ChevronDownIcon}
                    </button>
                    <input
                      aria-label={strings.bitmapPattern.name}
                      value={texture.name}
                      onBlur={onChangeEnd}
                      onChange={(event) =>
                        update(
                          { name: event.target.value },
                          { transient: true }
                        )
                      }
                    />
                    {(textureMetadata?.author || textureMetadata?.from) && (
                      <button
                        type="button"
                        className="kizkatt-bitmap-pattern-info-button"
                        aria-label={strings.textureLibrary.informationTooltip}
                        title={strings.textureLibrary.informationTooltip}
                        onClick={() => setTextureInfoOpen(true)}
                      >
                        {InfoIcon}
                      </button>
                    )}
                    <button
                      type="button"
                      className="kizkatt-bitmap-pattern-upload-button"
                      aria-label={strings.bitmapPattern.choose}
                      title={strings.bitmapPattern.choose}
                      onClick={() => sourceInputRef.current?.click()}
                    >
                      {UploadIcon}
                    </button>
                    <input
                      ref={sourceInputRef}
                      className="kizkatt-file-input"
                      type="file"
                      accept={STANDARD_IMAGE_FILE_ACCEPT}
                      onChange={(event) => void chooseSource(event)}
                    />
                  </span>
                </div>
              </div>

              <div className="kizkatt-texture-preview-actions">
                <ToggleButton
                  active={overlayContrast}
                  label={strings.bitmapPattern.overlayContrast}
                  onClick={() => setOverlayContrast(!overlayContrast)}
                >
                  {EyeIcon}
                </ToggleButton>
                <ToggleButton
                  active={textureFreeDeformation}
                  label={strings.bitmapPattern.freeDeformation}
                  onClick={() =>
                    setTextureFreeDeformation(!textureFreeDeformation)
                  }
                >
                  {FreeDeformationIcon}
                </ToggleButton>
                <button
                  type="button"
                  aria-label={strings.bitmapPattern.resetTransformations}
                  title={strings.bitmapPattern.resetTransformations}
                  onClick={resetCropTransformations}
                >
                  {ResetIcon}
                </button>
              </div>

              <BitmapTextureCropPreview
                cropEnabled={hasTarget}
                freeDeformation={textureFreeDeformation}
                imageRef={previewImageRef}
                labels={{
                  crop: strings.bitmapPattern.crop,
                  move: strings.bitmapPattern.moveCrop,
                  resize: strings.bitmapPattern.resizeCrop,
                  rotate: strings.bitmapPattern.rotateCrop,
                  skew: strings.bitmapPattern.skewCrop
                }}
                source={source ?? undefined}
                targetSize={targetSize}
                targetTransform={targetTransform}
                texture={texture}
                pickingColor={pickingTransparencyColor}
                shadeOverlay={overlayContrast}
                onClick={pickTransparencyColor}
                onNaturalSizeChange={setSourceNaturalSize}
                onTextureChange={(change) =>
                  update(change, { transient: true })
                }
                onTextureChangeEnd={onChangeEnd}
              />
            </div>

            <div className="kizkatt-bitmap-pattern-settings-column">
              <div className="kizkatt-bitmap-pattern-top-settings">
                <fieldset>
                  <legend>{strings.bitmapPattern.blendType}</legend>
                  <div className="kizkatt-bitmap-blend-controls">
                    <button
                      type="button"
                      aria-pressed={
                        texture.multiplyAmount === 0 &&
                        texture.destinationOutAmount === 0
                      }
                      className={`kizkatt-bitmap-blend-normal${
                        texture.multiplyAmount === 0 &&
                        texture.destinationOutAmount === 0
                          ? " is-active"
                          : ""
                      }`}
                      onClick={() => {
                        update({
                          blendMode: "normal",
                          destinationOutAmount: 0,
                          multiplyAmount: 0
                        });
                        onChangeEnd();
                      }}
                    >
                      {strings.bitmapPattern.blendNormal}
                    </button>
                    <BlendAmountSlider
                      label={strings.bitmapPattern.blendMultiply}
                      value={texture.multiplyAmount}
                      onBlur={onChangeEnd}
                      onValueChange={(value) => {
                        const multiplyAmount = clamp(
                          parseNumber(value, texture.multiplyAmount),
                          0,
                          100
                        );

                        update(
                          {
                            blendMode:
                              multiplyAmount > 0 ? "multiply" : "normal",
                            multiplyAmount
                          },
                          { transient: true }
                        );
                      }}
                    />
                    <BlendAmountSlider
                      label={strings.bitmapPattern.cutout}
                      value={texture.destinationOutAmount}
                      onBlur={onChangeEnd}
                      onValueChange={(value) =>
                        updateNumber(
                          "destinationOutAmount",
                          value,
                          0,
                          100
                        )
                      }
                    />
                  </div>
                </fieldset>

                <fieldset>
                  <legend>{strings.bitmapPattern.mirror}</legend>
                  <div className="kizkatt-bitmap-pattern-button-row">
                    <ToggleButton
                      active={texture.mirrorX}
                      label={strings.bitmapPattern.mirrorHorizontal}
                      onClick={() => {
                        update({ mirrorX: !texture.mirrorX });
                        onChangeEnd();
                      }}
                    >
                      {MirrorHorizontalIcon}
                    </ToggleButton>
                    <ToggleButton
                      active={texture.mirrorY}
                      label={strings.bitmapPattern.mirrorVertical}
                      onClick={() => {
                        update({ mirrorY: !texture.mirrorY });
                        onChangeEnd();
                      }}
                    >
                      {MirrorVerticalIcon}
                    </ToggleButton>
                  </div>
                </fieldset>
              </div>

              <div className="kizkatt-bitmap-pattern-adjustments">
                <AdjustmentField
                  checked={texture.edgeMatchEnabled}
                  label={strings.bitmapPattern.edgeMatch}
                  min={0}
                  max={100}
                  value={texture.edgeMatch}
                  onBlur={onChangeEnd}
                  onCheckedChange={(checked) => {
                    update({ edgeMatchEnabled: checked });
                    onChangeEnd();
                  }}
                  onValueChange={(value) =>
                    updateNumber("edgeMatch", value, 0, 100)
                  }
                />
                <AdjustmentField
                  checked={texture.brightnessEnabled}
                  label={strings.bitmapPattern.brightness}
                  value={texture.brightness}
                  onBlur={onChangeEnd}
                  onCheckedChange={(checked) => {
                    update({ brightnessEnabled: checked });
                    onChangeEnd();
                  }}
                  onValueChange={(value) =>
                    updateNumber(
                      "brightness",
                      value,
                      MIN_ADJUSTMENT,
                      MAX_ADJUSTMENT
                    )
                  }
                />
                <AdjustmentField
                  checked={texture.luminanceEnabled}
                  label={strings.bitmapPattern.luminance}
                  value={texture.luminance}
                  onBlur={onChangeEnd}
                  onCheckedChange={(checked) => {
                    update({ luminanceEnabled: checked });
                    onChangeEnd();
                  }}
                  onValueChange={(value) =>
                    updateNumber(
                      "luminance",
                      value,
                      MIN_ADJUSTMENT,
                      MAX_ADJUSTMENT
                    )
                  }
                />
                <AdjustmentField
                  checked={texture.colorEnabled}
                  disabled={colorDisabled}
                  label={strings.bitmapPattern.color}
                  value={texture.color}
                  onBlur={onChangeEnd}
                  onCheckedChange={(checked) => {
                    update({ colorEnabled: checked });
                    onChangeEnd();
                  }}
                  onValueChange={(value) =>
                    updateNumber(
                      "color",
                      value,
                      MIN_ADJUSTMENT,
                      MAX_ADJUSTMENT
                    )
                  }
                />
                <AdjustmentField
                  checked={texture.desaturateEnabled}
                  label={strings.bitmapPattern.desaturate}
                  min={0}
                  max={100}
                  value={texture.desaturate}
                  onBlur={onChangeEnd}
                  onCheckedChange={(checked) => {
                    update({ desaturateEnabled: checked });
                    onChangeEnd();
                  }}
                  onValueChange={(value) =>
                    updateNumber("desaturate", value, 0, 100)
                  }
                />
              </div>

              <div className="kizkatt-bitmap-pattern-layout-controls">
                <label
                  className="kizkatt-bitmap-pattern-tile-control"
                  title={strings.bitmapPattern.tile}
                >
                  <input
                    aria-label={strings.bitmapPattern.tile}
                    type="checkbox"
                    checked={texture.tile && previewGeometry.tileAvailable}
                    disabled={!previewGeometry.tileAvailable}
                    onChange={(event) => {
                      update({
                        fitToObject: false,
                        tile: event.target.checked
                      });
                      onChangeEnd();
                    }}
                  />
                  {TileIcon}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={texture.fitToObject}
                    disabled={!hasTarget}
                    onChange={(event) => {
                      const fitToObject = event.target.checked;
                      update({
                        fitToObject,
                        height: fitToObject
                          ? targetSize.height
                          : sourceNaturalSize.height,
                        offsetX: 0,
                        offsetY: 0,
                        tile: false,
                        width: fitToObject
                          ? targetSize.width
                          : sourceNaturalSize.width
                      });
                      onChangeEnd();
                    }}
                  />
                  {strings.bitmapPattern.fitToObjectSize}
                </label>
              </div>

              <CollapsiblePanelSection
                className="kizkatt-bitmap-pattern-transformations"
                title={strings.bitmapPattern.transformations}
              >
                <div className="kizkatt-transformation-fields">
                  <label>
                    <span>{strings.bitmapPattern.width}</span>
                    <EditableSliderInput
                      ariaLabel={strings.bitmapPattern.width}
                      min={1}
                      max={transformationWidthMax}
                      step={1}
                      unit="px"
                      value={texture.width}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update(
                          {
                            width: value,
                            ...(texture.scaleLocked
                              ? {
                                  height:
                                    texture.height *
                                    (value / Math.max(1, texture.width))
                                }
                              : {})
                          },
                          { transient: true }
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>{strings.bitmapPattern.height}</span>
                    <EditableSliderInput
                      ariaLabel={strings.bitmapPattern.height}
                      min={1}
                      max={transformationHeightMax}
                      step={1}
                      unit="px"
                      value={texture.height}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update(
                          {
                            height: value,
                            ...(texture.scaleLocked
                              ? {
                                  width:
                                    texture.width *
                                    (value / Math.max(1, texture.height))
                                }
                              : {})
                          },
                          { transient: true }
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>{strings.bitmapPattern.offsetX}</span>
                    <EditableSliderInput
                      ariaLabel={strings.bitmapPattern.offsetX}
                      min={-transformationOffsetMax}
                      max={transformationOffsetMax}
                      unit="px"
                      value={texture.offsetX}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update({ offsetX: value }, { transient: true })
                      }
                    />
                  </label>
                  <label>
                    <span>{strings.bitmapPattern.offsetY}</span>
                    <EditableSliderInput
                      ariaLabel={strings.bitmapPattern.offsetY}
                      min={-transformationOffsetMax}
                      max={transformationOffsetMax}
                      unit="px"
                      value={texture.offsetY}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update({ offsetY: value }, { transient: true })
                      }
                    />
                  </label>
                  <label className="is-wide">
                    <span>{strings.bitmapPattern.rotation}</span>
                    <EditableSliderInput
                      ariaLabel={strings.bitmapPattern.rotation}
                      min={-360}
                      max={360}
                      unit="°"
                      value={texture.rotation}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update({ rotation: value }, { transient: true })
                      }
                    />
                  </label>
                  <label>
                    <span>{strings.bitmapPattern.skew} X</span>
                    <EditableSliderInput
                      ariaLabel={`${strings.bitmapPattern.skew} X`}
                      min={-85}
                      max={85}
                      unit="°"
                      value={texture.skew}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update({ skew: value }, { transient: true })
                      }
                    />
                  </label>
                  <label>
                    <span>{strings.bitmapPattern.skew} Y</span>
                    <EditableSliderInput
                      ariaLabel={`${strings.bitmapPattern.skew} Y`}
                      min={-85}
                      max={85}
                      unit="°"
                      value={texture.skewY}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        update({ skewY: value }, { transient: true })
                      }
                    />
                  </label>
                  <label className="is-checkbox is-wide">
                    <input
                      type="checkbox"
                      checked={texture.scaleLocked}
                      onChange={(event) => {
                        update({ scaleLocked: event.target.checked });
                        onChangeEnd();
                      }}
                    />
                    <span>{strings.bitmapPattern.lockScale}</span>
                  </label>
                  <label className="is-checkbox is-wide">
                    <input
                      type="checkbox"
                      checked={texture.transformWithObject}
                      onChange={(event) => {
                        update(
                          { transformWithObject: event.target.checked },
                          { transient: true }
                        );
                        onChangeEnd();
                      }}
                    />
                    <span>{strings.bitmapPattern.transformWithObject}</span>
                  </label>
                </div>
              </CollapsiblePanelSection>

              <fieldset className="kizkatt-bitmap-pattern-transparency">
                <legend>{strings.bitmapPattern.transparency}</legend>
                <div>
                  <input
                    aria-label={strings.bitmapPattern.transparency}
                    type="checkbox"
                    checked={texture.transparencyEnabled}
                    onChange={(event) => {
                      update({ transparencyEnabled: event.target.checked });
                      onChangeEnd();
                    }}
                  />
                  <input
                    aria-label={strings.bitmapPattern.transparencyColor}
                    title={strings.bitmapPattern.transparencyColor}
                    type="color"
                    value={texture.transparencyColor}
                    onChange={(event) =>
                      update(
                        {
                          transparencyColor: event.target.value,
                          transparencyEnabled: true
                        },
                        { transient: true }
                      )
                    }
                    onBlur={onChangeEnd}
                  />
                  <button
                    type="button"
                    className={
                      pickingTransparencyColor ? "is-active" : undefined
                    }
                    aria-label={strings.bitmapPattern.pickTransparencyColor}
                    title={strings.bitmapPattern.pickTransparencyColor}
                    onClick={() =>
                      setPickingTransparencyColor((value) => !value)
                    }
                  >
                    {EyedropperIcon}
                  </button>
                  <label>
                    <span>{strings.bitmapPattern.transparencyTolerance}</span>
                    <input
                      aria-label={strings.bitmapPattern.transparencyTolerance}
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      disabled={!texture.transparencyEnabled}
                      value={texture.transparencyTolerance}
                      onChange={(event) =>
                        updateNumber(
                          "transparencyTolerance",
                          event.target.value,
                          0,
                          100
                        )
                      }
                      onPointerUp={onChangeEnd}
                    />
                    <output>{texture.transparencyTolerance}</output>
                  </label>
                </div>
              </fieldset>

            </div>
          </div>
          {actions}
        </section>
      )}
      </Panel>
      {pendingImport && (
        <TextureImportDialog
          collections={textureCollections}
          fileName={pendingImport.originalFileName}
          onCancel={() => setPendingImport(null)}
          onConfirm={importTexture}
        />
      )}
      {textureInfoOpen && textureMetadata && (
        <TextureInfoDialog
          author={textureMetadata.author}
          from={textureMetadata.from}
          onClose={() => setTextureInfoOpen(false)}
        />
      )}
    </>
  );
}
