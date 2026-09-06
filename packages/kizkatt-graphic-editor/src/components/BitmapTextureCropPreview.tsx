import {
  getBitmapTexturePreviewGeometry,
  getBitmapTextureTransformFromPreviewCrop,
  getElementTransformedBounds,
  getResizeCursor,
  getSelectionTransformHandleLayout,
  resizeElementFromHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle,
  snapAngleToIncrement,
  transformElementPoint,
  type BitmapTextureFill,
  type BitmapTexturePreviewGeometry,
  type BitmapTextureSize,
  type KizkattElement,
  type ResizeHandle,
  type SelectionTransformMode,
  type SkewHandle
} from "kizkatt-graphic-engine";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";

import { useWindowPointerTracking } from "../hooks/useWindowPointerTracking";

const DEFAULT_PREVIEW_SIZE = 320;
const MIN_TEXTURE_SIZE = 1;
const MIN_CROP_DRAG_DISTANCE = 3;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const RADIANS_PER_DEGREE = Math.PI / 180;
const ROTATION_SNAP_STEP = 15 * RADIANS_PER_DEGREE;
const CROP_ELEMENT_ID = "bitmap-texture-crop";
const CROP_SCROLL_PADDING = 20;
const CROP_BOUNDS_EPSILON = 0.000001;
const CROP_CONSTRAINT_ITERATIONS = 24;

const RESIZE_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w"
];
const SKEW_HANDLES: SkewHandle[] = ["top", "right", "bottom", "left"];
type CornerHandle = "ne" | "nw" | "se" | "sw";
const CORNER_HANDLES: CornerHandle[] = ["nw", "ne", "se", "sw"];
const TRANSFORM_HANDLE_OFFSET = 20;
const CORNER_ROTATE_ARROW_SHAFT_PATH =
  "M4 14 C4.4 8.6 8.4 4.6 14 4.1 L14.2 6.4 C9.9 6.9 6.9 10.1 6.4 14.2 Z";
const CORNER_ROTATE_ARROW_HEAD_PATH = "M14 1.7 L18.6 4 L14.4 7 Z";

type CropAction = "move" | "resize" | "rotate" | "skew";

type CropInteraction = {
  action: CropAction;
  centerX: number;
  centerY: number;
  handle?: ResizeHandle | SkewHandle;
  hasMoved: boolean;
  originalCrop: BitmapTexturePreviewGeometry["crop"];
  originalElement: KizkattElement;
  pointerId: number;
  pointerCenterX: number;
  pointerCenterY: number;
  startClientX: number;
  startClientY: number;
  startPoint: { x: number; y: number };
  startPointerAngle: number;
  texture: BitmapTextureFill;
};

export type BitmapTextureCropPreviewLabels = {
  crop: string;
  move: string;
  resize: string;
  rotate: string;
  skew: string;
};

export type BitmapTexturePreviewScrollAxis =
  | "horizontal"
  | "none"
  | "vertical";

type PreviewPointerEvent = Pick<
  globalThis.PointerEvent,
  "altKey" | "clientX" | "clientY" | "pointerId" | "preventDefault"
>;

function normalizeAngleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function getScrollPositionForVisibleRange(
  current: number,
  viewportSize: number,
  contentSize: number,
  rangeStart: number,
  rangeEnd: number
) {
  const maximum = Math.max(0, contentSize - viewportSize);
  const padding = Math.min(CROP_SCROLL_PADDING, viewportSize / 4);

  if (rangeStart < current + padding) {
    return Math.max(0, Math.min(maximum, rangeStart - padding));
  }

  if (rangeEnd > current + viewportSize - padding) {
    return Math.max(
      0,
      Math.min(maximum, rangeEnd - viewportSize + padding)
    );
  }

  return current;
}

function isElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  const bounds = getElementTransformedBounds(element);

  return (
    bounds.x >= -CROP_BOUNDS_EPSILON &&
    bounds.y >= -CROP_BOUNDS_EPSILON &&
    bounds.x + bounds.width <= sourceSize.width + CROP_BOUNDS_EPSILON &&
    bounds.y + bounds.height <= sourceSize.height + CROP_BOUNDS_EPSILON
  );
}

function translateElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  const bounds = getElementTransformedBounds(element);
  let deltaX = 0;
  let deltaY = 0;

  if (bounds.x < 0) {
    deltaX = -bounds.x;
  } else if (bounds.x + bounds.width > sourceSize.width) {
    deltaX = sourceSize.width - bounds.x - bounds.width;
  }

  if (bounds.y < 0) {
    deltaY = -bounds.y;
  } else if (bounds.y + bounds.height > sourceSize.height) {
    deltaY = sourceSize.height - bounds.y - bounds.height;
  }

  return {
    ...element,
    x: element.x + deltaX,
    y: element.y + deltaY
  };
}

function fitElementInsideTexture(
  element: KizkattElement,
  sourceSize: BitmapTextureSize
) {
  let nextElement = element;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const bounds = getElementTransformedBounds(nextElement);
    const scale = Math.min(
      1,
      sourceSize.width / Math.max(MIN_TEXTURE_SIZE, bounds.width),
      sourceSize.height / Math.max(MIN_TEXTURE_SIZE, bounds.height)
    );

    if (scale < 1) {
      const centerX = nextElement.x + nextElement.width / 2;
      const centerY = nextElement.y + nextElement.height / 2;
      const width = Math.max(MIN_TEXTURE_SIZE, nextElement.width * scale);
      const height = Math.max(MIN_TEXTURE_SIZE, nextElement.height * scale);
      nextElement = {
        ...nextElement,
        height,
        width,
        x: centerX - width / 2,
        y: centerY - height / 2
      };
    }

    nextElement = translateElementInsideTexture(nextElement, sourceSize);
  }

  return nextElement;
}

function interpolateElement(
  from: KizkattElement,
  to: KizkattElement,
  progress: number
) {
  const interpolate = (start: number, end: number) =>
    start + (end - start) * progress;

  return {
    ...to,
    angle: interpolate(from.angle, to.angle),
    height: interpolate(from.height, to.height),
    skewX: interpolate(from.skewX ?? 0, to.skewX ?? 0),
    skewY: interpolate(from.skewY ?? 0, to.skewY ?? 0),
    width: interpolate(from.width, to.width),
    x: interpolate(from.x, to.x),
    y: interpolate(from.y, to.y)
  };
}

export function constrainBitmapTextureCropElement(
  originalElement: KizkattElement,
  candidateElement: KizkattElement,
  sourceSize: BitmapTextureSize,
  translateCandidate = false
) {
  if (isElementInsideTexture(candidateElement, sourceSize)) {
    return candidateElement;
  }

  const candidateBounds = getElementTransformedBounds(candidateElement);
  if (
    translateCandidate &&
    candidateBounds.width <= sourceSize.width &&
    candidateBounds.height <= sourceSize.height
  ) {
    return translateElementInsideTexture(candidateElement, sourceSize);
  }

  const safeOriginal = isElementInsideTexture(originalElement, sourceSize)
    ? originalElement
    : fitElementInsideTexture(originalElement, sourceSize);
  let minimum = 0;
  let maximum = 1;
  let constrainedElement = safeOriginal;

  for (
    let iteration = 0;
    iteration < CROP_CONSTRAINT_ITERATIONS;
    iteration += 1
  ) {
    const progress = (minimum + maximum) / 2;
    const interpolatedElement = interpolateElement(
      safeOriginal,
      candidateElement,
      progress
    );

    if (isElementInsideTexture(interpolatedElement, sourceSize)) {
      constrainedElement = interpolatedElement;
      minimum = progress;
    } else {
      maximum = progress;
    }
  }

  return constrainedElement;
}

function getInteractiveTexture(
  texture: BitmapTextureFill,
  targetSize: BitmapTextureSize
) {
  if (!texture.fitToObject) {
    return texture;
  }

  return {
    ...texture,
    fitToObject: false,
    height: targetSize.height,
    width: targetSize.width
  };
}

function getCropElement(
  crop: BitmapTexturePreviewGeometry["crop"]
): KizkattElement {
  return {
    angle: crop.rotation * RADIANS_PER_DEGREE,
    backgroundColor: "transparent",
    height: crop.height,
    id: CROP_ELEMENT_ID,
    opacity: 100,
    skewX: crop.skew * RADIANS_PER_DEGREE,
    skewY: crop.skewY * RADIANS_PER_DEGREE,
    strokeColor: "transparent",
    strokeStyle: "solid",
    strokeWidth: 0,
    type: "rectangle",
    width: crop.width,
    x: crop.centerX - crop.width / 2,
    y: crop.centerY - crop.height / 2
  };
}

