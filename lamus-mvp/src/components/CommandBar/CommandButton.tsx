import classNames from "classnames";
import * as React from "react";

interface IProps {
  combo?: string[];
  highlight?: boolean;
  showOnlyWhenModifiersActive?: boolean;
  position?: number;
  onClick?: (e: React.SyntheticEvent<HTMLButtonElement, UIEvent>) => void;
}

export const CommandButton: React.FC<React.PropsWithChildren<IProps>> =
  function CommandButton({ combo, highlight, children, position, onClick }) {
    return (
      <li
        className={classNames("CommandButton", {
          highlight,
        })}
      >
        <button
          onClick={onClick}
          style={
            //@ts-ignore Setting CSS Variable
            position ? { "--command-button-position": position } : undefined
          }
        >
          {combo && (
            <span className="CommandButtonHotkey">
              {combo[combo.length - 1]}
            </span>
          )}
          {children}
        </button>
      </li>
    );
  };
