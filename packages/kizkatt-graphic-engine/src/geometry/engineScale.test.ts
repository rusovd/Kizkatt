import { describe, expect, it } from "vitest";

import {
  breakApartSvgElement,
  createBitmapTextureFill,
  DEFAULT_BITMAP_TEXTURE_FILL,
  findElementAtPoint,
  getBitmapTextureAdjustments,
  getBitmapTexturePlacement,
  getBitmapTexturePreviewGeometry,
  getBitmapTextureTargetTransform,
  getBitmapTextureTransformFromPreviewCrop,
  getCoveredBitmapSourcePoint,
  getDpiPixelRatio,
  getDimensionFromScalePercent,
  getElementBounds,
  getElementIndicesInBounds,
  getElementLocalPoint,
  getElementShapeProps,
  getResizeAnchorPoint,
  getScalePercentFromDimension,
  getInitialBitmapTextureSize,
  getResetBitmapTextureTransform,
  getResizedBitmapTextureSize,
  getSelectionTransformHandleLayout,
  moveBitmapTextureCrop,
  isExpectedCopiedPngSize,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  scaleBitmapTextureCrop,
  observeHitTesting,
  simplifyPolyline,
  snapPointToElements,
  transformElementPoint,
  type HitTestProfileSample,
  type KizkattElement,
  type Point
} from "../index";

function createRectangle(index: number): KizkattElement {
  const column = index % 100;
  const row = Math.floor(index / 100);

  return {
    angle: 0,
    backgroundColor: "#ffffff",
    height: 32,
    id: `rectangle-${index}`,
    opacity: 100,
    strokeColor: "#000000",
    strokeStyle: "solid",
    strokeWidth: 2,
    type: "rectangle",
    width: 32,
    x: column * 64,
    y: row * 64
  };
}

