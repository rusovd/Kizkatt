import {
  DEFAULT_BITMAP_TEXTURE_FILL,
  DEFAULT_SVG_TEXTURE_FILL,
  getBitmapTexturePlacement,
  type KizkattElement
} from "kizkatt-graphic-engine";

const MIN_PATTERN_SIZE = 1;

export function SvgTextureFillPattern({
  element,
  patternId,
  source
}: {
  element: KizkattElement;
  patternId: string;
  source: string;
}) {
  const svgTexture = {
    ...DEFAULT_SVG_TEXTURE_FILL,
    ...element.svgTexture,
    fitToObject:
      element.svgTexture?.fitToObject ??
      DEFAULT_SVG_TEXTURE_FILL.fitToObject,
    height:
      element.svgTexture?.height ?? DEFAULT_SVG_TEXTURE_FILL.height,
    offsetX:
      element.svgTexture?.offsetX ?? DEFAULT_SVG_TEXTURE_FILL.offsetX,
    offsetY:
      element.svgTexture?.offsetY ?? DEFAULT_SVG_TEXTURE_FILL.offsetY,
    rotation:
      element.svgTexture?.rotation ?? DEFAULT_SVG_TEXTURE_FILL.rotation,
    skew: element.svgTexture?.skew ?? DEFAULT_SVG_TEXTURE_FILL.skew,
    skewY: element.svgTexture?.skewY ?? DEFAULT_SVG_TEXTURE_FILL.skewY,
    width: element.svgTexture?.width ?? DEFAULT_SVG_TEXTURE_FILL.width
  };
  const placement = getBitmapTexturePlacement(element, {
    ...DEFAULT_BITMAP_TEXTURE_FILL,
    ...svgTexture,
    height: Math.max(MIN_PATTERN_SIZE, Math.abs(svgTexture.height)),
    width: Math.max(MIN_PATTERN_SIZE, Math.abs(svgTexture.width))
  });
  const localCenterX =
    placement.transform.centerX - placement.bounds.x;
  const localCenterY =
    placement.transform.centerY - placement.bounds.y;
  const textureTransform = [
    `translate(${localCenterX} ${localCenterY})`,
    `rotate(${placement.transform.rotation})`,
    `skewX(${placement.transform.skewX})`,
    `skewY(${placement.transform.skewY})`
  ].join(" ");

  return (
    <defs>
      <pattern
        data-svg-texture-fill="true"
        height="1"
        id={patternId}
        patternContentUnits="userSpaceOnUse"
        patternUnits="objectBoundingBox"
        preserveAspectRatio="none"
        viewBox={`0 0 ${placement.bounds.width} ${placement.bounds.height}`}
        width="1"
      >
        <g data-svg-texture-transform transform={textureTransform}>
          <image
            height={placement.image.height}
            href={source}
            preserveAspectRatio="none"
            width={placement.image.width}
            x={placement.image.x}
            y={placement.image.y}
          />
        </g>
      </pattern>
    </defs>
  );
}
