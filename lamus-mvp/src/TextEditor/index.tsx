import React, { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { EditorStore } from "./stores/EditorStore";
import { createReactEditorJS } from "react-editor-js";
import { Document } from "@editorjs/editorjs";
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import List from "@editorjs/list";
import Delimiter from "@editorjs/delimiter";
import Checklist from "@editorjs/checklist";

import { debounce } from "lodash";
import "./TextEditor.css";
import { EmojiPicker } from "../components/EmojiPicker";
import { CommandBar } from "../components/CommandBar";
import { useNavigate } from "react-router-dom";
import { FileDialog, IAcceptEventProps } from "../FileManager/FileDialog";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { AppStore } from "../stores/AppStore";
import {
  OPEN_COMBO,
  QUIT_COMBO,
  SAVE_AS_COMBO,
  SAVE_COMBO,
} from "../lib/commonHotkeys";
import {
  DialogButtonResult,
  DialogButtons,
  DialogTemplates,
  DialogType,
  useModalDialog,
} from "../helpers/useModalDialog";
import { assertNever } from "../helpers/util";
import {
  bsHeadingIcon,
  bsDelimiter,
  bsParagraphIcon,
  bsQuoteIcon,
  bsListIcon,
  bsCheckListIcon,
} from "./editorIcons";
import { useFragmentRoute } from "../helpers/useFragmentRoute";

const ReactEditorJS = createReactEditorJS();

const INITIAL_FOCUS_RETRY_COUNT = 3;

const DEFAULT_NEW_FILE_NAME = "New_Text_File.md";

function focusEditor(retry?: number) {
  console.log("focusEditor");
  const mainEls = document.querySelectorAll(
    ".ce-paragraph.cdx-block"
  ) as NodeListOf<HTMLDivElement>;
  if (mainEls.length === 0) {
    console.error("No block element found");
    if ((retry ?? 0) > INITIAL_FOCUS_RETRY_COUNT) return;
    setTimeout(() => focusEditor((retry ?? 0) + 1), 250);
    return;
  }
  // select last block
  mainEls.item(mainEls.length - 1).focus();
}

const TextEditor = observer(function TextEditor() {
  // not reactive, because editor.js is not a controlled input
  // we're treating the EditorStore as write-only
  const defaultDocument: Document | null = EditorStore.document;

  const editorCore = useRef<any>(null);
  const navigate = useNavigate();
  const { showDialog } = useModalDialog();

  function resetFragment() {
    navigate(-1);
  }

  useFocusSoundEffect("input,button,.list-view,.list-view-item");

  const isOpenFileDialogOpen = useFragmentRoute("#open");
  const isSaveFileDialogOpen = useFragmentRoute("#save");

  const hasDialogOpen = isSaveFileDialogOpen || isOpenFileDialogOpen;

  const onInitialize = useCallback((instance: any) => {
    editorCore.current = instance;
    AppStore.setUIReady();

    setTimeout(() => {
      focusEditor();
    }, 1000);
  }, []);

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onSave = useCallback(() => {
    navigate("#save");
  }, [navigate]);

  const onSaveAs = useCallback(() => {
    navigate("#save");
  }, [navigate]);

  const onOpen = useCallback(() => {
    navigate("#open");
  }, [navigate]);

  useEffect(() => {
    function clickHandler(e: MouseEvent) {
      const path = e.composedPath();
      let element = path.find(
        (el) =>
          el instanceof HTMLElement &&
          (el.nodeName === "DIALOG" ||
            el.nodeName === "EM-EMOJI-PICKER" ||
            el.classList.contains("codex-editor") ||
            el.classList.contains("Dialog") ||
            el.classList.contains("dialog__backdrop"))
      );

      if (element) return;
      focusEditor();
    }

    document.addEventListener("click", clickHandler);

    return () => {
      document.removeEventListener("click", clickHandler);
    };
  }, []);

  function onSaveDialogCancel() {
    resetFragment();
  }

  function onSaveDialogAccept({
    providerId,
    path,
    fileName,
  }: IAcceptEventProps) {
    if (!fileName) return;

    AppStore.isBusy = true;
    EditorStore.checkIfCanSave(providerId, path, fileName)
      .then(async ({ ok, meta }) => {
        if (!ok) {
          AppStore.isBusy = false;
          // file will be overwriten, ask
          const result = await showDialog(
            DialogTemplates.overwriteExistingFile(fileName)
          );
          if (result.result === DialogButtonResult.NO) {
            return;
          } else if (result.result !== DialogButtonResult.YES) {
            assertNever(result.result);
          }
        }

        AppStore.isBusy = true;
        const saveAsOk = await EditorStore.saveAs(
          providerId,
          path,
          fileName,
          meta
        );
        AppStore.isBusy = false;
        if (!saveAsOk) {
          await showDialog({
            message:
              "There was an error saving the file. Try using a different file name.",
            choices: DialogButtons.OK,
            type: DialogType.ERROR,
          });
          return;
        }
        // write file
        resetFragment();
      })
      .catch((e) => {
        AppStore.isBusy = false;
        console.error(e);
      });
  }

  function onOpenDialogCancel() {
    resetFragment();
  }

  function onOpenDialogAccept({
    providerId,
    path,
    fileName,
  }: IAcceptEventProps) {
    if (!fileName) return;

    AppStore.isBusy = true;
    EditorStore.open({
      providerId,
      path,
      fileName,
    })
      .then((isOk) => {
        if (!editorCore.current || !EditorStore.document) return;
        AppStore.isBusy = false;
        resetFragment();
        console.log(isOk);
        console.log(editorCore.current);
        editorCore.current.render(EditorStore.document);
      })
      .catch((e) => {
        AppStore.isBusy = false;
        console.error(e);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(
    debounce(() => {
      if (editorCore.current === null) return;
      editorCore.current
        .save()
        .then((data: Document) => {
          EditorStore.setDocument(data);
        })
        .catch((e: any) => console.error(e));
    }, 250),
    [editorCore]
  );

  useEffect(() => {
    if (hasDialogOpen) return;

    focusEditor();
  }, [hasDialogOpen]);

  return (
    <div className="TextEditor sdi-app">
      <div className="Document sdi-app-workspace bg-general">
        <ReactEditorJS
          defaultValue={defaultDocument ?? undefined}
          onInitialize={onInitialize}
          onChange={onChange}
          tools={{
            paragraph: {
              class: Paragraph,
              inlineToolbar: true,
              shortcut: "CMD+SHIFT+1",
              toolbox: {
                title: "Text",
                icon: bsParagraphIcon,
              },
            },
            header: {
              class: Header,
              inlineToolbar: false,
              shortcut: "CMD+SHIFT+2",
              toolbox: {
                title: "Heading",
                icon: bsHeadingIcon,
              },
            },
            quote: {
              class: Quote,
              inlineToolbar: false,
              shortcut: "CMD+SHIFT+3",
              toolbox: {
                title: "Quote",
                icon: bsQuoteIcon,
              },
            },
            list: {
              class: List,
              shortcut: "CMD+SHIFT+4",
              toolbox: {
                title: "List",
                icon: bsListIcon,
              },
            },
            delimiter: {
              class: Delimiter,
              shortcut: "CMD+SHIFT+5",
              toolbox: {
                title: "Delimiter",
                icon: bsDelimiter,
              },
            },
            checklist: {
              class: Checklist,
              shortcut: "CMD+SHIFT+6",
              toolbox: {
                title: "Checklist",
                icon: bsCheckListIcon,
              },
            },
          }}
        />
        <EmojiPicker />
      </div>
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
          <CommandBar.Button
            combo={SAVE_COMBO}
            position={2}
            highlight={!EditorStore.saved}
            showOnlyWhenModifiersActive
            onClick={onSave}
          >
            Save
          </CommandBar.Button>
          <CommandBar.Button
            combo={SAVE_AS_COMBO}
            position={2}
            showOnlyWhenModifiersActive
            onClick={onSaveAs}
          >
            SaveAs
          </CommandBar.Button>
          <CommandBar.Button combo={OPEN_COMBO} position={3} onClick={onOpen}>
            Open
          </CommandBar.Button>
          <CommandBar.Button combo={QUIT_COMBO} position={10} onClick={onQuit}>
            Quit
          </CommandBar.Button>
        </CommandBar.Nav>
      )}
      <FileDialog
        show={isSaveFileDialogOpen}
        key="save-file-dialog"
        mode="saveFile"
        onAccept={onSaveDialogAccept}
        onCancel={onSaveDialogCancel}
        initialStorageProvider={EditorStore.file?.providerId}
        initialPath={EditorStore.file?.path}
        defaultFileName={EditorStore.file?.fileName ?? DEFAULT_NEW_FILE_NAME}
      />
      <FileDialog
        show={isOpenFileDialogOpen}
        key="open-file-dialog"
        mode="openFile"
        onAccept={onOpenDialogAccept}
        onCancel={onOpenDialogCancel}
        initialStorageProvider={EditorStore.file?.providerId}
        initialPath={EditorStore.file?.path}
      />
    </div>
  );
});
TextEditor.displayName = "TextEditor";

export default TextEditor;
