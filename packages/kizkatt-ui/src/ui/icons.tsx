import type { ReactNode } from "react";

type IconOptions = {
  fill?: string;
  height?: number;
  viewBox?: string;
  width?: number;
};

function createIcon(
  children: ReactNode,
  { fill = "none", height = 24, viewBox, width = 24 }: IconOptions = {}
) {
  return (
    <svg
      aria-hidden="true"
      className="kizkatt-tool-icon"
      fill={fill}
      height={height}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox={viewBox ?? `0 0 ${width} ${height}`}
      width={width}
    >
      {children}
    </svg>
  );
}

export const SelectionIcon = createIcon(
  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 6l4.153 11.793a0.365 .365 0 0 0 .331 .207a0.366 .366 0 0 0 .332 -.207l2.184 -4.793l4.787 -1.994a0.355 .355 0 0 0 .213 -.323a0.355 .355 0 0 0 -.213 -.323l-11.787 -4.36z" />
    <path d="M13.5 13.5l4.5 4.5" />
  </g>,
  { height: 22, width: 22 }
);

export const RectangleIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </g>
);

export const DiamondIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.5 20.4l-6.9 -6.9c-.781 -.781 -.781 -2.219 0 -3l6.9 -6.9c.781 -.781 2.219 -.781 3 0l6.9 6.9c.781 .781 .781 2.219 0 3l-6.9 6.9c-.781 .781 -2.219 .781 -3 0z" />
  </g>
);

export const EllipseIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9" />
  </g>
);

export const ArrowIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="5" y1="12" x2="19" y2="12" />
    <line x1="15" y1="16" x2="19" y2="12" />
    <line x1="15" y1="8" x2="19" y2="12" />
  </g>
);

export const LineIcon = createIcon(
  <path d="M4.167 10h11.666" strokeWidth="1.5" />,
  { height: 20, width: 20 }
);

export const FreedrawIcon = createIcon(
  <g strokeWidth="1.25">
    <path
      clipRule="evenodd"
      d="m7.643 15.69 7.774-7.773a2.357 2.357 0 1 0-3.334-3.334L4.31 12.357a3.333 3.333 0 0 0-.977 2.357v1.953h1.953c.884 0 1.732-.352 2.357-.977Z"
    />
    <path d="m11.25 5.417 3.333 3.333" />
  </g>,
  { height: 20, width: 20 }
);

export const TextIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="4" y1="20" x2="7" y2="20" />
    <line x1="14" y1="20" x2="21" y2="20" />
    <line x1="6.9" y1="15" x2="13.8" y2="15" />
    <line x1="10.2" y1="6.3" x2="16" y2="20" />
    <polyline points="5 20 11 4 13 4 20 20" />
  </g>
);

export const ArcArrowsIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M7 14c2.8-3 7.2-3 10 0" />
    <polyline points="8.8 12.8 7 14 8.8 15.2" />
    <polyline points="15.2 12.8 17 14 15.2 15.2" />
  </g>
);


export const CurvedArrowIcon = createIcon(
  <path
    fill="currentColor"
    d="M4 20c1.5-7.3 5.8-12.1 12-13.4V2l5 5-5 5V8.7C10.9 10 7.5 14.1 6.2 20.5z"
  />
);

export const CurvedDownArrowIcon = createIcon(
  <path
    fill="currentColor"
    d="M3 4h6l-1.8 1.8A10 10 0 0 1 18 15.7V13l3 4-3 4v-2.8A7.5 7.5 0 0 0 9.3 8.3L11 10H8z"
  />
);

export const ShovelIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M14.5 8.5l1-1" />
    <path d="M9.2 15.8l6.3-6.3" />
    <path d="M8.3 14.9l-1.1-1.1-2.1 2.1a6.8 6.8 0 0 0-1.6 6.1 6.8 6.8 0 0 0 6.1-1.6l2.1-2.1-1.1-1.1" />
    <path d="M15.5 3.2l5.3 5.3-2.1 2.1a3.2 3.2 0 0 1-4.5 0l-.8-.8a3.2 3.2 0 0 1 0-4.5z" />
    <path d="M15.8 5.3l2.9 2.9-.8.8a.9.9 0 0 1-1.3 0l-1.6-1.6a.9.9 0 0 1 0-1.3z" />
    <path d="M5.2 18.1a4.8 4.8 0 0 0-.1 2" />
  </g>
);

