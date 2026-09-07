import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> & {
  active?: boolean;
  icon?: ReactNode;
  label: string;
};


export function Button({
  active,
  children,
  className,
  icon,
  label,
  title,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      aria-pressed={props["aria-pressed"] ?? active}
      className={[className, active ? "is-active" : ""]
        .filter(Boolean)
        .join(" ")}
      title={title ?? label}
      type={props.type ?? "button"}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
