import { useEffect } from "react";

export function useMouseWheelSink() {
  useEffect(() => {
    function wheelZoomSink(e: WheelEvent) {
      // wheel + ctrlKey results in zoom in most browsers, preventDefault
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }

    document.addEventListener("wheel", wheelZoomSink, {
      passive: false,
    });

    return () => {
      document.removeEventListener("wheel", wheelZoomSink);
    };
  });
}
