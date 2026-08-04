import type { ButtonHTMLAttributes, ReactNode } from "react";

export function ToolbarButton({
  active,
  hasSubmenu,
  icon,
  label,
  showShortcut,
  shortcut,
  tooltip,
  ...buttonProps
}: {
  active?: boolean;
  hasSubmenu?: boolean;
  icon: ReactNode;
  label: string;
  showShortcut?: boolean;
  shortcut?: string;
  tooltip?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={[
        buttonProps.className,
        active ? "is-active" : "",
        hasSubmenu ? "has-submenu" : ""
      ].join(" ")}
      aria-label={label}
      title={buttonProps.title ?? tooltip ?? label}
    >
      <span aria-hidden="true">{icon}</span>
      {showShortcut && shortcut && <small>{shortcut}</small>}
      {hasSubmenu && <i className="kizkatt-submenu-indicator" aria-hidden="true" />}
    </button>
  );
}
