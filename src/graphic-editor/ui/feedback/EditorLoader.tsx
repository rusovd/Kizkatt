export function EditorLoader({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className="kizkatt-editor-loader"
      role="status"
    >
      <span aria-hidden="true">•••</span>
    </div>
  );
}
