import classNames from "classnames";
import React, { useEffect, useState } from "react";
import "./FocusIndicator.css";

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export const FocusIndicator: React.FC = function FocusIndicator() {
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onFocusIn(ev: FocusEvent) {
      if (!(ev.target instanceof HTMLElement)) return;
      const boundingRect = ev.target.getBoundingClientRect();
      setRect({
        top: boundingRect.top,
        left: boundingRect.left,
        height: boundingRect.height,
        width: boundingRect.width,
      });
      setVisible(true);
    }
    function onFocusOut(ev: FocusEvent) {
      setVisible(false);
    }

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <div
      className={classNames("focus-indicator", { visible })}
      style={
        rect
          ? {
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
            }
          : undefined
      }
    ></div>
  );
};
