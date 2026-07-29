import type { Tool } from "../../model/types";
import { TOOL_REGISTRY } from "../../tools/toolRegistry";

export function Toolbar({
  activeTool,
  onActivateTool
}: {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
}) {
  return (
    <div className="kizkatt-toolbar" aria-label="Kizkatt tools">
      {TOOL_REGISTRY.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={activeTool === entry.id ? "is-active" : undefined}
          aria-label={entry.label}
          title={entry.label}
          onClick={() => onActivateTool(entry.id)}
        >
          <span aria-hidden="true">{entry.icon}</span>
          {entry.shortcut && <small>{entry.shortcut}</small>}
        </button>
      ))}
    </div>
  );
}
