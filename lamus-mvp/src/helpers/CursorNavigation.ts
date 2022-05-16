import { useEffect } from "react";

const CURSOR_KEYS = ["ArrowUp", "ArrowRight", "ArrowBottom", "ArrowLeft"];

export function CursorNavigation() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        !CURSOR_KEYS.includes(e.code) ||
        e.ctrlKey ||
        e.shiftKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      e.preventDefault();
      e.stopPropagation();

      const focusedElement = document.querySelector(":focus");
      const focusableElements = document.querySelectorAll(
        'button:not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
      );
    }

    window.addEventListener("keydown", onKeyDown, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
