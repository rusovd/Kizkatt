import {
  getBitmapTextureAdjustments,
  getBitmapTexturePlacement,
  type BitmapTextureFill,
  type KizkattElement
} from "kizkatt-graphic-engine";

import {
  BitmapTextureFilter,
  getBitmapTextureImageStyle
} from "./BitmapTextureFilter";

export function BitmapTextureFillPattern({
  element,
  patternId,
  source,
  texture
}: {
  element: KizkattElement;
  patternId: string;
  source: string;
  texture: BitmapTextureFill;
}) {
  const placement = getBitmapTexturePlacement(element, texture);
  const adjustments = getBitmapTextureAdjustments(texture);
  const textureTransform = [
    `translate(${placement.transform.centerX} ${placement.transform.centerY})`,
    `rotate(${placement.transform.rotation})`,
    `skewX(${placement.transform.skewX})`,
    `scale(${placement.transform.scaleX} ${placement.transform.scaleY})`
  ].join(" ");
  const imageStyle = getBitmapTextureImageStyle(texture);
  const textureFilterId = `${patternId}-texture-filter`;

  return (
    <defs>
      <BitmapTextureFilter id={textureFilterId} texture={texture} />
      <pattern
        id={patternId}
        x={placement.bounds.x}
        y={placement.bounds.y}
        width={placement.bounds.width}
        height={placement.bounds.height}
        patternUnits="userSpaceOnUse"
        patternContentUnits="userSpaceOnUse"
        data-bitmap-texture={texture.textureId || "custom"}
        data-bitmap-repeat="none"
        data-texture-anchor="center"
      >
        <g transform={textureTransform} data-texture-transform>
          <g filter={`url(#${textureFilterId})`}>
            <image
              href={source}
              x={placement.image.x}
              y={placement.image.y}
              width={placement.image.width}
              height={placement.image.height}
              opacity={adjustments.opacity}
              preserveAspectRatio="none"
              style={imageStyle}
            />
          </g>
        </g>
      </pattern>
    </defs>
  );
}
