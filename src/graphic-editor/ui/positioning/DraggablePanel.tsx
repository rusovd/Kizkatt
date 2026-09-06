import type {
  CSSProperties,
  MouseEvent,
  PointerEvent,
  ReactNode
} from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "../../i18n";
import { CloseIcon, PinIcon } from "../icons";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import { PanelDragHandle } from "./PanelDragHandle";

export type PanelOrientation = "horizontal" | "vertical";

type PanelPosition = {
  x: number;
  y: number;
};

type PanelSize = {
  height: number;
  width: number;
};

type PanelResizeAxis = "both" | "horizontal" | "vertical";

export type DraggablePanelRenderState = {
  actions: ReactNode;
  chrome: ReactNode;
  labelsHidden: boolean;
  orientation: PanelOrientation;
  pinned: boolean;
};

const STORAGE_PREFIX = "kizkatt:graphic-editor:panel";
const TOP_DOCK_Y = 16;
const TOP_DOCK_THRESHOLD = 28;
const DRAG_CLICK_THRESHOLD = 4;
const MIN_RESIZABLE_PANEL_WIDTH = 160;
const MIN_RESIZABLE_PANEL_HEIGHT = 80;
const PANEL_DRAG_HANDLE_SELECTOR = "[data-panel-drag-handle]";
const PANEL_TITLE_DRAG_HANDLE_SELECTOR = "[data-panel-title-drag-handle]";
const PANEL_RESIZE_HANDLE_SELECTOR = "[data-panel-resize-handle]";

function getStorageKey(id: string) {
  return `${STORAGE_PREFIX}:${id}`;
}

function getOrientationStorageKey(id: string) {
  return `${getStorageKey(id)}:orientation`;
}

function getSizeStorageKey(id: string, orientation: PanelOrientation) {
  return `${getStorageKey(id)}:size:${orientation}`;
}

function readStoredPosition(id: string): PanelPosition | null {
  const rawPosition = window.localStorage.getItem(getStorageKey(id));

  if (!rawPosition) {
    return null;
  }

  try {
    const value = JSON.parse(rawPosition) as Partial<PanelPosition>;

    return typeof value.x === "number" && typeof value.y === "number"
      ? { x: value.x, y: value.y }
      : null;
  } catch {
    return null;
  }
}

function readStoredOrientation(
  id: string,
  defaultOrientation: PanelOrientation
): PanelOrientation {
  const orientation = window.localStorage.getItem(getOrientationStorageKey(id));

  return orientation === "horizontal" || orientation === "vertical"
    ? orientation
    : defaultOrientation;
}

function readStoredSize(
  id: string,
  orientation: PanelOrientation
): PanelSize | null {
  const rawSize = window.localStorage.getItem(
    getSizeStorageKey(id, orientation)
  );

  if (!rawSize) {
    return null;
  }

  try {
    const size = JSON.parse(rawSize) as Partial<PanelSize>;

    return typeof size.height === "number" && typeof size.width === "number"
      ? { height: size.height, width: size.width }
      : null;
  } catch {
    return null;
  }
}

function storePosition(id: string, position: PanelPosition) {
  window.localStorage.setItem(getStorageKey(id), JSON.stringify(position));
}

function storeSize(
  id: string,
  orientation: PanelOrientation,
  size: PanelSize
) {
  window.localStorage.setItem(
    getSizeStorageKey(id, orientation),
    JSON.stringify(size)
  );
}

function isPanelDragHandle(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(PANEL_DRAG_HANDLE_SELECTOR))
  );
}

function isPanelResizeHandle(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(PANEL_RESIZE_HANDLE_SELECTOR))
  );
}

function isPanelTitleDragHandle(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(PANEL_TITLE_DRAG_HANDLE_SELECTOR))
  );
}

function blocksPanelDrag(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        [
          "a",
          "button",
          "input",
          "select",
          "textarea",
          "[contenteditable='true']",
          "[role='menu']",
          "[data-no-panel-drag]"
        ].join(",")
      )
    )
  );
}

