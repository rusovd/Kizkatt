import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "../../components/Button";

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
    <Button
      {...buttonProps}
      active={active}
      className={[
        buttonProps.className,
        hasSubmenu ? "has-submenu" : ""
      ].join(" ")}
      label={label}
      title={buttonProps.title ?? tooltip}
    >
      <span aria-hidden="true">{icon}</span>
      {showShortcut && shortcut && <small>{shortcut}</small>}
      {hasSubmenu && <i className="kizkatt-submenu-indicator" aria-hidden="true" />}
    </Button>
  );
}
