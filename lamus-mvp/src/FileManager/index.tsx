import React, { useCallback, useEffect, useMemo } from "react";
import { when } from "mobx";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { useModalDialog } from "../helpers/useModalDialog";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { AppStore } from "../stores/AppStore";
import { CommandBar } from "../components/CommandBar";
import {
  COPY_COMBO,
  DELETE_COMBO,
  EDIT_COMBO,
  MK_DIR_COMBO,
  MOVE_COMBO,
  QUIT_COMBO,
} from "../lib/commonHotkeys";
import { FileManagerStore } from "./stores/FileManagerStore";
import FileManagerPane from "./FileManagerPane";
import * as classNames from "./FileManager.module.css";
import { serializePath } from "../lib/fsUtils";
import { useKeyboardHandler } from "../helpers/useKeyboardHandler";
import { FileSystemLocation } from "../stores/FileSystemStore";
import {
  PROVIDER_SEPARATOR,
  FILE_PATH_SEPARATOR,
} from "../stores/fileSystem/IFileSystemProvider";
import { sleep } from "../lib/lib";

const MENU_COMBO = ["F9"];
const SWITCH_PANE_COMBO = "Tab";

const FILE_MANAGER_ITEM_LEFT = "file-manager-item-left";
const FILE_MANAGER_ITEM_RIGHT = "file-manager-item-right";

function getLocationLabel(location: FileSystemLocation | null): string | null {
  if (!location) return null;

  if (location.path.length === 0) {
    const provider = AppStore.fileSystem.providers.get(location.providerId);
    if (!provider) return "(unknown)";
    return `${provider.name}${PROVIDER_SEPARATOR}`;
  }

  return location.path[location.path.length - 1];
}

const FileManager = observer(function FileManager() {
  const navigate = useNavigate();
  const { showDialog } = useModalDialog();

  const keyboardHandler = useKeyboardHandler();

  function resetFragment() {
    navigate(-1);
  }

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

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const hasDialogOpen = false;

  const leftPaneLocation = getLocationLabel(FileManagerStore.leftPane.location);

  const rightPaneLocation = getLocationLabel(
    FileManagerStore.rightPane.location
  );

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

  const onChangePane = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!(e.target instanceof HTMLButtonElement)) return;
    if (
      e.target.dataset["pane"] !== "left" &&
      e.target.dataset["pane"] !== "right"
    )
      return;

    FileManagerStore.setDisplayFocus(e.target.dataset["pane"]);
  };

  return (
    <div className={`sdi-app`}>
      <div className={`${classNames.Document} sdi-app-workspace bg-files`}>
        <div className={classNames.PaneTabs}>
          <button
            className={
              FileManagerStore.displayFocus === "left"
                ? classNames.PaneTabSelected
                : classNames.PaneTab
            }
            data-pane="left"
            onClick={onChangePane}
          >
            {leftPaneLocation}
          </button>
          <button
            className={
              FileManagerStore.displayFocus === "right"
                ? classNames.PaneTabSelected
                : classNames.PaneTab
            }
            data-pane="right"
            onClick={onChangePane}
          >
            {rightPaneLocation}
          </button>
        </div>
        <div className={classNames.DualPanes}>
          <FileManagerPane
            className={`${classNames.PaneLeft}  ${
              FileManagerStore.displayFocus === "left"
                ? classNames.PaneFocus
                : ""
            }`}
            itemClassName={FILE_MANAGER_ITEM_LEFT}
            pane={FileManagerStore.leftPane}
          />
          <FileManagerPane
            className={`${classNames.PaneRight} ${
              FileManagerStore.displayFocus === "right"
                ? classNames.PaneFocus
                : ""
            }`}
            pane={FileManagerStore.rightPane}
            itemClassName={FILE_MANAGER_ITEM_RIGHT}
          />
        </div>
      </div>
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
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
          >
            MkDir
          </CommandBar.Button>
          <CommandBar.Button
            combo={DELETE_COMBO}
            position={8}
            showOnlyWhenModifiersActive
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
          <CommandBar.Button combo={QUIT_COMBO} position={10} onClick={onQuit}>
            Quit
          </CommandBar.Button>
        </CommandBar.Nav>
      )}
    </div>
  );
});

FileManager.displayName = "FileManager";

export default FileManager;