export const OpacityIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="8.5" cy="8.5" r="6" />
    <circle cx="15.5" cy="15.5" r="6" />
    <path d="M10.2 8.9l4.9 4.9" />
    <path d="M8.9 10.2l4.9 4.9" />
    <path d="M8.3 12.3l3.4 3.4" />
    <path d="M12.3 8.3l3.4 3.4" />
  </g>,
);

export const PolylineIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M2.5 16.5l7 1.8 1.2-5.4 5.2 2.6-3.2-7.1 3.3 3.2 4.9-6.1" />
    <circle cx="2.5" cy="16.5" r=".9" fill="currentColor" />
    <circle cx="9.5" cy="18.3" r=".9" fill="currentColor" />
    <circle cx="10.7" cy="12.9" r=".9" fill="currentColor" />
    <circle cx="15.9" cy="15.5" r=".9" fill="currentColor" />
    <circle cx="12.7" cy="8.4" r=".9" fill="currentColor" />
    <circle cx="16" cy="11.6" r=".9" fill="currentColor" />
    <circle cx="20.9" cy="5.5" r=".9" fill="currentColor" />
  </g>,
);

export const TextureIcon = createIcon(
  <g>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path fill="currentColor" d="M4 4h3.1l.8 1.1-.7 1.4-2.9.2-.8-1.2z" />
    <path fill="currentColor" d="M8.5 4h2.2l1 .8-.5 1.3-2.3.4-1-.9z" />
    <path fill="currentColor" d="M12.5 4h3.7l1.1.8-.4 2-3.8.2-1.2-1.4z" />
    <path fill="currentColor" d="M18 4h2l.7.9-.3 2.3-2.7-.1-.5-1.4z" />
    <path fill="currentColor" d="M4 7.6h3.4l1.2 1.2-.5 2-3.6.2-1.1-1.3z" />
    <path fill="currentColor" d="M9.1 7.3h2.8l1.2 1-.7 2.2-2.9.4-1.1-1.5z" />
    <path fill="currentColor" d="M13.4 7.8h2.4l1.3 1.1-.5 1.7-2.7.4-1.1-1.2z" />
    <path fill="currentColor" d="M17.6 8h2.6l.8 1-.5 2.3-3-.4-.7-1.5z" />
    <path fill="currentColor" d="M4 11.8h2.5l1 1.1-.5 2.3-2.5.3-.9-1.5z" />
    <path fill="currentColor" d="M8.1 11.8h3.6l1.1 1.3-.8 2.6-3.2.2-1.4-1.6z" />
    <path fill="currentColor" d="M13.2 11.9h3.4l1.2 1.2-.7 2.4-3.3.5-1.3-1.6z" />
    <path fill="currentColor" d="M18 12.1h2.2l.9 1-.4 2.2-2.7.3-.7-1.6z" />
    <path fill="currentColor" d="M4 16.4h3l1.1 1.1-.4 2.5H4.6l-1-1.2z" />
    <path fill="currentColor" d="M8.6 16.8h3l1 1.2-.5 2H8.8l-.8-1.1z" />
    <path fill="currentColor" d="M13 16.8h3.5l1 1.2-.6 2h-3.5l-1-1.3z" />
    <path fill="currentColor" d="M18 16.6h2.2l.8 1.2-.5 2.2h-2.7l-.6-1.3z" />
  </g>,
);

export const TileIcon = createIcon(
  <g strokeWidth="1.35">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
  </g>
);

export const SvgFillIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6.5 4h-1a2.5 2.5 0 0 0-2.5 2.5v3a1.5 1.5 0 0 1-1.5 1.5 1.5 1.5 0 0 1 1.5 1.5v5a2.5 2.5 0 0 0 2.5 2.5h1" />
    <path d="M17.5 4h1a2.5 2.5 0 0 1 2.5 2.5v3a1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0-1.5 1.5v5a2.5 2.5 0 0 1-2.5 2.5h-1" />
    <path d="M6.5 7h2.5" />
    <path d="M11 7h6.5" />
    <path d="M6.5 11h6.5" />
    <path d="M14.5 11h3" />
    <path d="M6.5 15h2.5" />
    <path d="M11 15h6.5" />
    <path d="M6.5 19h6.5" />
    <path d="M15 19h2.5" />
  </g>,
);

