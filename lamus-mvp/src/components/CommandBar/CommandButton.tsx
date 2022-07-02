import classNames from "classnames";
import { useEffect, useState, useContext } from "react";
import * as React from "react";
import { AltDown, CtrlDown, MetaDown, ShiftDown } from "./CommandBar";

interface IProps {
  combo?: string[];
  highlight?: boolean;
  showOnlyWhenModifiersActive?: boolean;
  position?: number;
  onClick?: (
    e:
      | MouseEvent
      | KeyboardEvent
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}

export const CommandButton: React.FC<React.PropsWithChildren<IProps>> =
  function CommandButton({
    combo,
    highlight,
    children,
    position,
    showOnlyWhenModifiersActive,
    onClick,
  }) {
    const lastKey =
      (combo && combo.length > 0 && combo[combo.length - 1]) ?? undefined;
    const hasShift = (combo && combo.includes("Shift")) || false;
    const hasAlt = (combo && combo.includes("Alt")) || false;
    const hasCtrl = (combo && combo.includes("Control")) || false;
    const hasMeta = (combo && combo.includes("Meta")) || false;
    const [isActive, setActive] = useState(false);

    const isShiftDown = useContext(ShiftDown);
    const isCtrlDown = useContext(CtrlDown);
    const isAltDown = useContext(AltDown);
    const isMetaDown = useContext(MetaDown);

    let display = true;

    if (showOnlyWhenModifiersActive) {
      if (
        isShiftDown !== hasShift ||
        isCtrlDown !== hasCtrl ||
        isAltDown !== hasAlt ||
        isMetaDown !== hasMeta
      ) {
        display = false;
      }
    }

    useEffect(() => {
      if (!lastKey || !display) return;

      function onKeyDown(e: KeyboardEvent) {
        if (
          e.key === lastKey &&
          e.shiftKey === hasShift &&
          e.altKey === hasAlt &&
          e.ctrlKey === hasCtrl &&
          e.metaKey === hasMeta
        ) {
          setActive(true);
        }
      }

      function onKeyUp(e: KeyboardEvent) {
        if (e.key === lastKey) {
          setActive(false);
          isActive && onClick && onClick(e);
        }
      }

      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);

      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
      };
    }, [
      display,
      lastKey,
      isActive,
      onClick,
      hasShift,
      hasAlt,
      hasCtrl,
      hasMeta,
    ]);

    if (!display) return null;

    return (
      <li
        className={classNames("CommandButton", {
          highlight,
          active: isActive,
        })}
      >
        <button
          onClick={onClick}
          style={
            //@ts-ignore Setting CSS Variable
            position ? { "--command-button-position": position } : undefined
          }
        >
          {lastKey && <span className="CommandButtonHotkey">{lastKey}</span>}
          {children}
        </button>
      </li>
    );
  };
