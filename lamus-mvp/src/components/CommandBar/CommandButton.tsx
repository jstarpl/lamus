import classNames from "classnames";
import { useEffect, useState, useContext } from "react";
import * as React from "react";
import { AltDown, CtrlDown, MetaDown, ShiftDown } from "./CommandBar";
import { EnterIcon } from "./EnterIcon";

import "./CommandButton.css";
import { parseCombo } from "../../helpers/combos";

const COMBO_SHORTHAND: Record<string, React.ReactNode> = {
  Escape: "Esc",
  Enter: <EnterIcon />,
  AnyEnter: <EnterIcon />,
};

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
    const { lastKey, hasShift, hasCtrl, hasAlt, hasMeta } = parseCombo(combo);
    const [isActive, setActive] = useState(false);

    const isShiftDown = useContext(ShiftDown);
    const isCtrlDown = useContext(CtrlDown);
    const isAltDown = useContext(AltDown);
    const isMetaDown = useContext(MetaDown);

    const displayLastKey = (lastKey && COMBO_SHORTHAND[lastKey]) ?? lastKey;

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

          if (onClick) e.preventDefault();
        }
      }

      function onKeyUp(e: KeyboardEvent) {
        if (e.key === lastKey) {
          if (isActive && onClick) {
            onClick(e);
            e.preventDefault();
          }
          setActive(false);
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
          tabIndex={-1}
          role="menuitem"
        >
          {lastKey && (
            <span className="CommandButtonHotkey">{displayLastKey}</span>
          )}
          {children}
        </button>
      </li>
    );
  };
