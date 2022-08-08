import { motion, TargetAndTransition } from "framer-motion";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { CommandBar } from "../components/CommandBar";
import { EmojiPicker } from "../components/EmojiPicker";
import { ListView } from "../components/ListView";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { AppStore } from "../stores/AppStore";
import { PulseLoader } from "react-spinners";
import "./FileDialog.css";
import { useFocusTrap } from "../helpers/useFocusTrap";
import { AnimationDefinition } from "framer-motion/types/render/utils/animation";
import { FileListItem } from "./FileListItem";
import { IFileEntryEx } from "./FileList";
import { v4 as uuidv4 } from "uuid";
import { ListViewChangeEvent } from "../components/ListView/ListViewList";
import { Path } from "../stores/fileSystem/IFileSystemProvider";
import { ProviderId } from "../stores/FileSystemStore";
import { BreadcrumbBar } from "../components/BreadcrumbBar";
import { usePreventTabHijack } from "../helpers/usePreventTabHijack";

interface IProps {
  defaultFileName?: string;
  initialStorageProvider?: ProviderId;
  initialPath?: Path;
  scoped?: boolean;
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

export const FileDialog = observer(function FileDialog({
  defaultFileName,
  initialStorageProvider,
  initialPath,
  onAccept,
  onCancel,
}: IProps) {
  const [fileList, setFileList] = useState<IFileEntryEx[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<undefined | string[]>(
    undefined
  );
  const [currentStorage, setCurrentStorage] = useState<undefined | ProviderId>(
    initialStorageProvider ?? undefined
  );
  const [currentPath, setCurrentPath] = useState<string[]>(initialPath ?? []);
  const [status, setStatus] = useState<LoadStatus>(LoadStatus.LOADING);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isDirSelected, setDirSelected] = useState(false);
  const [isListFocused, setListFocused] = useState(false);
  const [isPathFocused, setPathFocused] = useState(false);

  useCursorNavigation();
  usePreventTabHijack();

  function onAnimationComplete(definition: AnimationDefinition) {
    const def = definition as TargetAndTransition;
    if (def.y !== 0) return;
    setAnimationFinished(true);
  }

  const viewReady = animationFinished && status === LoadStatus.OK;

  useLayoutEffect(() => {
    setTimeout(() => {
      const el = document.querySelector(
        ".btn[data-focus], button[data-focus], input[data-focus], textarea[datafocus]"
      ) as HTMLElement;
      if (!el) return;
      el.focus();
    });
  }, [viewReady]);

  useEffect(
    () =>
      autorun(() => {
        const providerId = Array.from(AppStore.fileSystem.providers.keys())[0];
        setCurrentStorage(providerId);
      }),
    []
  );

  useEffect(
    () =>
      autorun(() => {
        if (!currentStorage) return;
        const provider = AppStore.fileSystem.providers.get(currentStorage);

        if (!provider) {
          setStatus(LoadStatus.ERROR);
          return;
        }

        setStatus(LoadStatus.LOADING);
        provider
          .list(currentPath)
          .then(async (result) => {
            if (!result.ok) {
              console.error(result.error);
              return;
            }

            let files = (await result.files).map<IFileEntryEx>((file) => ({
              ...file,
              guid: uuidv4(),
            }));
            files = files.sort((a, b) =>
              a.fileName.localeCompare(b.fileName, undefined, {
                numeric: true,
                caseFirst: "upper",
                sensitivity: "base",
              })
            );
            if (currentPath.length > 0) {
              files.unshift({
                guid: uuidv4(),
                fileName: "...",
                size: 0,
                dir: true,
                parentDir: true,
              });
            }
            setStatus(LoadStatus.OK);
            setFileList(files);
          })
          .catch((e) => {
            console.error(e);
            setStatus(LoadStatus.ERROR);
          });
      }),
    [currentStorage, currentPath]
  );

  function onListChange(e: ListViewChangeEvent) {
    setSelectedFiles(e.detail.value);

    const selectedItem = e.detail.value[0];
    if (!selectedItem) return;

    const item = fileList.find((item) => item.guid === selectedItem);
    if (!item) return;

    setDirSelected(!!item.dir);
  }

  function onGoToSelectedFolder() {
    const selectedGuid = selectedFiles?.[0];
    const selectedFolder = fileList.find(
      (item) => item.guid === selectedGuid && item.dir
    );

    if (!selectedFolder) return;

    if (selectedFolder.parentDir) {
      const newPath = currentPath.slice();
      newPath.pop();
      setCurrentPath(newPath);
    } else {
      setCurrentPath([...currentPath, selectedFolder.fileName]);
    }
  }

  function onGoToPath(e: React.MouseEvent<HTMLElement>) {
    const pathStr = e.currentTarget.dataset["path"];
    if (!pathStr) return;
    const path = JSON.parse(pathStr);
    setCurrentPath(path);
  }

  const [focusTrapStart, focusTrapEnd] = useFocusTrap();

  return (
    <motion.div
      className="FileManager FileDialog Dialog sdi-app"
      data-open
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
        initial={{ y: "-110%", opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-110%", opacity: 1, zIndex: 99 }}
        transition={{ duration: 0.5 }}
        onAnimationComplete={onAnimationComplete}
      >
        {focusTrapStart}
        <div className="FileDialog__layout">
          <div className="FileDialog__path">
            {currentStorage && (
              <BreadcrumbBar.Bar
                onFocus={() => setPathFocused(true)}
                onBlur={() => setPathFocused(false)}
              >
                <BreadcrumbBar.Crumb
                  data-path={JSON.stringify([])}
                  onClick={onGoToPath}
                >
                  {AppStore.fileSystem.providers.get(currentStorage)?.name}
                </BreadcrumbBar.Crumb>
                <BreadcrumbBar.Separator />
                {currentPath.map((pathSegment, index, array) => (
                  <BreadcrumbBar.Crumb
                    key={`${index}_${pathSegment}`}
                    data-path={JSON.stringify(array.slice(0, index + 1))}
                    onClick={onGoToPath}
                  >
                    {pathSegment}
                  </BreadcrumbBar.Crumb>
                ))}
              </BreadcrumbBar.Bar>
            )}
          </div>
          <div className="FileDialog__pane">
            {status === LoadStatus.LOADING && (
              <div className="Spinner">
                <PulseLoader size="1em" color="currentcolor" />
              </div>
            )}
            {status === LoadStatus.OK && (
              <ListView.List
                multiple
                value={selectedFiles}
                onChange={onListChange}
                onFocus={() => setListFocused(true)}
                onBlur={() => setListFocused(false)}
              >
                {fileList.map((file) => (
                  <ListView.Item key={file.guid} value={file.guid}>
                    <FileListItem file={file} />
                  </ListView.Item>
                ))}
              </ListView.List>
            )}
          </div>
          {status === LoadStatus.OK && (
            <div className="FileDialog__fileNameInput">
              <input
                type="text"
                data-focus
                className="form-control"
                placeholder={defaultFileName}
              />
            </div>
          )}
        </div>
        <EmojiPicker />
        {focusTrapEnd}
      </motion.div>
      <CommandBar.Nav>
        {isListFocused && (
          <CommandBar.Button
            combo={RENAME_COMBO}
            position={2}
            showOnlyWhenModifiersActive
          >
            Rename
          </CommandBar.Button>
        )}
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
        {(!isDirSelected || !isListFocused) && !isPathFocused && (
          <CommandBar.Button
            combo={CONFIRM_COMBO}
            position={10}
            showOnlyWhenModifiersActive
            onClick={onAccept}
          >
            Save
          </CommandBar.Button>
        )}
        {((isDirSelected && isListFocused) || isPathFocused) && (
          <CommandBar.Button
            combo={CONFIRM_COMBO}
            position={10}
            showOnlyWhenModifiersActive
            onClick={!isPathFocused ? onGoToSelectedFolder : undefined}
          >
            Go
          </CommandBar.Button>
        )}
      </CommandBar.Nav>
    </motion.div>
  );
});
FileDialog.displayName = "FileDialog";
