import type { CSSProperties } from "react";
import {
  getBitmapTextureAdjustments,
  getBitmapTextureRgbChannels,
  getBitmapTextureTransparencyTable,
  type BitmapTextureFill
} from "kizkatt-graphic-engine";

export function getBitmapTextureImageStyle(
  blendMode: "multiply" | "normal"
) {
  return {
    mixBlendMode: blendMode
  } as CSSProperties;
}

export function BitmapTextureFilter({
  id,
  texture
}: {
  id: string;
  texture: BitmapTextureFill;
}) {
  const adjustments = getBitmapTextureAdjustments(texture);
  const brightnessSlope = adjustments.brightness / 100;
  const contrastSlope = adjustments.contrast / 100;
  const contrastIntercept = 0.5 - contrastSlope * 0.5;
  const saturation = adjustments.saturation / 100;
  const adjustedInput = adjustments.blur > 0 ? "blurred" : "saturated";
  const destinationOutSlope = 1 - adjustments.destinationOut * 2;
  const destinationOutIntercept = adjustments.destinationOut;
  const [red, green, blue] = getBitmapTextureRgbChannels(
    texture.transparencyColor
  );

  return (
    <filter
      id={id}
      x="-25%"
      y="-25%"
      width="150%"
      height="150%"
      colorInterpolationFilters="sRGB"
      data-bitmap-texture-filter
      data-brightness={adjustments.brightness}
      data-contrast={adjustments.contrast}
      data-saturation={adjustments.saturation}
      data-edge-match={adjustments.blur}
      data-destination-out={adjustments.destinationOut}
    >
      <feComponentTransfer in="SourceGraphic" result="brightened">
        <feFuncR type="linear" slope={brightnessSlope} />
        <feFuncG type="linear" slope={brightnessSlope} />
        <feFuncB type="linear" slope={brightnessSlope} />
        <feFuncA type="identity" />
      </feComponentTransfer>
      <feComponentTransfer in="brightened" result="contrasted">
        <feFuncR
          type="linear"
          slope={contrastSlope}
          intercept={contrastIntercept}
        />
        <feFuncG
          type="linear"
          slope={contrastSlope}
          intercept={contrastIntercept}
        />
        <feFuncB
          type="linear"
          slope={contrastSlope}
          intercept={contrastIntercept}
        />
        <feFuncA type="identity" />
      </feComponentTransfer>
      <feColorMatrix
        in="contrasted"
        result="saturated"
        type="saturate"
        values={`${saturation}`}
      />
      {adjustments.blur > 0 && (
        <feGaussianBlur
          in="saturated"
          result="blurred"
          stdDeviation={adjustments.blur}
        />
      )}
      {(texture.transparencyEnabled || adjustments.destinationOut > 0) && (
        <>
          {texture.transparencyEnabled ? (
            <>
              <feComponentTransfer in={adjustedInput} result="colorDistance">
                <feFuncR
                  type="table"
                  tableValues={getBitmapTextureTransparencyTable(
                    red,
                    texture.transparencyTolerance
                  )}
                />
                <feFuncG
                  type="table"
                  tableValues={getBitmapTextureTransparencyTable(
                    green,
                    texture.transparencyTolerance
                  )}
                />
                <feFuncB
                  type="table"
                  tableValues={getBitmapTextureTransparencyTable(
                    blue,
                    texture.transparencyTolerance
                  )}
                />
                <feFuncA type="identity" />
              </feComponentTransfer>
              <feColorMatrix
                in="colorDistance"
                result="transparencyMask"
                type="matrix"
                values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .3333 .3333 .3333 0 0"
              />
            </>
          ) : (
            <feColorMatrix
              in={adjustedInput}
              result="transparencyMask"
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"
            />
          )}
          <feComponentTransfer
            in="transparencyMask"
            result="compositeMask"
          >
            <feFuncA
              type="linear"
              slope={destinationOutSlope}
              intercept={destinationOutIntercept}
            />
          </feComponentTransfer>
          <feComposite
            in={adjustedInput}
            in2="compositeMask"
            operator="in"
          />
        </>
      )}
    </filter>
  );
}

export const BitmapTextureTransparencyFilter = BitmapTextureFilter;
