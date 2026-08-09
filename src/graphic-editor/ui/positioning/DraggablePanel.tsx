import type {
  CSSProperties,
  MouseEvent,
  PointerEvent,
  ReactNode
} from "react";
import { useRef, useState } from "react";

import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

type PanelPosition = {
  x: number;
  y: number;
};

const STORAGE_PREFIX = "kizkatt:graphic-editor:panel";
const TOP_DOCK_Y = 16;
const TOP_DOCK_THRESHOLD = 28;
const DRAG_CLICK_THRESHOLD = 4;

function getStorageKey(id: string) {
  return `${STORAGE_PREFIX}:${id}`;
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

function storePosition(id: string, position: PanelPosition) {
  window.localStorage.setItem(getStorageKey(id), JSON.stringify(position));
}

function blocksPanelDrag(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        [
          "a",
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

function getDragPointerId(
  event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>
) {
  const pointerId = (event as PointerEvent<HTMLDivElement>).pointerId;

  return typeof pointerId === "number" ? pointerId : "mouse";
}

export function DraggablePanel({
  children,
  className,
  id,
  topDock = false
}: {
  children: ReactNode;
  className?: string;
  id: string;
  topDock?: boolean;
}) {
  const { dragEnabled } = useGraphicEditorSettings();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    moved: boolean;
    offsetX: number;
    offsetY: number;
    pointerId: number | "mouse";
    startedAt: PanelPosition;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [position, setPosition] = useState<PanelPosition | null>(() =>
    readStoredPosition(id)
  );
  const [dragging, setDragging] = useState(false);

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
      storePosition(id, clampedPosition);
    }
  };

  const startDrag = (
    event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>,
    pointerId: number | "mouse"
  ) => {
    if (
      !dragEnabled ||
      dragRef.current ||
      event.button > 0 ||
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

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startDrag(event, event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const panel = panelRef.current;
    const pointerId = getDragPointerId(event);

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
    const drag = dragRef.current;
    const panel = panelRef.current;
    const pointerId = getDragPointerId(event);

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
    startDrag(event, "mouse");
  };

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== "mouse") {
      return;
    }

    onPointerMove(event as unknown as PointerEvent<HTMLDivElement>);
  };

  const onMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== "mouse") {
      return;
    }

    onPointerUp(event as unknown as PointerEvent<HTMLDivElement>);
  };

  const style: CSSProperties | undefined = position
    ? {
        left: position.x,
        top: position.y
      }
    : undefined;

  return (
    <div
      ref={panelRef}
      className={[
        "kizkatt-floating-panel",
        `kizkatt-floating-panel--${id}`,
        position ? "is-positioned" : "",
        dragging ? "is-dragging" : "",
        !dragEnabled ? "is-drag-disabled" : "",
        className ?? ""
      ].join(" ")}
      style={style}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) {
          return;
        }

        suppressClickRef.current = false;
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
      {children}
    </div>
  );
}
