export function PanelDragHandle({
  onDoubleClick,
  placement = "left",
  title
}: {
  onDoubleClick?: () => void;
  placement?: "left" | "top";
  title: string;
}) {
  return (
    <span
      className={`kizkatt-panel-drag-handle kizkatt-panel-drag-handle--${placement}`}
      data-panel-drag-handle
      title={title}
      aria-hidden="true"
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDoubleClick?.();
      }}
    />
  );
}
