import { motion } from "framer-motion";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { EVENT_UI_READY } from "../App";
import { CommandBar } from "../components/CommandBar";
import { EmojiPicker } from "../components/EmojiPicker";

interface IProps {
  onCancel?: () => void;
  onAccept?: () => void;
}

const CANCEL_COMBO = ["Escape"];
const RENAME_COMBO = ["F2"];

export const FileDialog = observer(function FileDialog({ onCancel }: IProps) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EVENT_UI_READY));
  }, []);

  function onAnimationComplete() {
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus]"
      ) as HTMLElement;
      if (!el) return;
      el.focus();
    });
  }

  return (
    <motion.div
      className="FileManager FileDialog sdi-app"
      exit={{ zIndex: 99 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="dialog__backdrop dialog__backdrop--full-screen-dialog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, zIndex: 98 }}
        transition={{ duration: 0.5 }}
      ></motion.div>
      <motion.div
        className="Document sdi-app-workspace bg-files"
        initial={{ y: "-100%", opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-100%", opacity: 1, zIndex: 99 }}
        transition={{ duration: 0.5 }}
        onAnimationComplete={onAnimationComplete}
      >
        <EmojiPicker />
      </motion.div>
      <CommandBar.Nav>
        <CommandBar.Button
          combo={RENAME_COMBO}
          position={2}
          showOnlyWhenModifiersActive
        >
          Rename
        </CommandBar.Button>
        <CommandBar.Button
          combo={CANCEL_COMBO}
          position={10}
          showOnlyWhenModifiersActive
          onClick={onCancel}
        >
          Cancel
        </CommandBar.Button>
      </CommandBar.Nav>
    </motion.div>
  );
});
FileDialog.displayName = "FileDialog";
