import * as React from "react";
import "./CommandBar.css";

export const AltDown = React.createContext<boolean>(false);
export const CtrlDown = React.createContext<boolean>(false);
export const ShiftDown = React.createContext<boolean>(false);

export const CommandBar: React.FC<React.PropsWithChildren<{}>> =
  function CommandBar({ children }) {
    return (
      <nav className="CommandBar sdi-app-cmdbar">
        <ul>{children}</ul>
      </nav>
    );
  };