export const GradientIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="3" y="6" width="18" height="12" rx=".5" />
    <path d="M5.5 7.5v9" />
    <path d="M7.5 7.5v9" />
    <path d="M10 7.5v9" strokeWidth="2" />
    <path d="M13.5 7.5v9" strokeWidth="3" />
    <path d="M18 7.5v9" strokeWidth="4" />
  </g>,
);

export const LinearGradientIcon = createIcon(
  <g strokeWidth="1.4">
    <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
    <path d="M6 16.5 18 7.5" />
    <circle cx="6" cy="16.5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="18" cy="7.5" r="1.6" fill="currentColor" stroke="none" />
  </g>
);

export const RadialGradientIcon = createIcon(
  <g strokeWidth="1.4">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="5.25" />
    <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
  </g>
);

export const ConicGradientIcon = createIcon(
  <g strokeWidth="1.4">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 12V3.5M12 12l7.35 4.25M12 12l-7.35 4.25" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </g>
);

export const DiamondGradientIcon = createIcon(
  <g strokeWidth="1.4">
    <path d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12Z" />
    <path d="m12 7.5 4.5 4.5-4.5 4.5L7.5 12Z" />
    <circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" />
  </g>
);

export const GradientPadIcon = createIcon(
  <g strokeWidth="1.4">
    <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    <path d="M7 8.5v7M10 8.5v7M14 8.5v7M18 8.5v7" />
  </g>
);

export const GradientReflectIcon = createIcon(
  <g strokeWidth="1.4">
    <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    <path d="M12 7.5v9M8.5 9v6M15.5 9v6M5.5 11v2M18.5 11v2" />
  </g>
);

export const GradientRepeatIcon = createIcon(
  <g strokeWidth="1.4">
    <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
    <path d="M7.5 7.5v9M12 7.5v9M16.5 7.5v9" />
    <path d="m5.5 12 2-2 2 2M10 12l2-2 2 2M14.5 12l2-2 2 2" />
  </g>
);

export const DefaultGradientIcon = createIcon(
  <path
    d="M19.5 18.5V7.3a1.5 1.5 0 0 0-.4-1L15.7 3a1.5 1.5 0 0 0-1-.4H5.5A1.5 1.5 0 0 0 4 4.1v16.4A1.5 1.5 0 0 0 5.5 22h15a1.5 1.5 0 0 0 1.5-1.5v-7"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
  />
);

export const SaveIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M5 3.5h11l3 3v14H5Z" />
    <path d="M8 3.5v6h8v-6M8 20.5v-7h8v7" />
  </g>
);

export const AddGradientStopIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M8 5h12l-6 11Z" />
    <path d="M14 2v3" />
    <path d="M3 18h6M6 15v6" />
  </g>
);

export const MonochromeTextureIcon = createIcon(
  <g>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />

    <path
      fill="currentColor"
      opacity=".35"
      d="M4.5 2.5h3v15h-3a2.5 2.5 0 1 0 0 5h15.5V5.5H7.5v-3z"
    />

    <path
      fill="currentColor"
      d="M8.5 8h2.8v1.4H8.5z"
    />
    <path
      fill="currentColor"
      d="M12.7 8h2.8v1.4h-2.8z"
    />
    <path
      fill="currentColor"
      d="M16.9 8h2.8v1.4h-2.8z"
    />

    <circle
      cx="12"
      cy="15"
      r="4"
      fill="currentColor"
      opacity=".12"
    />

    <circle
      cx="16.2"
      cy="15"
      r="4"
      fill="currentColor"
      opacity=".65"
    />
  </g>,
);

export const ShapeIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6.1 5.2c1.5-1.7 3.1-2.5 5-2.1 1.3.3 2.1 1.3 3.2 1.8 1.4.6 3 .3 4.2 1.2 1.4 1 1.7 2.5 1.3 4-.3 1.2-1.3 2.1-1.2 3.4.1 1.4 1 2.6.5 4.1-.5 1.7-2 2.4-3.6 2.2-1.3-.2-2.4-.9-3.8-.6-1.6.3-2.7 1.3-4.4.9-1.7-.4-2.5-1.8-2.4-3.4.1-1.4.8-2.5.4-3.9-.4-1.3-1.5-2.2-1.3-3.8.1-1.6 1-2.8 2.1-3.8z" />
  </g>,
);

export const NodeEditIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinejoin="miter" strokeWidth="1.5">
    <path d="M12 14.5 3 20" />
    <path d="m15.5 14.5 5.5 5.5" />
    <path fill="currentColor" stroke="none" d="M12.7 12.7 3 6.2 8.8 1.5z" />
    <path d="M12 13h4v4h-4z" />
  </g>
);

