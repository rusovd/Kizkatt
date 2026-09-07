import { useState, type ReactNode } from "react";

import { ChevronDownIcon } from "../../ui/icons";

export function CollapsiblePanelSection({
  children,
  className,
  defaultOpen = false,
  title
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={[
        "kizkatt-collapsible-section",
        open ? "is-open" : "",
        className ?? ""
      ].join(" ")}
    >
      <button
        type="button"
        className="kizkatt-collapsible-section-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{title}</span>
        {ChevronDownIcon}
      </button>
      {open && (
        <div className="kizkatt-collapsible-section-content">{children}</div>
      )}
    </section>
  );
}
