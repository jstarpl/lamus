import React, { useCallback } from "react";

export function useFocusTrap(ref?: React.RefObject<HTMLElement>) {
  const onFocusStart = useCallback(
    (e: React.FocusEvent) => {
      const root = ref?.current ?? e.target.parentElement;
      if (!root) return;
      const focusableElements = root.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"]):not([data-focus-trap])'
      );
      if (focusableElements.length === 0) return;
      setTimeout(() => {
        focusableElements[focusableElements.length - 1].focus();
      }, 1);
    },
    [ref]
  );

  const onFocusEnd = useCallback(
    (e: React.FocusEvent) => {
      const root = ref?.current ?? e.target.parentElement;
      if (!root) return;
      const focusableElements = root.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"]):not([data-focus-trap])'
      );
      if (focusableElements.length === 0) return;
      focusableElements[0].focus();
    },
    [ref]
  );

  return {
    FocusTrapStart: React.memo(() => (
      <div tabIndex={0} onFocusCapture={onFocusStart} data-focus-trap></div>
    )),
    FocusTrapEnd: React.memo(() => (
      <div tabIndex={0} onFocusCapture={onFocusEnd} data-focus-trap></div>
    )),
  };
}