export const TargetPointIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </g>
);

export const ImageIcon = createIcon(
  <g strokeWidth="1.25">
    <path d="M12.5 6.667h.01" />
    <path d="M4.91 2.625h10.18a2.284 2.284 0 0 1 2.285 2.284v10.182a2.284 2.284 0 0 1-2.284 2.284H4.909a2.284 2.284 0 0 1-2.284-2.284V4.909a2.284 2.284 0 0 1 2.284-2.284Z" />
    <path d="m3.333 12.5 3.334-3.333c.773-.745 1.726-.745 2.5 0l4.166 4.166" />
    <path d="m11.667 11.667.833-.834c.774-.744 1.726-.744 2.5 0l1.667 1.667" />
  </g>,
  { height: 20, width: 20 }
);

export const UploadIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
  </g>
);

export const EraserIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3" />
    <path d="M18 13.3l-6.3 -6.3" />
  </g>
);

export const EyedropperIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="m14.5 4.5 5 5" />
    <path d="M17 2a2.12 2.12 0 0 1 3 3l-9.5 9.5 -4 1 1 -4L17 2Z" />
    <path d="M6 18h7" />
  </g>
);

export const PaletteIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M12 3.5a8.5 8.5 0 0 0 0 17h1.5a1.8 1.8 0 0 0 .96 -3.32a1.3 1.3 0 0 1 .68 -2.4H16a4.5 4.5 0 0 0 4.5 -4.5C20.5 6.54 16.9 3.5 12 3.5Z" />
    <circle cx="8.2" cy="9" r=".75" fill="currentColor" stroke="none" />
    <circle cx="11.4" cy="7.2" r=".75" fill="currentColor" stroke="none" />
    <circle cx="14.8" cy="9" r=".75" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="12.6" r=".75" fill="currentColor" stroke="none" />
  </g>
);

export const ClosedPathIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M7 7h7l3 5 -3 5H7l-3 -5z" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14" cy="7" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="17" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14" cy="17" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7" cy="17" r="1.2" fill="currentColor" stroke="none" />
  </g>
);

export const StrokeStyleSolidIcon = createIcon(
  <path
    d="M6 10H34"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
  />,
  { height: 20, width: 40 }
);

export const StrokeStyleDashedIcon = createIcon(
  <g strokeWidth="2">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M5 12h2" />
    <path d="M17 12h2" />
    <path d="M11 12h2" />
  </g>
);

export const StrokeStyleDottedIcon = createIcon(
  <g strokeWidth="2">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 12v.01" />
    <path d="M8 12v.01" />
    <path d="M12 12v.01" />
    <path d="M16 12v.01" />
    <path d="M20 12v.01" />
  </g>
);

export const StrokeStyleDashDotIcon = createIcon(
  <g strokeWidth="2">
    <path d="M3 12h5" />
    <path d="M11.5 12v.01" />
    <path d="M15 12h6" />
  </g>
);

export const StrokeStyleStitchedIcon = createIcon(
  <g strokeWidth="2">
    <path d="m3 14 2-4" />
    <path d="m8.5 14 2-4" />
    <path d="m14 14 2-4" />
    <path d="m19.5 14 1.5-3" />
  </g>
);

export const StrokeStyleWavyIcon = createIcon(
  <path
    d="M3 12c2.25-5 4.5-5 6.75 0s4.5 5 6.75 0 4.5-5 6.75 0"
    strokeWidth="2"
  />
);

export const StrokeStyleZigzagIcon = createIcon(
  <path d="M3 15 7.5 9l4.5 6 4.5-6 4.5 6" strokeWidth="2" />
);

export const EdgeSharpIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 12V8c0-.748.001-2.08.002-3.996C5.943 4.001 7.276 4 8 4h4" />
    <path d="M16 4v.01" />
    <path d="M20 4v.01" />
    <path d="M20 8v.01" />
    <path d="M20 12v.01" />
    <path d="M4 16v.01" />
    <path d="M20 16v.01" />
    <path d="M4 20v.01" />
    <path d="M8 20v.01" />
    <path d="M12 20v.01" />
    <path d="M16 20v.01" />
    <path d="M20 20v.01" />
  </g>
);

