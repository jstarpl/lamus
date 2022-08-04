import React from "react";

export function useFocusTrap(ref?: React.RefObject<HTMLElement>) {
  function onFocusStart(e: React.FocusEvent) {
    const root = ref?.current ?? e.target.parentElement;
    if (!root) return;
    const focusableElements = root.querySelectorAll<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"]):not([data-focus-trap])'
    );
    console.log(focusableElements);
    if (focusableElements.length === 0) return;
    setTimeout(() => {
      focusableElements[focusableElements.length - 1].focus();
    }, 1);
  }

  function onFocusEnd(e: React.FocusEvent) {
    const root = ref?.current ?? e.target.parentElement;
    if (!root) return;
    const focusableElements = root.querySelectorAll<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"]):not([data-focus-trap])'
    );
    if (focusableElements.length === 0) return;
    focusableElements[0].focus();
  }

  return [
    <div tabIndex={0} onFocusCapture={onFocusStart} data-focus-trap></div>,
    <div tabIndex={0} onFocusCapture={onFocusEnd} data-focus-trap></div>,
  ];
}
