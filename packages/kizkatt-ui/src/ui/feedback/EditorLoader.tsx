import type { CSSProperties } from "react";

const LOADER_SPRITE_URL = new URL(
  "../../assets/loader/kizkatt-loader-sprite.png",
  import.meta.url
).href;

export function EditorLoader({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className="kizkatt-editor-loader"
      role="status"
    >
      <span
        aria-hidden="true"
        className="kizkatt-editor-loader-icon"
        style={
          { "--kizkatt-loader-sprite": `url("${LOADER_SPRITE_URL}")` } as CSSProperties
        }
      />
    </div>
  );
}