function getCropFromElement(
  element: KizkattElement
): BitmapTexturePreviewGeometry["crop"] {
  return {
    centerX: element.x + element.width / 2,
    centerY: element.y + element.height / 2,
    height: element.height,
    rotation: element.angle * DEGREES_PER_RADIAN,
    skew: (element.skewX ?? 0) * DEGREES_PER_RADIAN,
    skewY: (element.skewY ?? 0) * DEGREES_PER_RADIAN,
    width: element.width
  };
}

function getCropResizeHandlePoints(element: KizkattElement) {
  const left = element.x;
  const top = element.y;
  const right = element.x + element.width;
  const bottom = element.y + element.height;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return {
    e: transformElementPoint(element, { x: right, y: centerY }),
    n: transformElementPoint(element, { x: centerX, y: top }),
    ne: transformElementPoint(element, { x: right, y: top }),
    nw: transformElementPoint(element, { x: left, y: top }),
    s: transformElementPoint(element, { x: centerX, y: bottom }),
    se: transformElementPoint(element, { x: right, y: bottom }),
    sw: transformElementPoint(element, { x: left, y: bottom }),
    w: transformElementPoint(element, { x: left, y: centerY })
  } satisfies Record<ResizeHandle, { x: number; y: number }>;
}

function CornerRotateIcon({ corner }: { corner: CornerHandle }) {
  const transformByCorner: Record<CornerHandle, string> = {
    ne: "translate(20 0) scale(-1 1)",
    nw: "translate(0 0)",
    se: "translate(20 20) scale(-1 -1)",
    sw: "translate(0 20) scale(1 -1)"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <g transform={transformByCorner[corner]}>
        <path d={CORNER_ROTATE_ARROW_SHAFT_PATH} />
        <path d={CORNER_ROTATE_ARROW_HEAD_PATH} />
      </g>
    </svg>
  );
}

function SkewHandleIcon({ handle }: { handle: SkewHandle }) {
  const horizontal = handle === "top" || handle === "bottom";

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d={
          horizontal
            ? "M2 10 L6 6 M2 10 L6 14 M2 10 H18 M18 10 L14 6 M18 10 L14 14"
            : "M10 2 L6 6 M10 2 L14 6 M10 2 V18 M10 18 L6 14 M10 18 L14 14"
        }
      />
    </svg>
  );
}

