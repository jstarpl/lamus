import { TargetAndTransition } from "framer-motion";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommandBar } from "../components/CommandBar";
import { EmojiPicker } from "../components/EmojiPicker";
import { ListView } from "../components/ListView";
import { useCursorNavigation } from "../helpers/useCursorNavigation";
import { AppStore } from "../stores/AppStore";
import "./FileDialog.css";
import { useFocusTrap } from "../helpers/useFocusTrap";
import { FileListItem } from "./FileListItem";
import { IFileEntryEx } from "./FileList";
import { v4 as uuidv4 } from "uuid";
import { ListViewChangeEvent } from "../components/ListView/ListViewList";
import {
  FileName,
  Path,
  PROVIDER_SEPARATOR,
} from "../stores/fileSystem/IFileSystemProvider";
import { ProviderId } from "../stores/FileSystemStore";
import { usePreventTabHijack } from "../helpers/usePreventTabHijack";
import { SoundEffectsContext } from "../helpers/SoundEffects";
import { Spinner } from "../components/Spinner";
import { CSSTransition } from "react-transition-group";
import { SelectStorageDialog } from "./SelectStorageDialog";
import { FilePathBreadcrumbBar } from "./FilePathBreadcrumbBar";

export interface IAcceptEventProps {
  providerId: string;
  path: Path;
  fileName?: FileName;
}

interface IBaseProps {
  show: boolean;
  mode: "saveFile" | "openFile" | "selectDir";
  defaultFileName?: FileName;
  disabledRename?: boolean;
  disabledMkDir?: boolean;
  onCancel?: () => void;
  onAccept?: (props: IAcceptEventProps) => void;
}

type IProps = IBaseProps &
  (
    | {
        initialStorageProvider: ProviderId;
        initialPath: Path;
        scoped: true;
      }
    | {
        initialStorageProvider?: ProviderId;
        initialPath?: Path;
        scoped?: false;
      }
  );

const CHANGE_STORAGE = ["Control", "F1"];
const RENAME_COMBO = ["F2"];
const MK_DIR_COMBO = ["F7"];
const CANCEL_COMBO = ["Escape"];
const CONFIRM_COMBO = ["Enter"];

enum LoadStatus {
  LOADING = "loading",
  ERROR = "error",
  OK = "ok",
}

const SELECT_THIS_DIR: IFileEntryEx = {
  guid: uuidv4(),
  fileName: "Select this directory",
  size: 0,
  dir: false,
  virtual: true,
};