describe("engine scale safeguards", () => {
  it("converts absolute dimensions and scale percentages consistently", () => {
    expect(getDimensionFromScalePercent(120, 150)).toBe(180);
    expect(getScalePercentFromDimension(120, 180)).toBe(150);
    expect(getScalePercentFromDimension(120, -20)).toBe(0);
  });

  it("uses document DPI for raster quality and copied image sizing", () => {
    expect(getDpiPixelRatio()).toBeCloseTo(150 / 96);
    expect(getDpiPixelRatio(300)).toBeCloseTo(300 / 96);
    expect(
      isExpectedCopiedPngSize(313, 157, { height: 100, width: 200 }, 150)
    ).toBe(true);
    expect(
      isExpectedCopiedPngSize(625, 313, { height: 100, width: 200 }, 300)
    ).toBe(true);
  });

  it("narrows hit testing to a small spatial-index candidate set", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const samples: HitTestProfileSample[] = [];
    const stopObserving = observeHitTesting((sample) => samples.push(sample));

    expect(findElementAtPoint(elements, { x: 1, y: 1 })?.id).toBe(
      "rectangle-0"
    );
    stopObserving();

    expect(samples).toHaveLength(1);
    expect(samples[0].elementCount).toBe(10_000);
    expect(samples[0].candidateCount).toBeLessThan(100);
  });

  it("simplifies a large freehand stroke without losing its endpoints", () => {
    const points: Point[] = Array.from({ length: 5_000 }, (_, index) => ({
      x: index,
      y: index * 0.25 + Math.sin(index / 10) * 0.1
    }));

    const simplified = simplifyPolyline(points, 0.75);

    expect(simplified.length).toBeLessThan(points.length / 100);
    expect(simplified[0]).toEqual(points[0]);
    expect(simplified.at(-1)).toEqual(points.at(-1));
  });

  it("uses the same cached scene for object snapping during a gesture", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const pointer = { x: 6_373, y: 6_371 };

    expect(snapPointToElements(pointer, elements)).toEqual({
      x: 6_368,
      y: 6_368
    });
    expect(
      snapPointToElements(pointer, elements, {
        ignoredIds: ["rectangle-9999"]
      })
    ).toBe(pointer);
  });

  it("limits gesture rendering to the viewport and selected objects", () => {
    const elements = Array.from({ length: 10_000 }, (_, index) =>
      createRectangle(index)
    );
    const visibleIndices = getElementIndicesInBounds(
      elements,
      { height: 256, width: 256, x: 0, y: 0 },
      new Set(["rectangle-9999"])
    );

    expect(visibleIndices).toHaveLength(26);
    expect(visibleIndices.at(-1)).toBe(9_999);
  });

  it("culls small scenes without building a spatial index", () => {
    const elements = [
      createRectangle(0),
      { ...createRectangle(1), x: 2_000, y: 2_000 },
      { ...createRectangle(2), x: 3_000, y: 3_000 }
    ];

    expect(
      getElementIndicesInBounds(
        elements,
        { height: 100, width: 100, x: 0, y: 0 },
        new Set(["rectangle-2"])
      )
    ).toEqual([0, 2]);
  });

  it("scales stroke width only when scale with object is enabled", () => {
    const rectangle = createRectangle(0);
    const point = {
      x: rectangle.x + rectangle.width * 2,
      y: rectangle.y + rectangle.height * 2
    };

    expect(
      resizeElementFromHandle(rectangle, "se", point).strokeWidth
    ).toBe(rectangle.strokeWidth);
    expect(
      resizeElementFromHandle(
        { ...rectangle, scaleStrokeWithObject: true },
        "se",
        point
      ).strokeWidth
    ).toBe(rectangle.strokeWidth * 2);
  });

  it("scales bitmap texture geometry with resized objects when enabled", () => {
    const bitmapTexture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      height: 80,
      offsetX: 12,
      offsetY: -6,
      transformWithObject: true,
      width: 200
    };
    const rectangle = {
      ...createRectangle(0),
      bitmapTexture,
      height: 40,
      width: 100
    };
    const resized = resizeElementFromHandle(rectangle, "se", {
      x: 200,
      y: 120
    });

    expect(resized.bitmapTexture).toMatchObject({
      height: 240,
      offsetX: 24,
      offsetY: -18,
      width: 400
    });

    const [groupResized] = resizeElementsFromSelectionHandle(
      [rectangle],
      [rectangle.id],
      getElementBounds(rectangle),
      "se",
      { x: 150, y: 80 }
    );

    expect(groupResized.bitmapTexture).toMatchObject({
      height: 160,
      offsetX: 18,
      offsetY: -12,
      width: 300
    });

    const objectPanelBaseRectangle = {
      ...rectangle,
      bitmapTexture: groupResized.bitmapTexture
    };
    const [objectPanelResized] = resizeElementsFromSelectionHandle(
      [objectPanelBaseRectangle],
      [objectPanelBaseRectangle.id],
      getElementBounds(objectPanelBaseRectangle),
      "se",
      { x: 200, y: 120 },
      {
        bitmapTextureScale: {
          x: 200 / 150,
          y: 120 / 80
        }
      }
    );

    expect(objectPanelResized.bitmapTexture).toMatchObject({
      height: 240,
      offsetX: 24,
      offsetY: -18,
      width: 400
    });

    const fixedTextureRectangle = {
      ...rectangle,
      bitmapTexture: {
        ...bitmapTexture,
        transformWithObject: false
      }
    };
    const fixedTextureResized = resizeElementFromHandle(
      fixedTextureRectangle,
      "se",
      { x: 200, y: 120 }
    );

    expect(fixedTextureResized.bitmapTexture).toEqual(
      fixedTextureRectangle.bitmapTexture
    );
  });

  it("lets actual element strokes scale with viewport zoom", () => {
    const rectangle = createRectangle(0);

    expect(getElementShapeProps(rectangle)).not.toHaveProperty(
      "vectorEffect"
    );
  });

  it("preserves proportions from corner and edge resize handles", () => {
    const rectangle = { ...createRectangle(0), height: 50, width: 100 };
    const cornerResized = resizeElementFromHandle(
      rectangle,
      "se",
      { x: 200, y: 70 },
      { preserveAspectRatio: true }
    );
    const edgeResized = resizeElementFromHandle(
      rectangle,
      "e",
      { x: 200, y: 25 },
      { preserveAspectRatio: true }
    );

    expect(cornerResized.width / cornerResized.height).toBeCloseTo(2);
    expect(edgeResized).toMatchObject({
      height: 100,
      width: 200,
      x: 0,
      y: -25
    });
  });

  it("resizes a bent line from its full visual bounds", () => {
    const line: KizkattElement = {
      angle: Math.PI / 4,
      backgroundColor: "transparent",
      bends: [
        { x: 0, y: 300 },
        { x: 300, y: 300 },
        { x: 300, y: 0 }
      ],
      edgeStyle: "round",
      height: 10,
      id: "bent-line",
      opacity: 100,
      strokeColor: "#d6d6d6",
      strokeStyle: "solid",
      strokeWidth: 10,
      type: "line",
      width: 12,
      x: 100,
      y: 100
    };
    const originalBounds = getElementBounds(line);
    const originalAnchor = transformElementPoint(line, {
      x: originalBounds.x,
      y: originalBounds.y
    });
    const target = transformElementPoint(line, {
      x: originalBounds.x + originalBounds.width * 2,
      y: originalBounds.y + originalBounds.height * 2
    });
    const resized = resizeElementFromHandle(line, "se", target);
    const resizedBounds = getElementBounds(resized);

    expect(resizedBounds.width).toBeCloseTo(originalBounds.width * 2);
    expect(resizedBounds.height).toBeCloseTo(originalBounds.height * 2);
    expect(resized.width).toBeGreaterThan(line.width * 2);
    expect(resized.height).toBeGreaterThan(line.height * 2);
    const resizedAnchor = transformElementPoint(resized, {
      x: resizedBounds.x,
      y: resizedBounds.y
    });

    expect(resizedAnchor.x).toBeCloseTo(originalAnchor.x);
    expect(resizedAnchor.y).toBeCloseTo(originalAnchor.y);
    const resizedHandle = transformElementPoint(resized, {
      x: resizedBounds.x + resizedBounds.width,
      y: resizedBounds.y + resizedBounds.height
    });

    expect(resizedHandle.x).toBeCloseTo(target.x);
    expect(resizedHandle.y).toBeCloseTo(target.y);
  });

  it("keeps mirrored element geometry interactive", () => {
    const rectangle = { ...createRectangle(0), flipX: true };
    const localCorner = { x: rectangle.x, y: rectangle.y };
    const mirroredCorner = {
      x: rectangle.x + rectangle.width,
      y: rectangle.y
    };

    expect(transformElementPoint(rectangle, localCorner)).toEqual(
      mirroredCorner
    );
    expect(getElementLocalPoint(rectangle, mirroredCorner)).toEqual(
      localCorner
    );
    expect(getResizeAnchorPoint(rectangle, "nw")).toEqual({ x: 0, y: 32 });

    const resized = resizeElementFromHandle(rectangle, "nw", {
      x: 64,
      y: -32
    });

    expect(resized).toMatchObject({
      flipX: true,
      height: 64,
      width: 64,
      x: 0,
      y: -32
    });
    expect(transformElementPoint(resized, { x: 0, y: -32 })).toEqual({
      x: 64,
      y: -32
    });
  });

  it("restores bitmap texture settings from Kizkatt SVG metadata", () => {
    const bitmapTexture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      mirrorX: true,
      name: "Abstract Lines",
      rotation: 25,
      source: "data:image/png;base64,AA==",
      textureId: "custom:abstract-lines"
    };
    const metadata = JSON.stringify({
      backgroundColor: "#eeeeee",
      bitmapTexture,
      fillStyle: "blackWhiteTexture",
      fillWeight: 2
    });
    const sourceElement: KizkattElement = {
      ...createRectangle(0),
      svgContent: `<g data-element-id="texture-rectangle" data-element-type="rectangle"><metadata>${metadata}</metadata><rect x="0" y="0" width="32" height="32" fill="url(#texture)" stroke="#000000"/></g>`,
      svgViewBox: "0 0 32 32",
      type: "image"
    };

    const [imported] = breakApartSvgElement(
      sourceElement,
      [],
      sourceElement
    );

    expect(imported).toMatchObject({
      backgroundColor: "#eeeeee",
      bitmapTexture,
      fillStyle: "monochromeTexture",
      fillWeight: 2,
      type: "rectangle"
    });
  });

  it("keeps bitmap texture sizing and centered crop geometry in the engine", () => {
    expect(
      createBitmapTextureFill({
        base: {
          ...DEFAULT_BITMAP_TEXTURE_FILL,
          brightness: -20,
          brightnessEnabled: true,
          fitToObject: true,
          height: 999,
          mirrorX: true,
          offsetX: 500,
          offsetY: -300,
          rotation: 30,
          skew: 12,
          skewY: -4,
          tile: true,
          width: 888
        },
        name: "Abstract 001",
        naturalSize: { height: 80, width: 200 },
        targetSize: { height: 120, width: 100 },
        textureId: "monochrome.abstract.001"
      })
    ).toMatchObject({
      brightness: -20,
      brightnessEnabled: true,
      fitToObject: false,
      height: 80,
      mirrorX: false,
      name: "Abstract 001",
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      skew: 0,
      skewY: 0,
      textureId: "monochrome.abstract.001",
      tile: false,
      width: 200
    });
    expect(
      getInitialBitmapTextureSize(
        { height: 80, width: 200 },
        { height: 120, width: 100 }
      )
    ).toEqual({ height: 80, width: 200 });
    expect(
      getResizedBitmapTextureSize(
        { height: 100, width: 200 },
        "width",
        300,
        { locked: true }
      )
    ).toEqual({ height: 150, width: 300 });

    const rectangle = {
      ...createRectangle(0),
      height: 70,
      width: 120,
      x: 40,
      y: 50
    };
    const placement = getBitmapTexturePlacement(rectangle, {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      height: 4912,
      width: 7360
    });

    expect(placement).toEqual({
      bounds: { height: 70, width: 120, x: 40, y: 50 },
      image: { height: 4912, width: 7360, x: -3680, y: -2456 },
      transform: {
        centerX: 100,
        centerY: 85,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
      }
    });
    expect(
      getBitmapTexturePlacement(rectangle, {
        ...DEFAULT_BITMAP_TEXTURE_FILL,
        height: 4912,
        transformWithObject: false,
        width: 7360
      }).transform
    ).toMatchObject({ centerX: 100, centerY: 85 });

    const texture = {
      ...DEFAULT_BITMAP_TEXTURE_FILL,
      height: 80,
      offsetX: 10,
      offsetY: -5,
      rotation: 15,
      skew: 8,
      width: 200
    };

    expect(
      getBitmapTexturePreviewGeometry(
        texture,
        { height: 80, width: 200 },
        { height: 120, width: 100 }
      )
    ).toEqual({
      crop: {
        centerX: 90,
        centerY: 45,
        height: 120,
        rotation: -15,
        skew: -8,
        skewY: 0,
        width: 100
      },
      tileAvailable: true
    });
    expect(
      moveBitmapTextureCrop(
        texture,
        { height: 80, width: 200 },
        { x: 20, y: 8 }
      )
    ).toEqual({ offsetX: -10, offsetY: -13 });
    expect(scaleBitmapTextureCrop(texture, 2)).toEqual({
      height: 40,
      offsetX: 5,
      offsetY: -2.5,
      width: 100
    });
    expect(
      getBitmapTextureTransformFromPreviewCrop(
        { height: 80, width: 200 },
        { height: 120, width: 100 },
        {
          centerX: 80,
          centerY: 50,
          height: 60,
          rotation: 30,
          skew: 10,
          skewY: -5,
          width: 50
        }
      )
    ).toEqual({
      fitToObject: false,
      height: 160,
      offsetX: 40,
      offsetY: -20,
      rotation: -30,
      skew: -10,
      skewY: 5,
      width: 400
    });

    const targetTransform = getBitmapTextureTargetTransform({
      ...rectangle,
      angle: Math.PI / 6,
      skewX: Math.PI / 18,
      skewY: -Math.PI / 36
    });
    expect(targetTransform.rotation).toBeCloseTo(30);
    expect(targetTransform.skew).toBeCloseTo(10);
    expect(targetTransform.skewY).toBeCloseTo(-5);

    const transformedPreview = getBitmapTexturePreviewGeometry(
      texture,
      { height: 80, width: 200 },
      { height: 120, width: 100 },
      targetTransform
    );
    expect(transformedPreview.crop.rotation).toBeCloseTo(15);
    expect(transformedPreview.crop.skew).toBeCloseTo(2);
    expect(transformedPreview.crop.skewY).toBeCloseTo(-5);
    const restoredTextureTransform =
      getBitmapTextureTransformFromPreviewCrop(
        { height: 80, width: 200 },
        { height: 120, width: 100 },
        transformedPreview.crop,
        targetTransform
      );
    expect(restoredTextureTransform.rotation).toBeCloseTo(15);
    expect(restoredTextureTransform.skew).toBeCloseTo(8);
    expect(restoredTextureTransform.skewY).toBeCloseTo(0);
    expect(
      getResetBitmapTextureTransform({ height: 7360, width: 4912 })
    ).toEqual({
      fitToObject: false,
      height: 7360,
      mirrorX: false,
      mirrorY: false,
      offset: 0,
      offsetMode: "row",
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scaleLocked: true,
      skew: 0,
      skewY: 0,
      tile: false,
      transformWithObject: true,
      width: 4912
    });
  });

  it("uses one bounding-box layout for canvas and texture transform handles", () => {
    expect(
      getSelectionTransformHandleLayout(
        { height: 80, width: 120, x: 40, y: 60 },
        20
      )
    ).toEqual({
      corners: {
        ne: { x: 180, y: 40 },
        nw: { x: 20, y: 40 },
        se: { x: 180, y: 160 },
        sw: { x: 20, y: 160 }
      },
      edges: {
        bottom: { x: 100, y: 160 },
        left: { x: 20, y: 100 },
        right: { x: 180, y: 100 },
        top: { x: 100, y: 40 }
      }
    });
  });

  it("maps a cover preview point and texture adjustments without UI state", () => {
    expect(
      getCoveredBitmapSourcePoint(
        { height: 200, width: 400 },
        { height: 100, width: 100 },
        { x: 50, y: 50 }
      )
    ).toEqual({ x: 200, y: 100 });

    expect(
      getBitmapTextureAdjustments({
        ...DEFAULT_BITMAP_TEXTURE_FILL,
        blendAmount: 75,
        brightness: -20,
        brightnessEnabled: true,
        color: 30,
        colorEnabled: true,
        desaturateEnabled: true,
        edgeMatch: 50,
        edgeMatchEnabled: true,
        luminance: 15,
        luminanceEnabled: true
      })
    ).toEqual({
      blendMode: "normal",
      blur: 0.5,
      brightness: 80,
      contrast: 115,
      destinationOut: 0,
      multiply: 0,
      opacity: 0.75,
      saturation: 0
    });
  });
});
