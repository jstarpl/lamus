import React, { useCallback, useEffect, useRef } from "react";
import { FocusIndicator } from "../helpers/FocusIndicator";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { useFocusTrap } from "../helpers/useFocusTrap";
import { isElementChildOf } from "../lib/lib";
import "./Dialog.css";

export const Dialog: React.FC<
  React.PropsWithChildren<{
    className?: string;
    top?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLDialogElement>;
    onKeyUp?: React.KeyboardEventHandler<HTMLDialogElement>;
    onClickBackdrop?: React.MouseEventHandler<HTMLDivElement>;
  }>
> = function Dialog({
  children,
  className,
  onKeyDown,
  onKeyUp,
  onClickBackdrop,
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

  useCursorNavigation(dialogRef);
  const { FocusTrapStart, FocusTrapEnd } = useFocusTrap(dialogRef);

  return (
    <>
      <FocusIndicator />
      <div className="dialog__backdrop" onClick={onClickBackdrop}></div>
      <dialog
        open
        className={`${className ?? ""} ${top ? "top" : ""}`}
        ref={dialogRef}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        tabIndex={0}
        data-own-focus
      >
        <FocusTrapStart />
        {children}
        <FocusTrapEnd />
      </dialog>
    </>
  );
};