export const FileDialog = observer(function FileDialog({
  show,
  mode,
  defaultFileName,
  initialStorageProvider,
  initialPath,
  disabledMkDir,
  disabledRename,
  onAccept,
  onCancel,
}: IProps) {
  const [localFileName, setLocalFileName] = useState<FileName>("");
  const [fileList, setFileList] = useState<IFileEntryEx[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<undefined | FileName[]>(
    undefined
  );
  const [currentStorage, setCurrentStorage] = useState<undefined | ProviderId>(
    initialStorageProvider ?? undefined
  );
  const [currentPath, setCurrentPath] = useState<Path>(initialPath ?? []);
  const [status, setStatus] = useState<LoadStatus>(LoadStatus.LOADING);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [isDirSelected, setDirSelected] = useState(false);
  const [isListFocused, setListFocused] = useState(false);
  const [isPathFocused, setPathFocused] = useState(false);
  const [isChangeStorageDialogOpen, setChangeStorageDialogOpen] =
    useState(false);
  const [isSelectThisDirSelected, setIsSelectThisFolderSelected] =
    useState(false);
  const sfxContext = useContext(SoundEffectsContext);

  const onAcceptRef = useRef<IProps["onAccept"] | null>(onAccept);

  useEffect(() => {
    setChangeStorageDialogOpen(false);
    setIsSelectThisFolderSelected(false);
  }, [show]);

  useEffect(() => {
    onAcceptRef.current = onAccept;

    return () => {
      onAcceptRef.current = null;
    };
  }, [onAccept]);

  const dialogRef = useRef<HTMLDivElement>(null);

  useCursorNavigation(undefined, show);
  usePreventTabHijack(show);

  function onAnimationComplete() {
    setAnimationFinished(true);

    if (!sfxContext) return;
    sfxContext.playEffect(11);
  }

  const viewReady = animationFinished && status === LoadStatus.OK;

  const showFileNameInput = mode === "saveFile";
  const isSelectingDirectory = mode === "selectDir";
  const disableFileSelection = isSelectingDirectory;

  useLayoutEffect(() => {
    if (viewReady === false) return;

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
        if (initialStorageProvider) return;
        const providerId = Array.from(AppStore.fileSystem.providers.keys())[0];
        setCurrentStorage(providerId);
      }),
    [initialStorageProvider]
  );

  const refreshList = useCallback(() => {
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
        files = files.sort(fileComparator);
        if (isSelectingDirectory) {
          files.unshift(SELECT_THIS_DIR);
        }
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
  }, [isSelectingDirectory, currentStorage, currentPath]);

  useEffect(() => {
    if (!show) return;

    function onKeyDown(evt: KeyboardEvent) {
      if (
        evt.key === "r" &&
        evt.ctrlKey === true &&
        evt.altKey === false &&
        evt.shiftKey === false &&
        evt.metaKey === false
      ) {
        if (!evt.repeat) refreshList();
        evt.preventDefault();
        evt.stopPropagation();
      }
    }

    window.addEventListener("keydown", onKeyDown, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [refreshList, show]);

  useEffect(
    () =>
      autorun(() => {
        refreshList();
      }),
    [refreshList]
  );

  const onListChange = useCallback(
    function (e: ListViewChangeEvent) {
      setSelectedFiles(e.detail.value);

      const selectedItem = e.detail.value[0];
      if (!selectedItem) return;

      const item = fileList.find((item) => item.guid === selectedItem);
      if (!item) return;

      setDirSelected(!!item.dir);
      setIsSelectThisFolderSelected(item.guid === SELECT_THIS_DIR.guid);
    },
    [fileList]
  );

  const onFocus = useCallback(function onFocus() {
    setListFocused(true);
  }, []);

  const onBlur = useCallback(function onBlur() {
    setListFocused(false);
  }, []);

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

  const onFileEntryDoubleClick = useCallback(
    function onFileEntryDoubleClick(e: React.MouseEvent<HTMLElement>) {
      const onAcceptNow = onAcceptRef.current;
      if (!currentStorage) return;
      const guid = e.currentTarget.dataset["guid"];
      if (!guid) return;
      const clickedEntry = fileList.find((entry) => entry.guid === guid);
      if (!clickedEntry) return;

      const fileName = clickedEntry?.fileName;

      if (isSelectingDirectory && isSelectThisDirSelected) {
        if (!onAcceptNow) return;
        onAcceptNow({
          providerId: currentStorage,
          path: currentPath,
          fileName,
        });
      }
      if (!isSelectingDirectory && !clickedEntry.dir) {
        if (!onAcceptNow) return;
        onAcceptNow({
          providerId: currentStorage,
          path: currentPath,
          fileName: clickedEntry.fileName,
        });
      }
      if (clickedEntry.dir) {
        if (clickedEntry.parentDir) {
          const newPath = currentPath.slice();
          newPath.pop();
          setCurrentPath(newPath);
        } else {
          setCurrentPath([...currentPath, clickedEntry.fileName]);
        }
      }
    },
    [
      currentPath,
      fileList,
      currentStorage,
      isSelectThisDirSelected,
      isSelectingDirectory,
    ]
  );

  function onAcceptInner() {
    if (!onAccept) return;
    if (!currentStorage) return;

    const selectedGuid = selectedFiles?.[0];
    const item = fileList.find((item) => item.guid === selectedGuid);
    const fileName =
      (isListFocused && !isDirSelected ? item?.fileName : localFileName) ||
      defaultFileName;

    onAccept({
      providerId: currentStorage,
      path: currentPath,
      fileName,
    });
  }

  function onOpenChangeStorageDialog() {
    setChangeStorageDialogOpen(true);
  }

  function onCloseChangeStorageDialog() {
    setChangeStorageDialogOpen(false);
  }

  function onChangeStorage(storageId: ProviderId) {
    setChangeStorageDialogOpen(false);
    if (storageId === currentStorage) return;
    setCurrentStorage(storageId);
    setCurrentPath([]);
  }

  function onStorageProviderCrumbContextMenu(
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.preventDefault();
    onOpenChangeStorageDialog();
  }

  const { FocusTrapStart, FocusTrapEnd } = useFocusTrap();

  const canGo = (isDirSelected && isListFocused) || isPathFocused;
  const canSave =
    mode === "saveFile" && (!isDirSelected || !isListFocused) && !isPathFocused;
  const canOpen = mode === "openFile" && !isDirSelected && !isPathFocused;
  const canSelectThisDir = isSelectThisDirSelected && !canGo;

  const listViewItems = useMemo(() => {
    let foundFirstNotParentDir = false;
    return fileList.map((file) => {
      let focusThisOneAfterLoad: boolean | undefined = undefined;
      if (
        (!file.parentDir && !foundFirstNotParentDir) ||
        fileList.length === 1
      ) {
        foundFirstNotParentDir = true;
        focusThisOneAfterLoad = true;
      }
      return (
        <ListView.Item
          key={file.guid}
          value={file.guid}
          data-guid={file.guid}
          data-focus-initial={focusThisOneAfterLoad}
          onDoubleClick={onFileEntryDoubleClick}
        >
          <FileListItem
            file={file}
            disabled={
              disableFileSelection &&
              !file.dir &&
              file.guid !== SELECT_THIS_DIR.guid
            }
          />
        </ListView.Item>
      );
    });
  }, [fileList, onFileEntryDoubleClick, disableFileSelection]);

  useLayoutEffect(() => {
    if (status !== LoadStatus.OK) return;

    const timeout = setTimeout(() => {
      const elementToFocus = document.querySelector(
        ".FileDialog__pane [data-focus-initial]"
      );
      if (!elementToFocus || !(elementToFocus instanceof HTMLElement)) return;
      elementToFocus.scrollIntoView();
      elementToFocus.focus();
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [status]);

  const isAnyDialogOpen = isChangeStorageDialogOpen;

  return (
    <>
      <CSSTransition
        nodeRef={dialogRef}
        in={show}
        timeout={600}
        mountOnEnter
        unmountOnExit
        className="FileManager FileDialog Dialog sdi-app"
        onEntered={onAnimationComplete}
      >
        <div data-open ref={dialogRef}>
          <div className="dialog__backdrop dialog__backdrop--full-screen-dialog"></div>
          <div className="Document sdi-app-workspace bg-files">
            <FocusTrapStart />
            <div className="FileDialog__layout">
              <div className="FileDialog__path">
                {currentStorage && (
                  <FilePathBreadcrumbBar
                    currentStorageName={
                      AppStore.fileSystem.providers.get(currentStorage)?.name
                    }
                    currentPath={currentPath}
                    onGoToPath={onGoToPath}
                    onStorageContextMenu={onStorageProviderCrumbContextMenu}
                    onFocus={() => setPathFocused(true)}
                    onBlur={() => setPathFocused(false)}
                  />
                )}
              </div>
              <div className="FileDialog__pane">
                {status === LoadStatus.LOADING && <Spinner />}
                {status === LoadStatus.OK && (
                  <ListView.List
                    multiple
                    value={selectedFiles}
                    onChange={onListChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    {listViewItems}
                  </ListView.List>
                )}
              </div>
              {showFileNameInput && status === LoadStatus.OK && (
                <form
                  className="FileDialog__fileNameInput"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onAcceptInner();
                  }}
                >
                  <input
                    type="text"
                    data-focus
                    className="form-control"
                    value={localFileName}
                    placeholder={defaultFileName}
                    onChange={(e) => setLocalFileName(e.target.value)}
                  />
                </form>
              )}
            </div>
            <EmojiPicker />
            <SelectStorageDialog
              show={show && isChangeStorageDialogOpen}
              currentStorage={currentStorage}
              label="Select storage:"
              onChangeStorage={onChangeStorage}
              onDismiss={onCloseChangeStorageDialog}
            />
            <FocusTrapEnd />
          </div>
          {!isAnyDialogOpen && (
            <CommandBar.Nav>
              <CommandBar.Button
                combo={CHANGE_STORAGE}
                position={1}
                showOnlyWhenModifiersActive
                onClick={onOpenChangeStorageDialog}
              >
                Storage
              </CommandBar.Button>
              {!disabledRename && isListFocused && (
                <CommandBar.Button
                  combo={RENAME_COMBO}
                  position={2}
                  showOnlyWhenModifiersActive
                >
                  Rename
                </CommandBar.Button>
              )}
              {!disabledMkDir && (
                <CommandBar.Button
                  combo={MK_DIR_COMBO}
                  position={7}
                  showOnlyWhenModifiersActive
                  onClick={() => {}}
                >
                  MkDir
                </CommandBar.Button>
              )}
              <CommandBar.Button
                combo={CANCEL_COMBO}
                position={9}
                showOnlyWhenModifiersActive
                onClick={onCancel}
              >
                Cancel
              </CommandBar.Button>
              {canSave && (
                <CommandBar.Button
                  combo={CONFIRM_COMBO}
                  position={10}
                  showOnlyWhenModifiersActive
                  onClick={onAcceptInner}
                >
                  Save
                </CommandBar.Button>
              )}
              {canOpen && (
                <CommandBar.Button
                  combo={CONFIRM_COMBO}
                  position={10}
                  showOnlyWhenModifiersActive
                  onClick={onAcceptInner}
                >
                  Open
                </CommandBar.Button>
              )}
              {canSelectThisDir && (
                <CommandBar.Button
                  combo={CONFIRM_COMBO}
                  position={10}
                  showOnlyWhenModifiersActive
                  onClick={onAcceptInner}
                >
                  Select
                </CommandBar.Button>
              )}
              {canGo && (
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
          )}
        </div>
      </CSSTransition>
    </>
  );
});
FileDialog.displayName = "FileDialog";

function fileComparator(a: IFileEntryEx, b: IFileEntryEx): number {
  if (a.dir !== b.dir) {
    if (a.dir) return -1;
    return 1;
  }
  if (a.virtual !== b.virtual) {
    if (a.virtual) return -1;
    return 1;
  }
  return a.fileName.localeCompare(b.fileName, undefined, {
    numeric: true,
    caseFirst: "upper",
    sensitivity: "base",
  });
}
