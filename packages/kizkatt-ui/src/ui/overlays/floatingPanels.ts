import { useEffect } from "react";

const CLOSE_FLOATING_PANELS_EVENT = "kizkatt:close-floating-panels";
const ACTIVE_FLOATING_PANEL_EVENT = "kizkatt:active-floating-panel";

type CloseFloatingPanelsDetail = {
  source: string;
};

type ActiveFloatingPanelDetail = {
  source: string | null;
};

export function closeOtherFloatingPanels(source: string) {
  window.dispatchEvent(
    new CustomEvent<CloseFloatingPanelsDetail>(CLOSE_FLOATING_PANELS_EVENT, {
      detail: { source }
    })
  );
}

export function setActiveFloatingPanel(source: string | null) {
  window.dispatchEvent(
    new CustomEvent<ActiveFloatingPanelDetail>(ACTIVE_FLOATING_PANEL_EVENT, {
      detail: { source }
    })
  );
}

export function useCloseOtherFloatingPanels(
  source: string,
  onClose: () => void
) {
  useEffect(() => {
    const handleClose = (event: Event) => {
      const detail = (event as CustomEvent<CloseFloatingPanelsDetail>).detail;

      if (detail?.source === source) {
        return;
      }

      onClose();
    };

    window.addEventListener(CLOSE_FLOATING_PANELS_EVENT, handleClose);

    return () => {
      window.removeEventListener(CLOSE_FLOATING_PANELS_EVENT, handleClose);
    };
  }, [onClose, source]);
}

export function useActiveFloatingPanel(onChange: (source: string | null) => void) {
  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<ActiveFloatingPanelDetail>).detail;

      onChange(detail?.source ?? null);
    };

    window.addEventListener(ACTIVE_FLOATING_PANEL_EVENT, handleChange);

    return () => {
      window.removeEventListener(ACTIVE_FLOATING_PANEL_EVENT, handleChange);
    };
  }, [onChange]);
}