export const EdgeRoundIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 12v-4a4 4 0 0 1 4 -4h4" />
    <line x1="16" y1="4" x2="16" y2="4.01" />
    <line x1="20" y1="4" x2="20" y2="4.01" />
    <line x1="20" y1="8" x2="20" y2="8.01" />
    <line x1="20" y1="12" x2="20" y2="12.01" />
    <line x1="4" y1="16" x2="4" y2="16.01" />
    <line x1="20" y1="16" x2="20" y2="16.01" />
    <line x1="4" y1="20" x2="4" y2="20.01" />
    <line x1="8" y1="20" x2="8" y2="20.01" />
    <line x1="12" y1="20" x2="12" y2="20.01" />
    <line x1="16" y1="20" x2="16" y2="20.01" />
    <line x1="20" y1="20" x2="20" y2="20.01" />
  </g>
);

export const FillHachureIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M7 19 19 7" />
    <path d="M5 13 13 5" />
    <path d="M11 21 21 11" />
  </g>
);

export const FillCrossHatchIcon = createIcon(
  <g strokeWidth="1.4">
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M7 19 19 7" />
    <path d="M5 13 13 5" />
    <path d="M11 21 21 11" />
    <path d="M5 11 13 19" />
    <path d="M11 5 19 13" />
  </g>
);

export const FillSolidIcon = createIcon(
  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />,
  { fill: "currentColor" }
);

export const SloppinessArchitectIcon = createIcon(
  <path d="M4 14c4 -1 7 -3 12 -4" strokeWidth="1.5" />
);

export const SloppinessArtistIcon = createIcon(
  <path d="M4 14c3.5 -2.5 7.5 1 12 -4" strokeWidth="1.8" />
);

export const SloppinessCartoonistIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 14c3 -2.5 6.5 1.5 12 -4" />
    <path d="M6 16c3 -2 6 1 12 -4" />
  </g>
);

export const SloppinessDoubleIcon = createIcon(
  <g strokeWidth="1.4">
    <path d="M4 10h16" />
    <path d="M4 15h16" />
  </g>
);

export const DuplicateIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <rect x="4" y="4" width="11" height="11" rx="2" />
  </g>
);

export const TrashIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 13h10l1 -13" />
    <path d="M9 7V4h6v3" />
  </g>
);

export const LinkIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M9 7h-2a5 5 0 0 0 0 10h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <path d="M8 12h8" />
  </g>
);

export const AspectLockIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="6" y="10" width="12" height="10" rx="2" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
  </g>
);

export const AspectUnlockIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="6" y="10" width="12" height="10" rx="2" />
    <path d="M8.5 10V7.5a3.5 3.5 0 0 1 6.1 -2.3" />
  </g>
);

export const GlobeIcon = createIcon(
  <g strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="4.5" ry="9" />
    <path d="M3 12h18" />
    <path d="M4.5 7.5h15" />
    <path d="M4.5 16.5h15" />
  </g>
);

export const MirrorHorizontalIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M12 4v16" strokeDasharray="3 3" />
    <path d="M4 7h5v10H4z" />
    <path d="M20 7h-5v10h5z" />
  </g>
);

export const MirrorVerticalIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 12h16" strokeDasharray="3 3" />
    <path d="M7 4v5h10V4z" />
    <path d="M7 20v-5h10v5z" />
  </g>
);

export const DimensionWidthIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M5 12h14" />
    <path d="m8 9-3 3 3 3" />
    <path d="m16 9 3 3-3 3" />
  </g>
);

export const DimensionHeightIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M12 5v14" />
    <path d="m9 8 3-3 3 3" />
    <path d="m9 16 3 3 3-3" />
  </g>
);

export const RotationAngleIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 16a8 8 0 0 1 8-8h3" />
    <path d="m14 5 3 3-3 3" />
    <path d="M6 16h6" />
  </g>
);

export const StrokeWidthIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M5 7h14" />
    <path d="M5 12h14" strokeWidth="2" />
    <path d="M5 17h14" strokeWidth="3" />
  </g>
);

export const PenNibIcon = createIcon(
 <g fill="currentColor">
    <path d="M11.7 3h.6c.2 2.5 1.7 5.5 4.7 8.5l-1.8 2.8a18 18 0 0 0-1.4 3.7h-3.6a18 18 0 0 0-1.4-3.7L7 11.5c3-3 4.5-6 4.7-8.5Zm.3 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    <path d="M10.2 18.5h3.6v1h-3.6zM10.2 20h3.6v1h-3.6zM10.2 21.5h3.6v1h-3.6z" />
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.2"
      d="M12 1.5C5.8 4.5 3.2 12.4 5.4 22"
    />
  </g>
);