export function getBitmapTextureCropPreviewLayout(
  texture: BitmapTextureFill,
  naturalSize: BitmapTextureSize,
  targetSize: BitmapTextureSize,
  viewportSize: BitmapTextureSize
) {
  const sourceWidth = Math.max(MIN_TEXTURE_SIZE, naturalSize.width);
  const sourceHeight = Math.max(MIN_TEXTURE_SIZE, naturalSize.height);
  const viewportWidth = Math.max(MIN_TEXTURE_SIZE, viewportSize.width);
  const viewportHeight = Math.max(MIN_TEXTURE_SIZE, viewportSize.height);
  const sourceAspect = sourceWidth / sourceHeight;
  const viewportAspect = viewportWidth / viewportHeight;
  const scrollAxis: BitmapTexturePreviewScrollAxis =
    Math.abs(sourceAspect - viewportAspect) < Number.EPSILON
      ? "none"
      : sourceAspect > viewportAspect
        ? "horizontal"
        : "vertical";
  const scale =
    scrollAxis === "horizontal"
      ? viewportHeight / sourceHeight
      : viewportWidth / sourceWidth;
  const geometry = getBitmapTexturePreviewGeometry(
    texture,
    naturalSize,
    targetSize
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const overlayWidth = geometry.crop.width * scale;
  const overlayHeight = geometry.crop.height * scale;
  const stageWidth =
    scrollAxis === "horizontal"
      ? Math.max(viewportWidth, renderedWidth)
      : viewportWidth;
  const stageHeight =
    scrollAxis === "vertical"
      ? Math.max(viewportHeight, renderedHeight)
      : viewportHeight;
  const imageLeft = (stageWidth - renderedWidth) / 2;
  const imageTop = (stageHeight - renderedHeight) / 2;

  return {
    geometry,
    imageLeft,
    imageTop,
    overlayHeight,
    overlayLeft: imageLeft + geometry.crop.centerX * scale,
    overlayTop: imageTop + geometry.crop.centerY * scale,
    overlayWidth,
    renderedHeight,
    renderedWidth,
    scale,
    scrollAxis,
    stageHeight,
    stageWidth
  };
}

export function BitmapTextureCropPreview({
  cropEnabled = true,
  freeDeformation = false,
  imageRef,
  labels,
  onClick,
  onNaturalSizeChange,
  onTextureChange,
  onTextureChangeEnd,
  pickingColor = false,
  shadeOverlay = true,
  source,
  targetSize,
  texture
}: {
  cropEnabled?: boolean;
  freeDeformation?: boolean;
  imageRef?: RefObject<HTMLImageElement | null>;
  labels: BitmapTextureCropPreviewLabels;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onNaturalSizeChange?: (size: BitmapTextureSize) => void;
  onTextureChange: (change: Partial<BitmapTextureFill>) => void;
  onTextureChangeEnd: () => void;
  pickingColor?: boolean;
  shadeOverlay?: boolean;
  source?: string;
  targetSize: BitmapTextureSize;
  texture: BitmapTextureFill;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cropRef = useRef<HTMLDivElement | null>(null);
  const localImageRef = useRef<HTMLImageElement | null>(null);
  const interactionRef = useRef<CropInteraction | null>(null);
  const previewFrameRef = useRef({ imageLeft: 0, imageTop: 0 });
  const [interactionActive, setInteractionActive] = useState(false);
  const [naturalSize, setNaturalSize] = useState<BitmapTextureSize>({
    height: Math.max(MIN_TEXTURE_SIZE, texture.height),
    width: Math.max(MIN_TEXTURE_SIZE, texture.width)
  });
  const [viewportSize, setViewportSize] = useState<BitmapTextureSize>({
    height: DEFAULT_PREVIEW_SIZE,
    width: DEFAULT_PREVIEW_SIZE
  });
  const [transformMode, setTransformMode] =
    useState<SelectionTransformMode>("resize");

  useEffect(() => {
    setTransformMode("resize");
    setNaturalSize({
      height: Math.max(MIN_TEXTURE_SIZE, texture.height),
      width: Math.max(MIN_TEXTURE_SIZE, texture.width)
    });
  }, [source, texture.textureId]);

  useEffect(() => {
    if (!freeDeformation) {
      setTransformMode("resize");
    }
  }, [freeDeformation]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateViewportSize = () => {
      const bounds = viewport.getBoundingClientRect();
      setViewportSize({
        height: viewport.clientHeight || bounds.height || DEFAULT_PREVIEW_SIZE,
        width: viewport.clientWidth || bounds.width || DEFAULT_PREVIEW_SIZE
      });
    };

    updateViewportSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const preview = useMemo(
    () =>
      getBitmapTextureCropPreviewLayout(
        texture,
        naturalSize,
        targetSize,
        viewportSize
      ),
    [naturalSize, targetSize, texture, viewportSize]
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const previousFrame = previewFrameRef.current;

    if (viewport && interactionActive) {
      viewport.scrollLeft += preview.imageLeft - previousFrame.imageLeft;
      viewport.scrollTop += preview.imageTop - previousFrame.imageTop;

      const cropBounds = getElementTransformedBounds(
        getCropElement(preview.geometry.crop)
      );
      const cropLeft = preview.imageLeft + cropBounds.x * preview.scale;
      const cropTop = preview.imageTop + cropBounds.y * preview.scale;

      if (preview.scrollAxis === "horizontal") {
        viewport.scrollLeft = getScrollPositionForVisibleRange(
          viewport.scrollLeft,
          viewport.clientWidth,
          viewport.scrollWidth,
          cropLeft,
          cropLeft + cropBounds.width * preview.scale
        );
      } else if (preview.scrollAxis === "vertical") {
        viewport.scrollTop = getScrollPositionForVisibleRange(
          viewport.scrollTop,
          viewport.clientHeight,
          viewport.scrollHeight,
          cropTop,
          cropTop + cropBounds.height * preview.scale
        );
      }
    }

    previewFrameRef.current = {
      imageLeft: preview.imageLeft,
      imageTop: preview.imageTop
    };
  }, [interactionActive, preview]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(
        0,
        (viewport.scrollWidth - viewport.clientWidth) / 2
      );
      viewport.scrollTop = Math.max(
        0,
        (viewport.scrollHeight - viewport.clientHeight) / 2
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [
    naturalSize.height,
    naturalSize.width,
    source,
    viewportSize.height,
    viewportSize.width
  ]);

  const setImage = (image: HTMLImageElement | null) => {
    localImageRef.current = image;

    if (imageRef) {
      imageRef.current = image;
    }
  };

  const onImageLoad = () => {
    const image = localImageRef.current;

    if (!image) {
      return;
    }

    const nextSize = {
      height: Math.max(MIN_TEXTURE_SIZE, image.naturalHeight),
      width: Math.max(MIN_TEXTURE_SIZE, image.naturalWidth)
    };
    setNaturalSize(nextSize);
    onNaturalSizeChange?.(nextSize);
  };

  const getSourcePoint = (clientX: number, clientY: number) => {
    const stageBounds = stageRef.current?.getBoundingClientRect();

    return {
      x:
        (clientX - (stageBounds?.left ?? 0) - preview.imageLeft) /
        preview.scale,
      y:
        (clientY - (stageBounds?.top ?? 0) - preview.imageTop) /
        preview.scale
    };
  };

  const beginInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    action: CropAction,
    handle?: ResizeHandle | SkewHandle
  ) => {
    if (pickingColor) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const crop = cropRef.current;

    if (!crop) {
      return;
    }

    const cropBounds = crop.getBoundingClientRect();
    const pointerCenterX = cropBounds.left + cropBounds.width / 2;
    const pointerCenterY = cropBounds.top + cropBounds.height / 2;
    const interactiveTexture = getInteractiveTexture(texture, targetSize);
    const originalCrop = getBitmapTexturePreviewGeometry(
      interactiveTexture,
      naturalSize,
      targetSize
    ).crop;
    const startPoint = getSourcePoint(event.clientX, event.clientY);

    interactionRef.current = {
      action,
      centerX: originalCrop.centerX,
      centerY: originalCrop.centerY,
      handle,
      hasMoved: false,
      originalCrop,
      originalElement: getCropElement(originalCrop),
      pointerId: event.pointerId,
      pointerCenterX,
      pointerCenterY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPoint,
      startPointerAngle: Math.atan2(
        event.clientY - pointerCenterY,
        event.clientX - pointerCenterX
      ),
      texture: interactiveTexture
    };
    setInteractionActive(true);
    stageRef.current?.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PreviewPointerEvent) => {
    const interaction = interactionRef.current;

    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - interaction.startClientX;
    const deltaY = event.clientY - interaction.startClientY;
    interaction.hasMoved ||=
      Math.hypot(deltaX, deltaY) >= MIN_CROP_DRAG_DISTANCE;

    if (!interaction.hasMoved) {
      return;
    }

    if (interaction.action === "move") {
      const movedElement = constrainBitmapTextureCropElement(
        interaction.originalElement,
        {
          ...interaction.originalElement,
          x: interaction.originalElement.x + deltaX / preview.scale,
          y: interaction.originalElement.y + deltaY / preview.scale
        },
        naturalSize,
        true
      );
      onTextureChange(
        getBitmapTextureTransformFromPreviewCrop(
          interaction.texture,
          naturalSize,
          targetSize,
          getCropFromElement(movedElement)
        )
      );
      return;
    }

    if (interaction.action === "resize") {
      const handle = interaction.handle;

      if (!handle || !RESIZE_HANDLES.includes(handle as ResizeHandle)) {
        return;
      }

      const resizedElement = constrainBitmapTextureCropElement(
        interaction.originalElement,
        resizeElementFromHandle(
          interaction.originalElement,
          handle as ResizeHandle,
          getSourcePoint(event.clientX, event.clientY),
          { preserveAspectRatio: event.altKey }
        ),
        naturalSize
      );
      onTextureChange(
        getBitmapTextureTransformFromPreviewCrop(
          interaction.texture,
          naturalSize,
          targetSize,
          getCropFromElement(resizedElement)
        )
      );
      return;
    }

    if (interaction.action === "rotate") {
      const pointerAngle = Math.atan2(
        event.clientY - interaction.pointerCenterY,
        event.clientX - interaction.pointerCenterX
      );
      const rawDelta = normalizeAngleDelta(
        pointerAngle - interaction.startPointerAngle
      );
      const angleDelta = event.altKey
        ? snapAngleToIncrement(rawDelta, ROTATION_SNAP_STEP)
        : rawDelta;
      const rotatedElement = rotateElementsAroundPoint(
        [interaction.originalElement],
        [interaction.originalElement.id],
        { x: interaction.centerX, y: interaction.centerY },
        angleDelta
      )[0];

      if (rotatedElement) {
        const constrainedElement = constrainBitmapTextureCropElement(
          interaction.originalElement,
          rotatedElement,
          naturalSize,
          true
        );
        onTextureChange(
          getBitmapTextureTransformFromPreviewCrop(
            interaction.texture,
            naturalSize,
            targetSize,
            getCropFromElement(constrainedElement)
          )
        );
      }
      return;
    }

    const handle = interaction.handle;

    if (!handle || !SKEW_HANDLES.includes(handle as SkewHandle)) {
      return;
    }

    const skewedElement = skewElementsFromSelectionHandle(
      [interaction.originalElement],
      [interaction.originalElement.id],
      getElementTransformedBounds(interaction.originalElement),
      {
        x: interaction.originalCrop.centerX,
        y: interaction.originalCrop.centerY
      },
      handle as SkewHandle,
      interaction.startPoint,
      getSourcePoint(event.clientX, event.clientY)
    )[0];

    if (!skewedElement) {
      return;
    }

    const constrainedElement = constrainBitmapTextureCropElement(
      interaction.originalElement,
      skewedElement,
      naturalSize
    );

    onTextureChange(
      getBitmapTextureTransformFromPreviewCrop(
        interaction.texture,
        naturalSize,
        targetSize,
        getCropFromElement(constrainedElement)
      )
    );
  };

  const finishInteraction = (
    event: Pick<globalThis.PointerEvent, "pointerId"> | null,
    allowModeToggle = true
  ) => {
    const interaction = interactionRef.current;

    if (
      !interaction ||
      (event && interaction.pointerId !== event.pointerId)
    ) {
      return;
    }

    interactionRef.current = null;
    setInteractionActive(false);
    const stage = stageRef.current;
    if (stage?.hasPointerCapture?.(interaction.pointerId)) {
      stage.releasePointerCapture(interaction.pointerId);
    }

    if (
      freeDeformation &&
      allowModeToggle &&
      interaction.action === "move" &&
      !interaction.hasMoved
    ) {
      setTransformMode((mode) => (mode === "resize" ? "skew" : "resize"));
    }

    onTextureChangeEnd();
  };

  useWindowPointerTracking({
    active: interactionActive,
    onPointerCancel: () => finishInteraction(null, false),
    onPointerMove,
    onPointerUp: (event) => finishInteraction(event)
  });

  const cropElement = getCropElement(preview.geometry.crop);
  const resizeHandlePoints = getCropResizeHandlePoints(cropElement);
  const transformedBounds = getElementTransformedBounds(cropElement);
  const toStagePoint = (point: { x: number; y: number }) => ({
    left: preview.imageLeft + point.x * preview.scale,
    top: preview.imageTop + point.y * preview.scale
  });
  const transformHandleLayout = getSelectionTransformHandleLayout(
    {
      height: transformedBounds.height * preview.scale,
      width: transformedBounds.width * preview.scale,
      x: preview.imageLeft + transformedBounds.x * preview.scale,
      y: preview.imageTop + transformedBounds.y * preview.scale
    },
    TRANSFORM_HANDLE_OFFSET
  );
  const toPositionStyle = (point: { x: number; y: number }) => ({
    left: point.x,
    top: point.y
  });
  const skewHandlePoints: Record<SkewHandle, { left: number; top: number }> = {
    bottom: toPositionStyle(transformHandleLayout.edges.bottom),
    left: toPositionStyle(transformHandleLayout.edges.left),
    right: toPositionStyle(transformHandleLayout.edges.right),
    top: toPositionStyle(transformHandleLayout.edges.top)
  };
  const cornerRotatePoints: Record<
    CornerHandle,
    { left: number; top: number }
  > = {
    ne: toPositionStyle(transformHandleLayout.corners.ne),
    nw: toPositionStyle(transformHandleLayout.corners.nw),
    se: toPositionStyle(transformHandleLayout.corners.se),
    sw: toPositionStyle(transformHandleLayout.corners.sw)
  };

  return (
    <div
      ref={viewportRef}
      className={`kizkatt-bitmap-pattern-preview is-scroll-${
        preview.scrollAxis
      }${
        pickingColor ? " is-picking-color" : ""
      }`}
      onClick={onClick}
    >
      {source ? (
        <div
          ref={stageRef}
          className="kizkatt-bitmap-texture-preview-stage"
          style={{ height: preview.stageHeight, width: preview.stageWidth }}
        >
          <img
            ref={setImage}
            src={source}
            alt=""
            draggable={false}
            onLoad={onImageLoad}
            style={{
              height: preview.renderedHeight,
              left: preview.imageLeft,
              top: preview.imageTop,
              width: preview.renderedWidth
            }}
          />
          {cropEnabled && (
            <div
              ref={cropRef}
              aria-label={labels.crop}
              className={`kizkatt-bitmap-texture-crop is-${transformMode}-mode${
                shadeOverlay ? " is-overlay-shaded" : ""
              }`}
              data-bitmap-texture-crop
              style={{
                height: preview.overlayHeight,
                left: preview.overlayLeft,
                top: preview.overlayTop,
                transform: `translate(-50%, -50%) rotate(${preview.geometry.crop.rotation}deg) skewX(${preview.geometry.crop.skew}deg) skewY(${preview.geometry.crop.skewY}deg)`,
                width: preview.overlayWidth
              }}
              title={labels.move}
              onPointerDown={(event) => beginInteraction(event, "move")}
            />
          )}
          {cropEnabled && freeDeformation && transformMode === "resize" && (
            <>
              {RESIZE_HANDLES.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={labels.resize}
                  className={`kizkatt-bitmap-texture-crop-handle is-resize is-${handle}`}
                  style={{
                    ...toStagePoint(resizeHandlePoints[handle]),
                    cursor: getResizeCursor(
                      preview.geometry.crop.rotation * RADIANS_PER_DEGREE,
                      handle
                    )
                  }}
                  title={labels.resize}
                  onPointerDown={(event) =>
                    beginInteraction(event, "resize", handle)
                  }
                />
              ))}
              <span
                aria-hidden="true"
                className="kizkatt-bitmap-texture-transform-center is-resize"
                style={toStagePoint({
                  x: preview.geometry.crop.centerX,
                  y: preview.geometry.crop.centerY
                })}
              >
                ×
              </span>
            </>
          )}
          {cropEnabled && freeDeformation && transformMode === "skew" && (
            <>
              {SKEW_HANDLES.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  aria-label={labels.skew}
                  className={`kizkatt-bitmap-texture-crop-handle is-skew is-skew-${handle}`}
                  style={skewHandlePoints[handle]}
                  title={labels.skew}
                  onPointerDown={(event) =>
                    beginInteraction(event, "skew", handle)
                  }
                >
                  <SkewHandleIcon handle={handle} />
                </button>
              ))}
              {CORNER_HANDLES.map((corner) => (
                <button
                  key={corner}
                  type="button"
                  aria-label={labels.rotate}
                  className={`kizkatt-bitmap-texture-crop-handle is-corner-rotate is-${corner}`}
                  style={cornerRotatePoints[corner]}
                  title={labels.rotate}
                  onPointerDown={(event) => beginInteraction(event, "rotate")}
                >
                  <CornerRotateIcon corner={corner} />
                </button>
              ))}
              <span
                aria-hidden="true"
                className="kizkatt-bitmap-texture-transform-center is-skew"
                style={toStagePoint({
                  x: preview.geometry.crop.centerX,
                  y: preview.geometry.crop.centerY
                })}
              >
                ⊙
              </span>
            </>
          )}
        </div>
      ) : (
        <span className="kizkatt-bitmap-texture-preview-empty" />
      )}
    </div>
  );
}
