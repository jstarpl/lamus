import classNames from "classnames";
import React, { useEffect, useState } from "react";
import "./FocusIndicator.css";
import { debounce } from "lodash";

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
    function actualHighlightTarget(target: HTMLElement) {
      const boundingRect = target.getBoundingClientRect();
      let visible = true;
      if (target.dataset["ownFocus"]) visible = false;
      if (boundingRect.bottom > 0 && boundingRect.top < window.innerHeight) {
        setRect({
          top: boundingRect.top,
          left: boundingRect.left,
          height: boundingRect.height,
          width: boundingRect.width,
        });
      } else {
        setRect(null);
      }
      setVisible(visible);
    }
    const highlightTarget = debounce(actualHighlightTarget, 10, {
      trailing: true,
    });
    function onResize() {
      if (!(document.activeElement instanceof HTMLElement)) return;
      highlightTarget(document.activeElement);
    }
    function onFocusIn() {
      if (!(document.activeElement instanceof HTMLElement)) return;
      highlightTarget(document.activeElement);
    }
    function onFocusOut() {
      setVisible(false);
    }

    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("resize", onResize);
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
