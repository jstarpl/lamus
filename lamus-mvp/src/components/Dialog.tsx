import React, { useCallback, useEffect, useRef } from "react";
import { FocusIndicator } from "../helpers/FocusIndicator";
import "./Dialog.css";

export const Dialog: React.FC<React.PropsWithChildren<{}>> = function Dialog({
  children,
}) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  const focusButton = useCallback(() => {
    if (!dialogRef.current) return;

    const button = dialogRef.current.querySelector<HTMLElement>(
      "button[data-focus], button, input"
    );
    if (!button) return;
    button.focus();
  }, [dialogRef]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      focusButton();
    }, 20);

    return () => {
      clearTimeout(timeout);
    };
  }, [focusButton]);

  useEffect(() => {
    function onFocusIn(ev: FocusEvent) {
      if (!dialogRef.current) return;
      const path = ev.composedPath();
      if (path.indexOf(dialogRef.current) >= 0) return;
      focusButton();
    }

    window.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
    };
  }, [focusButton]);

  return (
    <>
      <FocusIndicator />
      <div className="dialog__backdrop"></div>
      <dialog open ref={dialogRef}>
        {children}
      </dialog>
    </>
  );
};
