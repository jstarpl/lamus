import { when } from "mobx";
import { observer } from "mobx-react-lite";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmojiPicker } from "src/components/EmojiPicker";
import { IFileEntry } from "src/stores/fileSystem/IFileSystemProvider";
import { CommandBar } from "../components/CommandBar";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { useKeyboardHandler } from "../helpers/useKeyboardHandler";
import {
  DialogButtonResult,
  DialogTemplates,
  useModalDialog
} from "../helpers/useModalDialog";
import {
  CHANGE_STORAGE_PRIMARY,
  CHANGE_STORAGE_SECONDARY,
  COPY_COMBO,
  DELETE_COMBO,
  EDIT_COMBO,
  MK_DIR_COMBO,
  MOVE_COMBO,
  QUIT_COMBO,
} from "../lib/commonHotkeys";
import { sleep } from "../lib/lib";
import { AppStore } from "../stores/AppStore";
import * as classNames from "./FileManager.module.css";
import FileManagerPane from "./FileManagerPane";
import { FileManagerTabs } from "./FileManagerTabs";
import { MkDirDialog } from "./MkDirDialog";
import { FileManagerPaneStore } from "./stores/FileManagerPaneStore";
import { FileManagerStore } from "./stores/FileManagerStore";
import { getLocationLabel } from "./utils";

const MENU_COMBO = ["F9"];
const SWITCH_PANE_COMBO = "Tab";
const GO_COMBO = "AnyEnter";

const FILE_MANAGER_ITEM_LEFT = "file-manager-item-left";
const FILE_MANAGER_ITEM_RIGHT = "file-manager-item-right";

