import { useLayoutEffect, useRef } from "react";
import { isOrIsAncestorOf } from "../../helpers/util";
import "./BreadcrumbBar.css";

interface IProps {
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
}

export function BreadcrumbBar({
  children,
  onFocus,
  onBlur,
}: React.PropsWithChildren<IProps>) {
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="BreadcrumbBar__Bar" ref={ref}>
      {children}
    </div>
  );
}
