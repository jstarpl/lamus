import { motion } from "framer-motion";
import * as React from "react";
import { useEffect, useState } from "react";
import "./CommandBar.css";
import { useHasModalDialogsOpen } from "../../helpers/useModalDialog";

export const AltDown = React.createContext<boolean>(false);
export const CtrlDown = React.createContext<boolean>(false);
export const ShiftDown = React.createContext<boolean>(false);
export const MetaDown = React.createContext<boolean>(false);

export const CommandBar: React.FC<React.PropsWithChildren<{}>> =
  function CommandBar({ children }) {
    const [isAltDown, setAltDown] = useState(false);
    const [isCtrlDown, setCtrlDown] = useState(false);
    const [isShiftDown, setShiftDown] = useState(false);
    const [isMetaDown, setMetaDown] = useState(false);
    const hasModalDialogsOpen = useHasModalDialogsOpen();

    useEffect(() => {
      if (hasModalDialogsOpen) return;

      function onKeyDown(e: KeyboardEvent) {
        setAltDown(e.altKey);
        setCtrlDown(e.ctrlKey);
        setShiftDown(e.shiftKey);
        setMetaDown(e.metaKey);
      }
      function onKeyUp(e: KeyboardEvent) {
        setAltDown(e.altKey);
        setCtrlDown(e.ctrlKey);
        setShiftDown(e.shiftKey);
        setMetaDown(e.metaKey);
      }

      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);

      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
      };
    }, [hasModalDialogsOpen]);

    if (hasModalDialogsOpen) return null;

    return (
      <div className="CommandBar sdi-app-cmdbar">
        <AltDown.Provider value={isAltDown}>
          <CtrlDown.Provider value={isCtrlDown}>
            <ShiftDown.Provider value={isShiftDown}>
              <MetaDown.Provider value={isMetaDown}>
                <motion.menu
                  layout
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  role="menubar"
                >
                  {children}
                </motion.menu>
              </MetaDown.Provider>
            </ShiftDown.Provider>
          </CtrlDown.Provider>
        </AltDown.Provider>
      </div>
    );
  };
