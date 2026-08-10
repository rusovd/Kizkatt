export function PanelDragHandle({
  placement = "left",
  title
}: {
  placement?: "left" | "top";
  title: string;
}) {
  return (
    <span
      className={`kizkatt-panel-drag-handle kizkatt-panel-drag-handle--${placement}`}
      data-panel-drag-handle
      title={title}
      aria-hidden="true"
    />
  );
}
