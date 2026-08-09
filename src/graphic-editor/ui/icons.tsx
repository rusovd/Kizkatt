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

export const NodeEditIcon = createIcon(
  <g fill="none" stroke="currentColor" strokeLinejoin="miter" strokeWidth="1.5">
    <path d="M12 14.5 3 20" />
    <path d="m15.5 14.5 5.5 5.5" />
    <path fill="currentColor" stroke="none" d="M12.7 12.7 3 6.2 8.8 1.5z" />
    <path d="M12 13h4v4h-4z" />
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
  <g strokeWidth="1.25">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M21 21l-6 -6" />
    <path d="M3.268 12.043a7.017 7.017 0 0 0 6.634 4.957a7.012 7.012 0 0 0 7.043 -6.131a7 7 0 0 0 -5.314 -7.672a7.021 7.021 0 0 0 -8.241 4.403" />
    <path d="M3 4v4h4" />
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

export const ViewModeIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
    <circle cx="12" cy="12" r="2.5" />
  </g>
);

export const ZenIcon = createIcon(
  <g strokeWidth="1.5">
    <path d="M5 7h14" />
    <path d="M7 12h10" />
    <path d="M9 17h6" />
    <path d="M4 4l16 16" />
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