function clampPanelPosition(position: PanelPosition, rect: DOMRect) {
  const maxX = Math.max(0, window.innerWidth - rect.width);
  const maxY = Math.max(0, window.innerHeight - rect.height);

  return {
    x: Math.min(maxX, Math.max(0, position.x)),
    y: Math.min(maxY, Math.max(0, position.y))
  };
}

function getEventPoint(
  event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>
): PanelPosition {
  const x = Number.isFinite(event.clientX) ? event.clientX : 0;
  const y = Number.isFinite(event.clientY) ? event.clientY : 0;

  return { x, y };
}

function getPointerId(
  event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>
) {
  const pointerId = (event as PointerEvent<HTMLDivElement>).pointerId;

  return typeof pointerId === "number" ? pointerId : "mouse";
}

export function DraggablePanel({
  anchorElement,
  anchorGap = 6,
  children,
  className,
  closable = false,
  defaultOrientation = "horizontal",
  draggable = true,
  dragByTitle = true,
  hideLabels,
  headerActions,
  horizontalActionsLayout = "row",
  id,
  maxCols = 1,
  maxRows = 1,
  minSize,
  onClose,
  orientationChangeable = true,
  pinnable = false,
  positionStorageId,
  reopenKey,
  resizable = false,
  resizeAxes,
  showDragHandle = true,
  title,
  topDock = false
}: {
  anchorElement?: HTMLElement | null;
  anchorGap?: number;
  children:
    | ReactNode
    | ((state: DraggablePanelRenderState) => ReactNode);
  className?: string;
  closable?: boolean;
  defaultOrientation?: PanelOrientation;
  draggable?: boolean;
  dragByTitle?: boolean;
  hideLabels?: Partial<Record<PanelOrientation, boolean>>;
  headerActions?: ReactNode;
  id: string;
  horizontalActionsLayout?: "column" | "row";
  maxCols?: number;
  maxRows?: number;
  minSize?: Partial<PanelSize>;
  onClose?: () => void;
  orientationChangeable?: boolean;
  pinnable?: boolean;
  positionStorageId?: string;
  reopenKey?: string | number;
  resizable?: boolean;
  resizeAxes?: Partial<Record<PanelOrientation, PanelResizeAxis>>;
  showDragHandle?: boolean;
  title?: string;
  topDock?: boolean;
}) {
  const { strings } = useI18n();
  const {
    isPanelPinned,
    registerVisiblePanel,
    setPanelPinned
  } = useGraphicEditorSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    moved: boolean;
    offsetX: number;
    offsetY: number;
    pointerId: number | "mouse";
    startedAt: PanelPosition;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number | "mouse";
    scaleX: number;
    scaleY: number;
    startedAt: PanelPosition;
    startSize: PanelSize;
  } | null>(null);
  const previousReopenKeyRef = useRef(reopenKey);
  const suppressClickRef = useRef(false);
  const positionKey = positionStorageId ?? id;
  const [position, setPosition] = useState<PanelPosition | null>(() =>
    draggable ? readStoredPosition(positionKey) : null
  );
  const initialOrientationRef = useRef(
    orientationChangeable
      ? readStoredOrientation(id, defaultOrientation)
      : defaultOrientation
  );
  const [orientation, setOrientation] = useState<PanelOrientation>(
    initialOrientationRef.current
  );
  const [size, setSize] = useState<PanelSize | null>(() =>
    readStoredSize(id, initialOrientationRef.current)
  );
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [temporarilyClosed, setTemporarilyClosed] = useState(false);
  const pinned = pinnable && isPanelPinned(id);
  const resizeAxis = resizable
    ? resizeAxes?.[orientation] ??
      (orientation === "vertical" ? "both" : undefined)
    : undefined;
  const canResize = Boolean(resizeAxis);
  const labelsHidden = hideLabels?.[orientation] ?? false;
  const minimumSize = {
    height: minSize?.height ?? MIN_RESIZABLE_PANEL_HEIGHT,
    width: minSize?.width ?? MIN_RESIZABLE_PANEL_WIDTH
  };

  useEffect(() => {
    if (previousReopenKeyRef.current === reopenKey) {
      return;
    }

    previousReopenKeyRef.current = reopenKey;
    setTemporarilyClosed(false);
  }, [reopenKey]);

  useEffect(() => {
    if (temporarilyClosed) {
      return;
    }

    return registerVisiblePanel(id, pinnable);
  }, [id, pinnable, registerVisiblePanel, temporarilyClosed]);

  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!anchorElement || !panel || draggable) {
      return;
    }

    const updatePositionFromAnchor = () => {
      const anchorRect = anchorElement.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const offsetParent = panel.offsetParent as HTMLElement | null;
      const parentRect = offsetParent?.getBoundingClientRect() ?? {
        bottom: window.innerHeight,
        height: window.innerHeight,
        left: 0,
        right: window.innerWidth,
        top: 0,
        width: window.innerWidth
      };
      const padding = 8;
      const maximumLeft = Math.max(
        padding,
        parentRect.width - panelRect.width - padding
      );
      const nextPosition = {
        x: Math.min(
          maximumLeft,
          Math.max(padding, anchorRect.left - parentRect.left)
        ),
        y: Math.max(
          padding,
          anchorRect.bottom - parentRect.top + anchorGap
        )
      };

      setPosition((currentPosition) =>
        currentPosition?.x === nextPosition.x &&
        currentPosition.y === nextPosition.y
          ? currentPosition
          : nextPosition
      );
    };

    updatePositionFromAnchor();
    window.addEventListener("resize", updatePositionFromAnchor);
    window.addEventListener("scroll", updatePositionFromAnchor, true);

    const resizeObserver = globalThis.ResizeObserver
      ? new ResizeObserver(updatePositionFromAnchor)
      : null;
    resizeObserver?.observe(anchorElement);
    resizeObserver?.observe(panel);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePositionFromAnchor);
      window.removeEventListener("scroll", updatePositionFromAnchor, true);
    };
  }, [anchorElement, anchorGap, draggable, reopenKey]);

  const setNextPosition = (
    nextPosition: PanelPosition,
    rect: DOMRect,
    persist: boolean
  ) => {
    const clampedPosition = clampPanelPosition(
      {
        x: nextPosition.x,
        y:
          persist && topDock && nextPosition.y < TOP_DOCK_THRESHOLD
            ? TOP_DOCK_Y
            : nextPosition.y
      },
      rect
    );

    setPosition(clampedPosition);

    if (persist) {
      storePosition(positionKey, clampedPosition);
    }
  };

  const startDrag = (
    event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>,
    pointerId: number | "mouse"
  ) => {
    const hasDragTarget =
      isPanelDragHandle(event.target) ||
      (dragByTitle &&
        orientation === "vertical" &&
        isPanelTitleDragHandle(event.target));

    if (
      !draggable ||
      dragRef.current ||
      resizeRef.current ||
      event.button > 0 ||
      !hasDragTarget ||
      blocksPanelDrag(event.target)
    ) {
      return false;
    }

    const panel = panelRef.current;

    if (!panel) {
      return false;
    }

    const rect = panel.getBoundingClientRect();
    const point = getEventPoint(event);
    dragRef.current = {
      moved: false,
      offsetX: point.x - rect.left,
      offsetY: point.y - rect.top,
      pointerId,
      startedAt: point
    };
    setDragging(true);
    return true;
  };

  const startResize = (
    event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>,
    pointerId: number | "mouse"
  ) => {
    if (
      !canResize ||
      resizeRef.current ||
      dragRef.current ||
      event.button > 0 ||
      !isPanelResizeHandle(event.target)
    ) {
      return false;
    }

    const panel = panelRef.current;

    if (!panel) {
      return false;
    }

    const rect = panel.getBoundingClientRect();
    const unscaledWidth = panel.offsetWidth || rect.width;
    const unscaledHeight = panel.offsetHeight || rect.height;
    resizeRef.current = {
      pointerId,
      scaleX:
        unscaledWidth > 0 && rect.width > 0 ? rect.width / unscaledWidth : 1,
      scaleY:
        unscaledHeight > 0 && rect.height > 0 ? rect.height / unscaledHeight : 1,
      startedAt: getEventPoint(event),
      startSize: {
        height: Math.max(minimumSize.height, unscaledHeight),
        width: Math.max(minimumSize.width, unscaledWidth)
      }
    };
    setResizing(true);
    return true;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!startResize(event, event.pointerId)) {
      startDrag(event, event.pointerId);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    const pointerId = getPointerId(event);
    const resize = resizeRef.current;

    if (resize && resize.pointerId === pointerId && panel) {
      const point = getEventPoint(event);
      const calculatedHeight = Math.min(
          window.innerHeight / resize.scaleY,
          Math.max(
            minimumSize.height,
            resize.startSize.height +
              (point.y - resize.startedAt.y) / resize.scaleY
          )
        );
      const calculatedWidth = Math.min(
          window.innerWidth / resize.scaleX,
          Math.max(
            minimumSize.width,
            resize.startSize.width +
              (point.x - resize.startedAt.x) / resize.scaleX
          )
        );
      const nextSize = {
        height:
          resizeAxis === "horizontal"
            ? resize.startSize.height
            : calculatedHeight,
        width:
          resizeAxis === "vertical"
            ? resize.startSize.width
            : calculatedWidth
      };

      setSize(nextSize);
      suppressClickRef.current = true;
      if (typeof pointerId === "number") {
        panel.setPointerCapture?.(pointerId);
      }
      return;
    }

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== pointerId || !panel) {
      return;
    }

    const point = getEventPoint(event);
    const movedDistance = Math.hypot(
      point.x - drag.startedAt.x,
      point.y - drag.startedAt.y
    );

    if (movedDistance > DRAG_CLICK_THRESHOLD) {
      drag.moved = true;
      suppressClickRef.current = true;
      if (typeof pointerId === "number") {
        panel.setPointerCapture?.(pointerId);
      }
    }

    if (!drag.moved) {
      return;
    }

    setNextPosition(
      {
        x: point.x - drag.offsetX,
        y: point.y - drag.offsetY
      },
      panel.getBoundingClientRect(),
      false
    );
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    const pointerId = getPointerId(event);
    const resize = resizeRef.current;

    if (resize && resize.pointerId === pointerId && panel) {
      resizeRef.current = null;
      if (typeof pointerId === "number") {
        panel.releasePointerCapture?.(pointerId);
      }
      setResizing(false);
      if (size) {
        storeSize(id, orientation, size);
      }
      return;
    }

    const drag = dragRef.current;

    if (!drag || drag.pointerId !== pointerId || !panel) {
      return;
    }

    dragRef.current = null;
    if (typeof pointerId === "number") {
      panel.releasePointerCapture?.(pointerId);
    }
    setDragging(false);

    if (!drag.moved) {
      return;
    }

    const point = getEventPoint(event);
    setNextPosition(
      {
        x: point.x - drag.offsetX,
        y: point.y - drag.offsetY
      },
      panel.getBoundingClientRect(),
      true
    );
  };

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!startResize(event, "mouse")) {
      startDrag(event, "mouse");
    }
  };

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (getPointerId(event) !== "mouse") {
      return;
    }

    onPointerMove(event as unknown as PointerEvent<HTMLDivElement>);
  };

  const onMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (getPointerId(event) !== "mouse") {
      return;
    }

    onPointerUp(event as unknown as PointerEvent<HTMLDivElement>);
  };

  const toggleOrientation = () => {
    if (!orientationChangeable) {
      return;
    }

    const nextOrientation =
      orientation === "horizontal" ? "vertical" : "horizontal";

    setOrientation(nextOrientation);
    setSize(readStoredSize(id, nextOrientation));
    window.localStorage.setItem(getOrientationStorageKey(id), nextOrientation);
  };

  const style = {
    ...(position
      ? { bottom: "auto", left: position.x, right: "auto", top: position.y }
      : {}),
    ...(canResize && size
      ? {
          ...(resizeAxis !== "horizontal" ? { height: size.height } : {}),
          ...(resizeAxis !== "vertical" ? { width: size.width } : {})
        }
      : {}),
    ...(canResize
      ? {
          ...(resizeAxis !== "horizontal"
            ? { minHeight: minimumSize.height }
            : {}),
          ...(resizeAxis !== "vertical" ? { minWidth: minimumSize.width } : {})
        }
      : {}),
    "--kizkatt-panel-max-cols": Math.max(1, Math.floor(maxCols)),
    "--kizkatt-panel-max-rows": Math.max(1, Math.floor(maxRows))
  } as CSSProperties;
  const panelActions = (headerActions || pinnable || closable) && (
    <span
      className={[
        "kizkatt-panel-actions",
        orientation === "horizontal"
          ? "kizkatt-panel-actions--horizontal"
          : "kizkatt-panel-actions--vertical",
        orientation === "horizontal"
          ? `kizkatt-panel-actions--${horizontalActionsLayout}`
          : ""
      ].join(" ")}
      data-no-panel-drag
      onPointerDown={(event) => event.stopPropagation()}
    >
      {headerActions && (
        <>
          <span
            aria-hidden="true"
            className="kizkatt-panel-action-spacer"
          />
          {headerActions}
        </>
      )}
      {pinnable && (
        <button
          type="button"
          className={pinned ? "is-active" : undefined}
          data-no-panel-drag
          aria-label={
            pinned
              ? strings.settings.unstickPanel
              : strings.settings.stickPanel
          }
          aria-pressed={pinned}
          title={
            pinned
              ? strings.settings.tooltips.unstickPanel
              : strings.settings.tooltips.stickPanel
          }
          onClick={() => setPanelPinned(id, !pinned)}
        >
          {PinIcon}
        </button>
      )}
      {closable && (
        <button
          type="button"
          data-no-panel-drag
          aria-label={strings.settings.closePanel}
          title={strings.settings.tooltips.closePanel}
          onClick={() => {
            if (pinned) {
              setPanelPinned(id, false);
            }

            setTemporarilyClosed(true);
            onClose?.();
          }}
        >
          {CloseIcon}
        </button>
      )}
    </span>
  );
  const chrome = (
    <div
      className={`kizkatt-panel-chrome kizkatt-panel-chrome--${orientation}`}
    >
      {showDragHandle && (
        <PanelDragHandle
          placement={orientation === "vertical" ? "top" : "left"}
          title={strings.settings.tooltips.panelDragHandle}
          onDoubleClick={orientationChangeable ? toggleOrientation : undefined}
        />
      )}
      {orientation === "vertical" && title && (
        <strong
          className="kizkatt-panel-title"
          data-panel-title-drag-handle={
            draggable && dragByTitle ? "true" : undefined
          }
        >
          {title}
        </strong>
      )}
      {orientation === "vertical" && panelActions}
    </div>
  );

  if (temporarilyClosed) {
    return null;
  }

  const actions = orientation === "horizontal" ? panelActions : null;
  const renderState = {
    actions,
    chrome,
    labelsHidden,
    orientation,
    pinned
  };

  return (
    <div
      ref={panelRef}
      className={[
        "kizkatt-floating-panel",
        `kizkatt-floating-panel--${id}`,
        `kizkatt-floating-panel--${orientation}`,
        position ? "is-positioned" : "",
        dragging ? "is-dragging" : "",
        resizing ? "is-resizing" : "",
        !draggable ? "is-drag-disabled" : "",
        canResize && size ? "is-resized" : "",
        pinned ? "is-pinned" : "",
        labelsHidden ? "has-hidden-labels" : "",
        className ?? ""
      ].join(" ")}
      style={style}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) {
          return;
        }

        suppressClickRef.current = false;

        if (
          !isPanelDragHandle(event.target) &&
          !isPanelTitleDragHandle(event.target) &&
          !isPanelResizeHandle(event.target)
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {typeof children === "function" ? children(renderState) : (
        <>
          {chrome}
          {children}
          {actions}
        </>
      )}
      {canResize && (
        <span
          className="kizkatt-panel-resize-handle"
          data-no-panel-drag
          data-panel-resize-handle
          aria-hidden="true"
          title={strings.settings.tooltips.resizePanel}
        />
      )}
    </div>
  );
}
