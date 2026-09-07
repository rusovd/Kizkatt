import {
  getGradientColorAtPosition,
  getRenderedGradientStops,
  normalizeGradientFill,
  type GradientFill
} from "kizkatt-graphic-engine";

const CONIC_SEGMENTS = 96;
const DIAMOND_SEGMENTS = 64;

function GradientStops({ gradient }: { gradient: GradientFill }) {
  return getRenderedGradientStops(gradient).map((stop) => (
    <stop
      key={stop.id}
      offset={`${stop.position}%`}
      stopColor={stop.color}
      stopOpacity={stop.opacity / 100}
    />
  ));
}

function getTransform(gradient: GradientFill, coordinateScale = 1) {
  const centerX = (gradient.centerX / 100) * coordinateScale;
  const centerY = (gradient.centerY / 100) * coordinateScale;
  return [
    `translate(${centerX} ${centerY})`,
    `rotate(${gradient.rotation})`,
    `skewX(${gradient.skew})`,
    `scale(${gradient.scaleX / 100} ${gradient.scaleY / 100})`,
    `translate(${-centerX} ${-centerY})`
  ].join(" ");
}

function ConicPattern({ gradient, id }: { gradient: GradientFill; id: string }) {
  const centerX = gradient.centerX;
  const centerY = gradient.centerY;
  const radius = 160;

  return (
    <pattern id={id} width="1" height="1" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g transform={getTransform(gradient, 100)}>
        {Array.from({ length: CONIC_SEGMENTS }, (_, index) => {
          const start = (index / CONIC_SEGMENTS) * Math.PI * 2 - Math.PI / 2;
          const end = ((index + 1.01) / CONIC_SEGMENTS) * Math.PI * 2 - Math.PI / 2;
          const sample = getGradientColorAtPosition(
            gradient.stops,
            (index + 0.5) / CONIC_SEGMENTS,
            gradient.acceleration
          );
          const x1 = centerX + Math.cos(start) * radius;
          const y1 = centerY + Math.sin(start) * radius;
          const x2 = centerX + Math.cos(end) * radius;
          const y2 = centerY + Math.sin(end) * radius;

          return (
            <path
              key={index}
              d={`M ${centerX} ${centerY} L ${x1} ${y1} L ${x2} ${y2} Z`}
              fill={sample.color}
              fillOpacity={sample.opacity / 100}
            />
          );
        })}
      </g>
    </pattern>
  );
}

function DiamondPattern({ gradient, id }: { gradient: GradientFill; id: string }) {
  const centerX = gradient.centerX;
  const centerY = gradient.centerY;

  return (
    <pattern id={id} width="1" height="1" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g transform={getTransform(gradient, 100)}>
        {Array.from({ length: DIAMOND_SEGMENTS }, (_, index) => {
          const progress = 1 - index / (DIAMOND_SEGMENTS - 1);
          const sample = getGradientColorAtPosition(
            gradient.stops,
            progress,
            gradient.acceleration
          );
          const radius = progress * 100;
          return (
            <path
              key={index}
              d={`M ${centerX} ${centerY - radius} L ${centerX + radius} ${centerY} L ${centerX} ${centerY + radius} L ${centerX - radius} ${centerY} Z`}
              fill={sample.color}
              fillOpacity={sample.opacity / 100}
            />
          );
        })}
      </g>
    </pattern>
  );
}

export function GradientFillDefinition({
  gradient: value,
  id
}: {
  gradient: GradientFill;
  id: string;
}) {
  const gradient = normalizeGradientFill(value);

  if (gradient.type === "conic") {
    return <defs><ConicPattern gradient={gradient} id={id} /></defs>;
  }

  if (gradient.type === "diamond") {
    return <defs><DiamondPattern gradient={gradient} id={id} /></defs>;
  }

  if (gradient.type === "radial") {
    return (
      <defs>
        <radialGradient
          id={id}
          cx={`${gradient.centerX}%`}
          cy={`${gradient.centerY}%`}
          r="50%"
          gradientTransform={getTransform(gradient)}
          spreadMethod={gradient.spread}
        >
          <GradientStops gradient={gradient} />
        </radialGradient>
      </defs>
    );
  }

  return (
    <defs>
      <linearGradient
        id={id}
        x1={`${gradient.centerX - 50}%`}
        x2={`${gradient.centerX + 50}%`}
        y1={`${gradient.centerY}%`}
        y2={`${gradient.centerY}%`}
        gradientTransform={getTransform(gradient)}
        spreadMethod={gradient.spread}
      >
        <GradientStops gradient={gradient} />
      </linearGradient>
    </defs>
  );
}
