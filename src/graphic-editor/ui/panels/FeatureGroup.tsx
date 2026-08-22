import type { ReactNode } from "react";

export function FeatureGroup({
  children,
  className,
  icon,
  label,
  labelFor
}: {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  label?: string;
  labelFor?: string;
}) {
  return (
    <section
      className={["kizkatt-feature-group", className]
        .filter(Boolean)
        .join(" ")}
      data-feature-group
    >
      {label && (
        <label data-panel-label htmlFor={labelFor}>
          {label}
        </label>
      )}
      {icon && (
        <span className="kizkatt-feature-group-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="kizkatt-feature-group-content">{children}</div>
    </section>
  );
}
