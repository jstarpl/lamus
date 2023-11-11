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

const MENU_COMBO = ["F9"];

const FileManager = observer(function FileManager() {
  const navigate = useNavigate();
  const { showDialog } = useModalDialog();

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

  const leftPaneLocation = FileManagerStore.leftPane.location
    ? serializePath(
        FileManagerStore.leftPane.location.providerId,
        FileManagerStore.leftPane.location.path
      )
    : null;

  const rightPaneLocation = FileManagerStore.leftPane.location
    ? serializePath(
        FileManagerStore.leftPane.location.providerId,
        FileManagerStore.leftPane.location.path
      )
    : null;

  return (
    <div className={`sdi-app`}>
      <div className={`${classNames.Document} sdi-app-workspace bg-files`}>
        <div className={classNames.PaneTabs}>
          <button className={classNames.PaneTab}>{leftPaneLocation}</button>
          <button className={classNames.PaneTabSelected}>
            {rightPaneLocation}
          </button>
        </div>
        <div className={classNames.DualPanes}>
          <FileManagerPane
            className={classNames.PaneLeft}
            pane={FileManagerStore.leftPane}
          />
          <FileManagerPane
            className={classNames.PaneRight}
            pane={FileManagerStore.rightPane}
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
