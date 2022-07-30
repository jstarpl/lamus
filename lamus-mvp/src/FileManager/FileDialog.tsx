import { motion } from "framer-motion";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EVENT_UI_READY } from "../App";
import { CommandBar } from "../components/CommandBar";
import { EmojiPicker } from "../components/EmojiPicker";

const CANCEL_COMBO = ["Escape"];
const RENAME_COMBO = ["F2"];

export const FileDialog = observer(function FileDialog(props: {}) {
  const location = useLocation();
  const navigate = useNavigate();

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

  function onCancel() {
    const params = new URLSearchParams(location.search);
    if (!params.has("clb")) {
      navigate("/");
    }

    const clb = params.get("clb") ?? "/";
    let clbSearchParams = "";
    let clbSearchStringStarts = clb.indexOf("?");
    if (clbSearchStringStarts >= 0) {
      clbSearchParams = clb.substring(clbSearchStringStarts);
    } else {
      clbSearchStringStarts = clb.length;
    }
    const navigateTo = clb.substring(0, clbSearchStringStarts);
    const searchParams = new URLSearchParams(clbSearchParams);
    searchParams.set("error", "cancelled");
    const searchParamsStr = searchParams.toString();
    navigate(navigateTo + (searchParamsStr ? "?" + searchParamsStr : ""));
  }

  return (
    <motion.div
      className="FileManager FileDialog sdi-app"
      exit={{ zIndex: 99 }}
      transition={{ duration: 0.5 }}
    >
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
