import React, { useLayoutEffect, useRef } from "react";
import { isOrIsAncestorOf } from "../../helpers/util";
import { combineRefs } from "../../lib/lib";
import "./BreadcrumbBar.css";

interface IProps {
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
}

export const BreadcrumbBar = React.forwardRef<
  HTMLOListElement,
  React.PropsWithChildren<IProps>
>(function BreadcrumbBar({ children, onFocus, onBlur }, outerRef) {
  const ref = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const elem = ref.current;

    function onFocusInner(e: FocusEvent) {
      onFocus && onFocus(e);
    }

    function onBlurInner(e: FocusEvent) {
      if (
        e.relatedTarget === null ||
        (e.relatedTarget instanceof HTMLElement &&
          !isOrIsAncestorOf(elem, e.relatedTarget))
      )
        onBlur && onBlur(e);
    }

    elem.addEventListener("focusin", onFocusInner);
    elem.addEventListener("focusout", onBlurInner);

    return () => {
      elem.removeEventListener("focusin", onFocusInner);
      elem.removeEventListener("focusout", onBlurInner);
    };
  }, [onFocus, onBlur]);

  return (
    <nav className="BreadcrumbBar__Bar">
      <ol ref={combineRefs(ref, outerRef)}>{children}</ol>
    </nav>
  );
});
BreadcrumbBar.displayName = "BreadcrumbBar";
