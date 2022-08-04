import { motion, TargetAndTransition } from "framer-motion";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { EVENT_UI_READY } from "../App";
import { CommandBar } from "../components/CommandBar";
import { EmojiPicker } from "../components/EmojiPicker";
import { ListView } from "../components/ListView";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { AppStore } from "../stores/AppStore";
import { IFileEntry } from "../stores/fileSystem/IFileSystemProvider";
import { PulseLoader } from "react-spinners";
import "./FileDialog.css";
import { useFocusTrap } from "../helpers/useFocusTrap";
import { AnimationDefinition } from "framer-motion/types/render/utils/animation";

interface IProps {
  onCancel?: () => void;
  onAccept?: () => void;
}

const RENAME_COMBO = ["F2"];
const MK_DIR_COMBO = ["F7"];
const CANCEL_COMBO = ["Escape"];
const CONFIRM_COMBO = ["Enter"];

enum LoadStatus {
  LOADING = "loading",
  ERROR = "error",
  OK = "ok",
}

export const FileDialog = observer(function FileDialog({ onCancel }: IProps) {
  const [fileList, setFileList] = useState<IFileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<undefined | string[]>(
    undefined
  );
  const [status, setStatus] = useState<LoadStatus>(LoadStatus.LOADING);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EVENT_UI_READY));
  }, []);

  useCursorNavigation();

  useEffect(() => {
    console.log(selectedFiles);
  }, [selectedFiles]);

  function onAnimationComplete(definition: AnimationDefinition) {
    const def = definition as TargetAndTransition;
    if (def.y !== 0) return;
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus], input[data-focus], textarea[datafocus]"
      ) as HTMLElement;
      if (!el) return;
      el.focus();
    });
  }

  useEffect(() => {
    autorun(() => {
      const provider = Array.from(AppStore.fileSystem.providers.keys())[0];
      AppStore.fileSystem.providers
        .get(provider)
        ?.list([])
        .then(async (result) => {
          if (!result.ok) {
            console.error(result.error);
            return;
          }

          let files = await result.files;
          files = files.sort((a, b) =>
            a.fileName.localeCompare(b.fileName, undefined, {
              numeric: true,
              caseFirst: "upper",
              sensitivity: "base",
            })
          );
          files.unshift({
            fileName: "...",
            size: 0,
            dir: true,
          });
          setStatus(LoadStatus.OK);
          setFileList(files);
        })
        .catch((e) => {
          console.error(e);
          setStatus(LoadStatus.ERROR);
        });
    });
  }, []);

  const [focusTrapStart, focusTrapEnd] = useFocusTrap();

  return (
    <motion.div
      className="FileManager FileDialog Dialog sdi-app"
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
        {focusTrapStart}
        <EmojiPicker />
        {status === LoadStatus.LOADING && (
          <PulseLoader size="1em" color="currentcolor" />
        )}
        {status === LoadStatus.OK && (
          <ListView.List
            multiple
            value={selectedFiles}
            onChange={(e) => setSelectedFiles(e.detail.value)}
          >
            {fileList.map((file) => (
              <ListView.Item key={file.fileName} value={file.fileName}>
                {file.fileName}
              </ListView.Item>
            ))}
          </ListView.List>
        )}
        <input type="text" data-focus />
        {focusTrapEnd}
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
          combo={MK_DIR_COMBO}
          position={7}
          showOnlyWhenModifiersActive
        >
          MkDir
        </CommandBar.Button>
        <CommandBar.Button
          combo={CANCEL_COMBO}
          position={9}
          showOnlyWhenModifiersActive
          onClick={onCancel}
        >
          Cancel
        </CommandBar.Button>
        <CommandBar.Button
          combo={CONFIRM_COMBO}
          position={10}
          showOnlyWhenModifiersActive
        >
          Save
        </CommandBar.Button>
      </CommandBar.Nav>
    </motion.div>
  );
});
FileDialog.displayName = "FileDialog";