export const SendToBackIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 5h12" />
    <path d="M6 19h12" />
    <path d="M12 8v8" />
    <path d="m8.5 12.5 3.5 3.5 3.5 -3.5" />
  </g>
);

export const SendBackwardIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 18h12" />
    <path d="M12 5v9" />
    <path d="m8.5 10.5 3.5 3.5 3.5 -3.5" />
  </g>
);

export const BringForwardIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 6h12" />
    <path d="M12 19v-9" />
    <path d="m8.5 13.5 3.5 -3.5 3.5 3.5" />
  </g>
);

export const BringToFrontIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 5h12" />
    <path d="M6 19h12" />
    <path d="M12 16V8" />
    <path d="m8.5 11.5 3.5 -3.5 3.5 3.5" />
  </g>
);

export const HamburgerMenuIcon = createIcon(
  <g strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </g>
);

export const OpenIcon = createIcon(
  <g strokeWidth="1.25">
    <path d="M3.333 15.833V5.833c0-.92.747-1.666 1.667-1.666h3.333l1.667 2.5h5c.92 0 1.667.746 1.667 1.666v7.5c0 .92-.747 1.667-1.667 1.667H5c-.92 0-1.667-.746-1.667-1.667Z" />
    <path d="M3.333 8.333h13.334" />
  </g>,
  { height: 20, width: 20 }
);

export const ExportIcon = createIcon(
  <path
    strokeWidth="1.25"
    d="M3.333 14.167v1.666c0 .92.747 1.667 1.667 1.667h10c.92 0 1.667-.746 1.667-1.667v-1.666M5.833 9.167 10 13.333l4.167-4.166M10 3.333v10"
  />,
  { height: 20, width: 20 }
);

export const ResetIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3.5 11a8.5 8.5 0 0 1 14.4-5.7L20 7.5" />
    <path d="M20 3.8v3.7h-3.7" />
    <path d="M20.5 13a8.5 8.5 0 0 1-14.4 5.7L4 16.5" />
    <path d="M4 20.2v-3.7h3.7" />
  </g>,
);

export const RefreshPageIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M20 6v5h-5" />
    <path d="M4 18v-5h5" />
    <path d="M18.3 10A6.6 6.6 0 0 0 6.8 6.1L4 8.8" />
    <path d="M5.7 14A6.6 6.6 0 0 0 17.2 17.9L20 15.2" />
  </g>
);

export const UpdateObjectBaseIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <path d="M12 16V8" />
    <path d="M8.8 11.2L12 8l3.2 3.2" />
  </g>
);

export const RevertObjectBaseIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M5 11a7 7 0 0 1 11.2-5.6" />
    <path d="M16.2 2.8v2.6h-2.6" />
  </g>
);

export const PasteIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M9 4.5h6a2 2 0 0 1 2 2v13H7v-13a2 2 0 0 1 2-2Z" />
    <path d="M9.5 4.5a2.5 2.5 0 0 1 5 0" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
  </g>
);

export const CopyIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  </g>
);

export const CodeIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="m9 8-4 4 4 4" />
    <path d="m15 8 4 4-4 4" />
    <path d="m13 5-2 14" />
  </g>
);

export const SelectAllIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M5 5h3" />
    <path d="M16 5h3" />
    <path d="M5 19h3" />
    <path d="M16 19h3" />
    <path d="M5 5v3" />
    <path d="M19 5v3" />
    <path d="M5 16v3" />
    <path d="M19 16v3" />
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
  </g>
);

export const SelectionContainIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" />
    <rect x="8" y="8" width="8" height="8" rx="1.5" />
  </g>
);

export const GridIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 8h16" />
    <path d="M4 16h16" />
    <path d="M8 4v16" />
    <path d="M16 4v16" />
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </g>
);

export const SnapIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <path d="M6 10h4" />
    <path d="M14 10h4" />
    <path d="M6 4h4" />
    <path d="M14 4h4" />
    <path d="M9 19h6" />
  </g>
);

export const WireframeIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 6.5 12 3l8 3.5v11L12 21l-8-3.5Z" />
    <path d="m4 6.5 8 4 8-4M12 10.5V21M4 17.5l8-7 8 7.1" />
    <circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none" />
  </g>
);

