import React, { useCallback, useEffect, useRef } from "react";
import { FocusIndicator } from "../helpers/FocusIndicator";
import "./Dialog.css";

function isElementChildOf(element: HTMLElement, parent: HTMLElement) {
  let elementParent = element.parentElement;
  do {
    if (elementParent === parent) return true;
    elementParent = elementParent?.parentElement ?? null;
  } while (elementParent !== null);
  return false;
}

export const Dialog: React.FC<React.PropsWithChildren<{}>> = function Dialog({
  children,
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  const focusButton = useCallback(() => {
    if (!dialogRef.current) return;

    const button =
      dialogRef.current.querySelector<HTMLElement>("button[data-focus]");
    if (button) {
      button.focus();
      return;
    }
    const focusableElement =
      dialogRef.current.querySelector<HTMLElement>("button, input");
    if (!focusableElement) return;
    focusableElement.focus();
  }, [dialogRef]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      focusButton();
    }, 40);

    return () => {
      clearTimeout(timeout);
    };
  }, [focusButton]);

  useEffect(() => {
    function onFocusIn(ev: FocusEvent) {
      if (!dialogRef.current) return;
      if (!(ev.relatedTarget instanceof HTMLElement)) return;
      if (!(ev.target instanceof HTMLElement)) return;
      if (isElementChildOf(ev.target, dialogRef.current)) return;

      window.requestAnimationFrame(() => focusButton());
    }

    window.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [focusButton]);

  function onFocusStart() {
    if (!dialogRef.current) return;
    const focusableElements =
      dialogRef.current.querySelectorAll<HTMLElement>("button, input");
    console.log(focusableElements);
    if (focusableElements.length === 0) return;
    setTimeout(() => {
      focusableElements[focusableElements.length - 1].focus();
    }, 1);
  }

  function onFocusEnd() {
    if (!dialogRef.current) return;
    const focusableElements =
      dialogRef.current.querySelectorAll<HTMLElement>("button, input");
    if (focusableElements.length === 0) return;
    focusableElements[0].focus();
  }

  return (
    <>
      <FocusIndicator />
      <div className="dialog__backdrop"></div>
      <dialog open ref={dialogRef}>
        {/* Focus trap */}
        <div tabIndex={0} onFocusCapture={onFocusStart}></div>
        {children}
        {/* Focus trap */}
        <div tabIndex={0} onFocusCapture={onFocusEnd}></div>
      </dialog>
    </>
  );
};
