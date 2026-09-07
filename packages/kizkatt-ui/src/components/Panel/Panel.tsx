import type { ComponentProps } from "react";

import { DraggablePanel } from "../../ui/positioning/DraggablePanel";

export type PanelVariant = "floating" | "popover" | "toolbar";
export type PanelProps = ComponentProps<typeof DraggablePanel> & {
  variant?: PanelVariant;
};


export function Panel({ variant = "floating", ...props }: PanelProps) {
  const popover = variant === "popover";

  return (
    <DraggablePanel
      {...props}
      draggable={props.draggable ?? !popover}
      orientationChangeable={props.orientationChangeable ?? !popover}
      showDragHandle={props.showDragHandle ?? !popover}
    />
  );
}
