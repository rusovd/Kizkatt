import { useLayoutEffect, useRef } from "react";

type WindowPointerTrackingOptions = {
  active: boolean;
  onPointerCancel: () => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
};


export function useWindowPointerTracking({
  active,
  onPointerCancel,
  onPointerMove,
  onPointerUp
}: WindowPointerTrackingOptions) {
  const callbacksRef = useRef({
    onPointerCancel,
    onPointerMove,
    onPointerUp
  });
  callbacksRef.current = { onPointerCancel, onPointerMove, onPointerUp };

  useLayoutEffect(() => {
    if (!active) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      callbacksRef.current.onPointerMove(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      callbacksRef.current.onPointerUp(event);
    };
    const handlePointerCancel = () => {
      callbacksRef.current.onPointerCancel();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handlePointerCancel);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handlePointerCancel);
    };
  }, [active]);
}