const FileManager = observer(function FileManager() {
  const navigate = useNavigate();
  const modalDialog = useModalDialog();

  const keyboardHandler = useKeyboardHandler();

  function resetFragment() {
    navigate(-1);
  }

  const [isMkDirDialogOpen, setMkDirDialogOpen] = useState(false);

  const exitSignal = useMemo(() => new AbortController(), []);

  useFocusSoundEffect("input,button,.list-view,.list-view-item");

  const onInitialize = useCallback(() => {
    AppStore.setUIReady();
  }, []);

  useEffect(() => {
    const dispose = when(
      () => Array.from(AppStore.fileSystem.providers.keys())[0] !== undefined,
      () => {
        const providerId = Array.from(AppStore.fileSystem.providers.keys())[0];

        if (FileManagerStore.leftPane.location === null) {
          FileManagerStore.leftPane.location = {
            providerId,
            path: [],
          };
        }

        if (FileManagerStore.rightPane.location === null) {
          FileManagerStore.rightPane.location = {
            providerId,
            path: [],
          };
        }
      }
    );

    onInitialize();

    return () => {
      dispose();
    };
  }, [onInitialize]);

  useEffect(
    () =>
      when(
        () =>
          FileManagerStore.leftPane.location !== null &&
          FileManagerStore.rightPane.location !== null,
        () => {
          FileManagerStore.leftPane.refresh().catch(console.error);
          FileManagerStore.rightPane.refresh().catch(console.error);
        }
      ),
    []
  );

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const hasDialogOpen =
    isMkDirDialogOpen || FileManagerStore.leftPane.isChangingStorage || FileManagerStore.rightPane.isChangingStorage;

  useEffect(() => {
    if (!keyboardHandler) return;

    function focusFrom(className: string) {
      const lastLeftFocus = document.querySelector<HTMLElement>(
        `.${className}[data-last-focus]`
      );
      if (lastLeftFocus) {
        lastLeftFocus.focus();
        return;
      }
      const defaultLeftFocus = document.querySelector<HTMLElement>(
        `.${className}[data-focus-initial]`
      );
      if (defaultLeftFocus) {
        defaultLeftFocus.focus();
      }
      return;
    }

    async function onTab(e: KeyboardEvent) {
      if (e.repeat) return;
      if (!(e.target instanceof HTMLElement)) return;

      if (e.target.classList.contains(FILE_MANAGER_ITEM_LEFT)) {
        FileManagerStore.setDisplayFocus("right");
        await sleep(10);
        focusFrom(FILE_MANAGER_ITEM_RIGHT);
      } else {
        FileManagerStore.setDisplayFocus("left");
        await sleep(10);
        focusFrom(FILE_MANAGER_ITEM_LEFT);
      }
    }

    keyboardHandler.bind(SWITCH_PANE_COMBO, onTab, {
      exclusive: true,
    });

    return () => {
      keyboardHandler.unbind(SWITCH_PANE_COMBO, onTab);
    };
  }, [keyboardHandler]);

  const createStorageChangeHandler = (pane: FileManagerPaneStore) => {
    return () => {
      pane.setChangingStorage(true);
    };
  };

  const onStorageChangeLeft = createStorageChangeHandler(
    FileManagerStore.leftPane
  );
  const onStorageChangeRight = createStorageChangeHandler(
    FileManagerStore.rightPane
  );

  const createNavigationHandler = (pane: FileManagerPaneStore) => {
    return (e: React.MouseEvent<HTMLButtonElement>) => {
      const pathStr = e.currentTarget.dataset["path"];
      if (!pathStr || !pane.location) return;
      let path = [];
      try {
        path = JSON.parse(pathStr) ?? [];
      } catch (e) {
        // noop
      }
      pane.setLocation({
        providerId: pane.location.providerId,
        path,
      });
    };
  };

  useEffect(() => {
    if (!keyboardHandler) return;

    async function onGo(e: KeyboardEvent) {
      if (e.repeat) return;
      if (!(e.target instanceof HTMLElement)) return;

      const pane =
        FileManagerStore.displayFocus === "left"
          ? FileManagerStore.leftPane
          : FileManagerStore.rightPane;
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLLIElement)) return;

      const guid = activeElement.dataset["guid"];
      if (!guid) return;

      const focusedItem = pane.items.find((item) => item.guid === guid);
      if (focusedItem?.dir) {
        if (!pane.location) return;
        if (focusedItem.parentDir) {
          const newPath = pane.location.path.slice();
          newPath.pop();
          return pane.setLocation({
            providerId: pane.location.providerId,
            path: newPath,
          });
        } else {
          return pane.setLocation({
            providerId: pane.location.providerId,
            path: [...pane.location.path, focusedItem.fileName],
          });
        }
      }
    }

    keyboardHandler.bind(GO_COMBO, onGo, {
      exclusive: true,
      preventDefaultDown: false,
      preventDefaultPartials: false,
    });

    return () => {
      keyboardHandler.unbind(GO_COMBO, onGo);
    };
  }, [keyboardHandler]);

  const createFileEntryDblClickHandler = (pane: FileManagerPaneStore) => {
    return (e: React.MouseEvent<HTMLLIElement>) => {
      const guid = e.currentTarget.dataset["guid"];
      if (!guid) return;
      const item = pane.items.find((item) => item.guid === guid);
      if (!item) return;
      if (item.parentDir && pane.location) {
        const newPath = pane.location.path;
        newPath.pop();
        pane.setLocation({
          providerId: pane.location.providerId,
          path: newPath,
        });
      } else if (item.dir && pane.location) {
        const newPath = pane.location.path;
        newPath.push(item.fileName);
        pane.setLocation({
          providerId: pane.location.providerId,
          path: newPath,
        });
      }
    };
  };

  const onNavigateLeft = createNavigationHandler(FileManagerStore.leftPane);
  const onNavigateRight = createNavigationHandler(FileManagerStore.rightPane);

  const onFileEntryDblClickLeft = createFileEntryDblClickHandler(
    FileManagerStore.leftPane
  );
  const onFileEntryDblClickRight = createFileEntryDblClickHandler(
    FileManagerStore.rightPane
  );

  const createFocusHadler = (focus: "left" | "right") => {
    return () => {
      FileManagerStore.setDisplayFocus(focus);
    };
  };

  const onFocusLeft = createFocusHadler("left");
  const onFocusRight = createFocusHadler("right");

  async function onCreateNewDir(newDirName: string) {
    setMkDirDialogOpen(false);

    const pane =
      FileManagerStore.displayFocus === "left"
        ? FileManagerStore.leftPane
        : FileManagerStore.rightPane;

    if (!pane.location?.providerId) return;
    const provider = AppStore.fileSystem.providers.get(
      pane.location.providerId
    );
    if (!provider) return;
    pane.makeBusy();

    await 
    provider
      .mkdir(pane.location.path, newDirName)
    await pane.refresh()

    const newDirObj = pane.items.find(
      (item) => item.fileName === newDirName
    );

    await sleep(100);

    if (!newDirObj) return;
    const el = document.querySelector(`[data-guid="${newDirObj.guid}"]`);
    if (!el || !(el instanceof HTMLElement)) return;
    el.focus();
  }

  function onMkDirBegin() {
    setMkDirDialogOpen(true);
  }

  function onCloseMkDirDialog() {
    setMkDirDialogOpen(false);
  }

  async function onDeleteBegin() {
    const pane =
      FileManagerStore.displayFocus === "left"
        ? FileManagerStore.leftPane
        : FileManagerStore.rightPane;

    if (!pane.location?.providerId) return;
    const provider = AppStore.fileSystem.providers.get(
      pane.location.providerId
    );
    if (!provider) return;

    const selectedGuid = pane.selectedFiles.values().next().value;
    if (!selectedGuid) return;

    const currentPath = pane.location?.path;
    if (!currentPath) return;

    const item = pane.items.find((item) => item.guid === selectedGuid);
    const fileName = item?.fileName;

    if (!fileName) return;

    const dialogResult = await modalDialog
      .showDialog(
        DialogTemplates.deleteObject(
          fileName,
          item.dir === true ? "directory" : "file"
        ),
        {
          signal: exitSignal.signal,
        }
      )

    if (dialogResult.result === DialogButtonResult.NO) return;

    pane.makeBusy();

    try {
      const res = await provider.unlink(currentPath, fileName);
      if (!res.ok) console.error(res);
      await pane.refresh();
    } catch (e) {
      console.error(e);
      await pane.refresh();
    }
  }

  async function onCopyBegin() {
    const [sourcePane, targetPane] =
      FileManagerStore.displayFocus === "left"
        ? [FileManagerStore.leftPane, FileManagerStore.rightPane]
        : [FileManagerStore.rightPane, FileManagerStore.leftPane];

    if (!sourcePane.location?.providerId || !targetPane.location?.providerId)
      return;

    const itemCount = sourcePane.selectedFiles.size;

    const firstGuid = Array.from(sourcePane.selectedFiles.values())[0]

    const item = sourcePane.items.find((item) => item.guid === firstGuid);
    if (!item) return;

    const objectName = item.fileName;

    const dialogResult = await modalDialog.showDialog(
      DialogTemplates.copyMultipleObjects(
        objectName,
        itemCount,
        getLocationLabel(targetPane.location) ?? null
      )
    );

    if (dialogResult.result === DialogButtonResult.NO) return

    targetPane.makeBusy();

    const initialEntries: IFileEntry[] = []
    for (const selectedGuid of sourcePane.selectedFiles) {
      const selectedEntry = sourcePane.items.find(
        (item) => item.guid === selectedGuid
      );
      if (!selectedEntry || selectedEntry.virtual) continue;
      initialEntries.push(selectedEntry)
    }

    const opSet = await FileManagerStore.createCopyOperationSet(sourcePane.location.providerId, sourcePane.location.path, initialEntries, targetPane.location.providerId, targetPane.location.path)
    for (const operation of opSet) {
      await FileManagerStore.executeOperation(operation)
    }

    await targetPane.refresh();

    let el: HTMLElement | null = null;

    const copiedFile = targetPane.items.find(
      (item) => item.fileName === initialEntries[0].fileName
    );

    await sleep(100);

    if (!copiedFile) return;
    el = document.querySelector(`[data-guid="${copiedFile.guid}"]`);
    if (!el || !(el instanceof HTMLElement)) return;
    el.focus();
  }

  useEffect(() => {
    return () => {
      exitSignal.abort();
    };
  }, [exitSignal]);

  useEffect(() => {
    const pane =
      FileManagerStore.displayFocus === "left"
        ? FileManagerStore.leftPane
        : FileManagerStore.rightPane;

    function onKeyDown(evt: KeyboardEvent) {
      if (
        evt.key === "r" &&
        evt.ctrlKey === true &&
        evt.altKey === false &&
        evt.shiftKey === false &&
        evt.metaKey === false
      ) {
        if (!evt.repeat) pane.refresh();
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
  }, [FileManagerStore.displayFocus]);

  return (
    <div className={`sdi-app`}>
      <div className={`${classNames.Document} sdi-app-workspace bg-files`}>
        <FileManagerTabs className={classNames.PaneTabs} />
        <div className={classNames.DualPanes}>
          <FileManagerPane
            className={`${classNames.PaneLeft}  ${
              FileManagerStore.displayFocus === "left"
                ? classNames.PaneFocus
                : ""
            }`}
            itemClassName={FILE_MANAGER_ITEM_LEFT}
            pane={FileManagerStore.leftPane}
            onFileEntryDoubleClick={onFileEntryDblClickLeft}
            onGoToPath={onNavigateLeft}
            onFocus={onFocusLeft}
          />
          <FileManagerPane
            className={`${classNames.PaneRight} ${
              FileManagerStore.displayFocus === "right"
                ? classNames.PaneFocus
                : ""
            }`}
            pane={FileManagerStore.rightPane}
            itemClassName={FILE_MANAGER_ITEM_RIGHT}
            onFileEntryDoubleClick={onFileEntryDblClickRight}
            onGoToPath={onNavigateRight}
            onFocus={onFocusRight}
          />
        </div>
      </div>
      <EmojiPicker />
      <MkDirDialog
        show={isMkDirDialogOpen}
        label="Create a new Directory"
        onDismiss={onCloseMkDirDialog}
        onAccept={onCreateNewDir}
      />
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
          <CommandBar.Button
            combo={CHANGE_STORAGE_PRIMARY}
            position={1}
            showOnlyWhenModifiersActive
            onClick={onStorageChangeLeft}
          >
            Storage
          </CommandBar.Button>
          <CommandBar.Button
            combo={CHANGE_STORAGE_SECONDARY}
            position={2}
            showOnlyWhenModifiersActive
            onClick={onStorageChangeRight}
          >
            Storage
          </CommandBar.Button>
          <CommandBar.Button
            combo={EDIT_COMBO}
            position={4}
            showOnlyWhenModifiersActive
          >
            Edit
          </CommandBar.Button>
          <CommandBar.Button
            combo={COPY_COMBO}
            position={5}
            showOnlyWhenModifiersActive
            onClick={onCopyBegin}
          >
            Copy
          </CommandBar.Button>
          <CommandBar.Button
            combo={MOVE_COMBO}
            position={6}
            showOnlyWhenModifiersActive
          >
            RnMov
          </CommandBar.Button>
          <CommandBar.Button
            combo={MK_DIR_COMBO}
            position={7}
            showOnlyWhenModifiersActive
            onClick={onMkDirBegin}
          >
            MkDir
          </CommandBar.Button>
          <CommandBar.Button
            combo={DELETE_COMBO}
            position={8}
            showOnlyWhenModifiersActive
            onClick={onDeleteBegin}
          >
            Delete
          </CommandBar.Button>
          <CommandBar.Button
            combo={MENU_COMBO}
            position={9}
            showOnlyWhenModifiersActive
          >
            Menu
          </CommandBar.Button>
          <CommandBar.Button
            combo={QUIT_COMBO}
            position={10}
            onClick={onQuit}
            showOnlyWhenModifiersActive
          >
            Quit
          </CommandBar.Button>
        </CommandBar.Nav>
      )}
    </div>
  );
});

FileManager.displayName = "FileManager";

export default FileManager;