export const InfoIcon = createIcon(
  <g strokeWidth="1.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10.5v6" />
    <path d="M12 7.5v.01" strokeWidth="2.2" />
  </g>
);

export const GroupIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
    <path d="M11 7.5h2" />
    <path d="M16.5 11v2" />
  </g>
);

export const UngroupIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
    <path d="M11.5 11.5l-2.5 2.5" />
    <path d="M15 9l-2.5 2.5" />
  </g>
);

export const ChevronRightIcon = createIcon(
  <path d="m9 6 6 6-6 6" strokeWidth="1.8" />,
  { height: 20, width: 20 }
);

export const ChevronDownIcon = createIcon(
  <path d="m6 9 6 6 6-6" strokeWidth="1.8" />,
  { height: 20, width: 20 }
);

export const CheckIcon = createIcon(
  <path d="m5 12 4.2 4.2L19 6.5" strokeWidth="2" />,
  { height: 20, width: 20 }
);

export const DiameterIcon = createIcon(
  <g strokeWidth="1.7">
    <circle cx="12" cy="12" r="5.5" />
    <path d="M7 17 17 7" />
  </g>,
  { height: 20, width: 20 }
);

export const SettingsIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M9.8 4.2 10.4 2h3.2l.6 2.2 1.5.6 2-1.1 2.3 2.3-1.1 2 .6 1.5 2.2.6v3.2l-2.2.6-.6 1.5 1.1 2-2.3 2.3-2-1.1-1.5.6-.6 2.2h-3.2l-.6-2.2-1.5-.6-2 1.1-2.3-2.3 1.1-2-.6-1.5-2.2-.6v-3.2l2.2-.6.6-1.5-1.1-2 2.3-2.3 2 1.1 1.5-.6Z" />
    <circle cx="12" cy="12" r="2.8" />
  </g>
);

export const PinIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M9 4h6" />
    <path d="M10 4v5l-3 3v2h10v-2l-3-3V4" />
    <path d="M12 14v6" />
  </g>
);

export const CloseIcon = createIcon(
  <g strokeWidth="1.8">
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </g>
);

export const EyeIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </g>
);

export const LayoutHorizontalIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="3.5" y="8" width="17" height="8" rx="2" />
    <path d="M8 8v8" />
    <path d="M16 8v8" />
  </g>
);

export const LayoutVerticalIcon = createIcon(
  <g strokeWidth="1.5">
    <rect x="8" y="3.5" width="8" height="17" rx="2" />
    <path d="M8 8h8" />
    <path d="M8 16h8" />
  </g>
);

export const LanguageIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M4 5h8" />
    <path d="M8 3v2" />
    <path d="M5 9c2.5 0 5-1.5 6-4" />
    <path d="M6.5 7.5 11 12" />
    <path d="M13 20l4-10 4 10" />
    <path d="M14.3 17h5.4" />
  </g>
);

export const MoonIcon = createIcon(
  <path
    clipRule="evenodd"
    d="M10 2.5h.328a6.25 6.25 0 0 0 6.6 10.372A7.5 7.5 0 1 1 10 2.493V2.5Z"
    stroke="currentColor"
  />,
  { height: 20, width: 20 }
);

export const SunIcon = createIcon(
  <g stroke="currentColor" strokeLinejoin="round">
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM10 4.167V2.5M14.167 5.833l1.166-1.166M15.833 10H17.5M14.167 14.167l1.166 1.166M10 15.833V17.5M5.833 14.167l-1.166 1.166M5 10H3.333M5.833 5.833 4.667 4.667" />
  </g>,
  { height: 20, width: 20 }
);

export const UndoIcon = createIcon(
  <path
    d="M7.5 10.833 4.167 7.5 7.5 4.167M4.167 7.5h9.166a3.333 3.333 0 0 1 0 6.667H12.5"
    strokeWidth="1.25"
  />,
  { height: 20, width: 20 }
);

export const RedoIcon = createIcon(
  <path
    d="M12.5 10.833 15.833 7.5 12.5 4.167M15.833 7.5H6.667a3.333 3.333 0 1 0 0 6.667H7.5"
    strokeWidth="1.25"
  />,
  { height: 20, width: 20 }
);

export const handIcon = createIcon(
  <g strokeWidth={1.25}>
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5" />
    <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5" />
    <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5" />
    <path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47" />
  </g>
);
