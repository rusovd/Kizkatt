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

function TextureImages({
  height,
  normalOpacity,
  multiplyOpacity,
  source,
  width,
  x,
  y
}: {
  height: number;
  normalOpacity: number;
  multiplyOpacity: number;
  source: string;
  width: number;
  x: number;
  y: number;
}) {
  const imageProps = {
    height,
    href: source,
    preserveAspectRatio: "none",
    width,
    x,
    y
  } as const;

  return (
    <>
      {normalOpacity > 0 && (
        <image
          {...imageProps}
          data-texture-blend="normal"
          opacity={normalOpacity}
          style={getBitmapTextureImageStyle("normal")}
        />
      )}
      {multiplyOpacity > 0 && (
        <image
          {...imageProps}
          data-texture-blend="multiply"
          opacity={multiplyOpacity}
          style={getBitmapTextureImageStyle("multiply")}
        />
      )}
    </>
  );
}

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
  const localCenterX =
    placement.transform.centerX - placement.bounds.x;
  const localCenterY =
    placement.transform.centerY - placement.bounds.y;
  const textureTransform = [
    `translate(${localCenterX} ${localCenterY})`,
    `rotate(${placement.transform.rotation})`,
    `skewX(${placement.transform.skewX})`,
    `skewY(${placement.transform.skewY})`,
    `scale(${placement.transform.scaleX} ${placement.transform.scaleY})`
  ].join(" ");
  const textureFilterId = `${patternId}-texture-filter`;
  const normalOpacity = adjustments.opacity;
  const multiplyOpacity = adjustments.opacity * adjustments.multiply;
  const tile =
    texture.tile &&
    (placement.bounds.width > placement.image.width ||
      placement.bounds.height > placement.image.height);
  const patternX = tile
    ? placement.transform.centerX - placement.image.width / 2
    : 0;
  const patternY = tile
    ? placement.transform.centerY - placement.image.height / 2
    : 0;
  const tileTransform = [
    `translate(${placement.transform.centerX} ${placement.transform.centerY})`,
    `rotate(${placement.transform.rotation})`,
    `skewX(${placement.transform.skewX})`,
    `skewY(${placement.transform.skewY})`,
    `scale(${placement.transform.scaleX} ${placement.transform.scaleY})`,
    `translate(${-placement.transform.centerX} ${-placement.transform.centerY})`
  ].join(" ");

  return (
    <defs>
      <BitmapTextureFilter id={textureFilterId} texture={texture} />
      <pattern
        id={patternId}
        x={patternX}
        y={patternY}
        width={tile ? placement.image.width : 1}
        height={tile ? placement.image.height : 1}
        patternUnits={tile ? "userSpaceOnUse" : "objectBoundingBox"}
        patternContentUnits="userSpaceOnUse"
        patternTransform={tile ? tileTransform : undefined}
        viewBox={
          tile
            ? undefined
            : `0 0 ${placement.bounds.width} ${placement.bounds.height}`
        }
        preserveAspectRatio={tile ? undefined : "none"}
        data-bitmap-texture={texture.textureId || "custom"}
        data-bitmap-repeat={tile ? "tile" : "none"}
        data-texture-anchor="center"
        data-texture-coordinate-space={tile ? "canvas" : "object"}
      >
        {tile ? (
          <g
            filter={`url(#${textureFilterId})`}
            data-texture-transform
            data-texture-transform-value={tileTransform}
          >
            <TextureImages
              source={source}
              x={patternX}
              y={patternY}
              width={placement.image.width}
              height={placement.image.height}
              normalOpacity={normalOpacity}
              multiplyOpacity={multiplyOpacity}
            />
          </g>
        ) : (
          <g transform={textureTransform} data-texture-transform>
            <g filter={`url(#${textureFilterId})`}>
              <TextureImages
                source={source}
                x={placement.image.x}
                y={placement.image.y}
                width={placement.image.width}
                height={placement.image.height}
                normalOpacity={normalOpacity}
                multiplyOpacity={multiplyOpacity}
              />
            </g>
          </g>
        )}
      </pattern>
    </defs>
  );
}
