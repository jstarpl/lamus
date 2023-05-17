import { useEffect } from "react";

export function usePreventTabHijack(enable: boolean = true) {
  useEffect(() => {
    if (!enable) return

    function preventTabHijack(e: KeyboardEvent) {
      if (e.key === "Tab") {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", preventTabHijack, {
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", preventTabHijack, {
        capture: true,
      });
    };
  }, [enable]);
}
