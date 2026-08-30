import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  createBitmapTextureFill,
  getBitmapTexturePreviewGeometry,
  getResetBitmapTextureTransform,
  type BitmapTextureFill,
  type BitmapTextureSize
} from "kizkatt-graphic-engine";
import {
  BitmapTextureCropPreview,
  getCoveredImagePixelColor,
  getImageFileSize,
  readFileAsDataUrl,
  rgbToHexColor,
  STANDARD_IMAGE_FILE_ACCEPT,
  useBitmapTextureDraft
} from "kizkatt-graphic-editor";

import { getTextureSource } from "../../assets/textures/monochrome/textureCatalog";
import { useI18n } from "../../i18n";
import {
  EyedropperIcon,
  MirrorHorizontalIcon,
  MirrorVerticalIcon,
  ResetIcon,
  TileIcon,
  UploadIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

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

function parseEditableNumber(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function EditableNumberInput({
  ariaLabel,
  disabled,
  max,
  min,
  onChangeEnd,
  onValueChange,
  step = 0.1,
  value
}: {
  ariaLabel: string;
  disabled?: boolean;
  max?: number;
  min?: number;
  onChangeEnd: () => void;
  onValueChange: (value: string) => void;
  step?: number;
  value: number | string;
}) {
  const externalValue = String(value);
  const [draft, setDraft] = useState(externalValue);

  useEffect(() => {
    setDraft(externalValue);
  }, [externalValue]);

  const commitDraft = () => {
    const parsed = parseEditableNumber(draft);

    if (parsed === null) {
      setDraft(externalValue);
    } else {
      onValueChange(String(parsed));
      setDraft(String(parsed));
    }

    onChangeEnd();
  };

  return (
    <input
      aria-label={ariaLabel}
      disabled={disabled}
      inputMode="decimal"
      data-max={max}
      data-min={min}
      data-step={step}
      value={draft}
      onBlur={commitDraft}
      onChange={(event) => {
        const nextDraft = event.target.value;
        const parsed = parseEditableNumber(nextDraft);

        setDraft(nextDraft);

        if (parsed !== null) {
          onValueChange(String(parsed));
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function AdjustmentField({
  checked,
  label,
  max = MAX_ADJUSTMENT,
  min = MIN_ADJUSTMENT,
  onBlur,
  onCheckedChange,
  onValueChange,
  value
}: {
  checked: boolean;
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
    <div className="kizkatt-texture-adjustment">
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <label htmlFor={checkboxId}>{label}</label>
      <input
        aria-label={`${label} value`}
        type="range"
        min={min}
        max={max}
        step="1"
        disabled={!checked}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onValueChange(event.target.value)}
        onPointerUp={onBlur}
      />
      <output>{value}</output>
    </div>
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
  onOpenLibrary,
  reopenKey,
  targetSize,
  texture: textureValue
}: {
  onChange: (
    texture: BitmapTextureFill,
    options?: { transient?: boolean }
  ) => void;
  onChangeEnd: () => void;
  onClose: () => void;
  onOpenLibrary: () => void;
  reopenKey: number;
  targetSize: BitmapTextureSize;
  texture?: BitmapTextureFill;
}) {
  const { strings } = useI18n();
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceNaturalSize, setSourceNaturalSize] =
    useState<BitmapTextureSize>({
      height: Math.max(1, textureValue?.height ?? targetSize.height),
      width: Math.max(1, textureValue?.width ?? targetSize.width)
    });
  const [pickingTransparencyColor, setPickingTransparencyColor] =
    useState(false);
  const { apply, texture, update } = useBitmapTextureDraft({
    onCommit: commitAppliedChange,
    onPreview: onChange,
    reopenKey,
    value: textureValue
  });

  useEffect(() => {
    setPickingTransparencyColor(false);
  }, [reopenKey, textureValue?.textureId]);

  const onChangeEnd = apply;
  const source = texture.source ?? getTextureSource(texture.textureId);
  const hasTarget = targetSize.width > 0 && targetSize.height > 0;

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
        targetSize
      ),
    [sourceNaturalSize, targetSize, texture]
  );

  useEffect(() => {
    if (texture.tile && !previewGeometry.tileAvailable) {
      update({ tile: false }, { transient: true });
    }
  }, [previewGeometry.tileAvailable, texture.tile, update]);

  const close = () => {
    apply();
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
    update(
      createBitmapTextureFill({
        base: texture,
        name: file.name.replace(/\.[^.]+$/, ""),
        naturalSize,
        source: sourceData,
        targetSize,
        textureId: `custom:${file.name}:${file.lastModified}`
      })
    );
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
    <DraggablePanel
      id={PANEL_ID}
      closable
      defaultOrientation="vertical"
      minSize={{ height: 540, width: 620 }}
      onClose={close}
      orientationChangeable={false}
      pinnable
      reopenKey={reopenKey}
      resizable
      resizeAxes={{ vertical: "horizontal" }}
      title={strings.bitmapPattern.title}
    >
      {({ actions, chrome, orientation }) => (
        <section
          className={`kizkatt-bitmap-pattern-panel kizkatt-bitmap-pattern-panel--${orientation}`}
          aria-label={strings.bitmapPattern.title}
        >
          {chrome}
          <div className="kizkatt-bitmap-pattern-content">
            <div className="kizkatt-bitmap-pattern-source-column">
              <div className="kizkatt-bitmap-pattern-heading-row">
                <div className="kizkatt-bitmap-pattern-name">
                  <span>{strings.bitmapPattern.name}</span>
                  <span>
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
                    <button
                      type="button"
                      aria-label={strings.bitmapPattern.addTexture}
                      title={strings.bitmapPattern.addTexture}
                      onClick={onOpenLibrary}
                    >
                      +
                    </button>
                  </span>
                </div>
              </div>

              <BitmapTextureCropPreview
                cropEnabled={hasTarget}
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
                texture={texture}
                pickingColor={pickingTransparencyColor}
                onClick={pickTransparencyColor}
                onNaturalSizeChange={setSourceNaturalSize}
                onTextureChange={(change) =>
                  update(change, { transient: true })
                }
                onTextureChangeEnd={onChangeEnd}
              />

              <div className="kizkatt-bitmap-pattern-source">
                <strong>{strings.bitmapPattern.source}</strong>
                <div>
                  {source ? <img src={source} alt="" /> : null}
                  <button
                    type="button"
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
                </div>
              </div>
            </div>

            <div className="kizkatt-bitmap-pattern-settings-column">
              <div className="kizkatt-bitmap-pattern-top-settings">
                <fieldset>
                  <legend>{strings.bitmapPattern.blendType}</legend>
                  <div className="kizkatt-bitmap-pattern-button-row">
                    <ToggleButton
                      active={texture.blendMode === "normal"}
                      label={strings.bitmapPattern.blendNormal}
                      onClick={() => {
                        update({ blendMode: "normal" });
                        onChangeEnd();
                      }}
                    >
                      ◎
                    </ToggleButton>
                    <ToggleButton
                      active={texture.blendMode === "multiply"}
                      label={strings.bitmapPattern.blendMultiply}
                      onClick={() => {
                        update({ blendMode: "multiply" });
                        onChangeEnd();
                      }}
                    >
                      ▤
                    </ToggleButton>
                    <EditableNumberInput
                      ariaLabel={strings.bitmapPattern.blendAmount}
                      min={0}
                      max={100}
                      value={texture.blendAmount}
                      onChangeEnd={onChangeEnd}
                      onValueChange={(value) =>
                        updateNumber(
                          "blendAmount",
                          value,
                          0,
                          100
                        )
                      }
                    />
                    <small>%</small>
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
                <button
                  type="button"
                  className="kizkatt-bitmap-pattern-reset-control"
                  aria-label={strings.bitmapPattern.resetTransformations}
                  title={strings.bitmapPattern.resetTransformations}
                  onClick={() => {
                    update(
                      getResetBitmapTextureTransform(sourceNaturalSize)
                    );
                    onChangeEnd();
                  }}
                >
                  {ResetIcon}
                </button>
              </div>

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
    </DraggablePanel>
  );
}
