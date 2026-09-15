import type { CSSProperties } from "react";
import {
  ARROW_MARKER_HEIGHT,
  ARROW_MARKER_ORIENT,
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_X,
  ARROW_MARKER_REF_Y,
  ARROW_MARKER_VIEW_BOX,
  ARROW_MARKER_WIDTH
} from "kizkatt-graphic-engine";

import type {
  KizkattGraphicEditorCanvasViewModel,
  KizkattRenderElementOptions
} from "../../contracts/editorView";
import { SceneElement } from "../SceneElement";
import {
  ImagePlacementPreview,
  TransformPreview
} from "../../preview/PreviewOverlays";
import { CanvasGrid } from "../../ui/canvas/CanvasGrid";
import { InfoOverlay } from "../../ui/canvas/InfoOverlay";
import {
  renderElement,
  renderElementOverlay
} from "../../ui/canvas/renderElement";
import { SelectedBounds } from "../../ui/canvas/SelectedBounds";
import { SelectionArea } from "../../ui/canvas/SelectionArea";

const DEFAULT_SCENE_ELEMENT_OPTIONS: KizkattRenderElementOptions = {};
const WIREFRAME_SCENE_ELEMENT_OPTIONS: KizkattRenderElementOptions = {
  wireframe: true
};

export function EditorCanvas({
  viewModel
}: {
  viewModel: KizkattGraphicEditorCanvasViewModel;
}) {
  const {
    activeDisplayMode,
    arrowMarkerId,
    canvasAriaLabel,
    canvasBackgroundColor,
    canvasClassName,
    canvasCursor,
    canvasState,
    displayElements,
    getElementSelectionRenderState,
    gridColor,
    gridSettings,
    imagePlacementBounds,
    infoMode,
    infoOverlayItems,
    interaction,
    onContextMenu,
    onDoubleClick,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onPointerUp,
    onWheel,
    pan,
    previewTransformInteraction,
    selectedElements,
    selectionTransformCenter,
    selectionTransformMode,
    showGrid,
    showRotateHandle,
    svgRef,
    zoom
  } = viewModel;
  const sceneElementOptions = activeDisplayMode === "wireframe"
    ? WIREFRAME_SCENE_ELEMENT_OPTIONS
    : DEFAULT_SCENE_ELEMENT_OPTIONS;

  return (
    <svg
      ref={svgRef}
      className={canvasClassName}
      role="application"
      aria-label={canvasAriaLabel}
      style={
        {
          "--kizkatt-canvas-grid": gridColor,
          backgroundColor:
            activeDisplayMode === "wireframe"
              ? "var(--kizkatt-wireframe-canvas)"
              : canvasBackgroundColor,
          cursor: canvasCursor
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onContextMenu={onContextMenu}
    >
      <CanvasGrid
        gridSettings={gridSettings}
        pan={pan}
        visible={showGrid}
        zoom={zoom}
      />
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox={ARROW_MARKER_VIEW_BOX}
          refX={ARROW_MARKER_REF_X}
          refY={ARROW_MARKER_REF_Y}
          markerWidth={ARROW_MARKER_WIDTH}
          markerHeight={ARROW_MARKER_HEIGHT}
          orient={ARROW_MARKER_ORIENT}
        >
          <path d={ARROW_MARKER_PATH} />
        </marker>
      </defs>
      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {displayElements.map((element) => (
          <SceneElement
            key={element.id}
            element={element}
            options={sceneElementOptions}
            renderElement={renderElement}
            selected={false}
          />
        ))}
        {!previewTransformInteraction &&
          selectedElements.map((element) => {
            const { options, showInternalOverlay, showPrimaryOverlay } =
              getElementSelectionRenderState(element);

            if (showPrimaryOverlay) {
              return renderElementOverlay(element, {
                ...options,
                overlayVariant: "primary"
              });
            }

            if (showInternalOverlay) {
              return renderElementOverlay(element, {
                ...options,
                overlayVariant: "internal"
              });
            }

            return null;
          })}
        {imagePlacementBounds && (
          <ImagePlacementPreview bounds={imagePlacementBounds} />
        )}
        <SelectionArea interaction={interaction} />
        {previewTransformInteraction && (
          <TransformPreview
            elements={canvasState.elements}
            selectedIds={previewTransformInteraction.selectedIds}
            wireframe={activeDisplayMode === "wireframe"}
          />
        )}
        {(previewTransformInteraction?.type === "bezierControl" ||
          previewTransformInteraction?.type === "linearSegmentBend") &&
          selectedElements.map((element) => {
            const { options } = getElementSelectionRenderState(element);
            const isActiveLinearSegmentBend =
              previewTransformInteraction?.type === "linearSegmentBend" &&
              previewTransformInteraction.elementId === element.id;

            return renderElementOverlay(element, {
              ...options,
              overlayVariant: "primary",
              selectedSegmentIndex: isActiveLinearSegmentBend
                ? previewTransformInteraction.segmentIndex
                : options.selectedSegmentIndex,
              segmentBendHandlePoint: isActiveLinearSegmentBend
                ? previewTransformInteraction.handlePoint
                : undefined,
              showLinearBezierHandles: isActiveLinearSegmentBend
                ? false
                : options.showLinearBezierHandles,
              showLinearBendHandles: isActiveLinearSegmentBend,
              showSelectionBounds: false
            });
          })}
        {infoMode && <InfoOverlay items={infoOverlayItems} zoom={zoom} />}
        {!previewTransformInteraction && (
          <SelectedBounds
            elements={selectedElements}
            interaction={interaction}
            selectionTransformCenter={selectionTransformCenter}
            selectionTransformMode={selectionTransformMode}
            showRotateHandle={showRotateHandle}
            showRotateHoverIcon={interaction?.type !== "rotate"}
            zoom={zoom}
          />
        )}
      </g>
    </svg>
  );
}
