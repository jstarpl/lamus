import React, { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";
import { EditorStore } from "./stores/EditorStore";
import { createReactEditorJS } from "react-editor-js";
import { Document } from "@editorjs/editorjs";
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import List from "@editorjs/list";
import Delimiter from "@editorjs/delimiter";
import Checklist from "@editorjs/checklist";
import { debounce } from "lodash";
import "./TextEditor.css";
import { EmojiPicker } from "../components/EmojiPicker";
import { CommandBar } from "../components/CommandBar";
import { useNavigate } from "react-router-dom";
import { FileDialog } from "../FileManager/FileDialog";
import { AnimatePresence } from "framer-motion";
import { useFocusSoundEffect } from "../helpers/SoundEffects/useFocusSoundEffect";
import { AppStore } from "../stores/AppStore";

const ReactEditorJS = createReactEditorJS();

const INITIAL_FOCUS_RETRY_COUNT = 3;

const SAVE_COMBO = ["F2"];
const SAVE_AS_COMBO = ["Shift", "F2"];
const OPEN_COMBO = ["F3"];
const QUIT_COMBO = ["F10"];

const DEFAULT_NEW_FILE_NAME = "New_Text_File.md";

function focusEditor(retry?: number) {
  const mainEls = document.querySelectorAll(
    ".ce-paragraph.cdx-block"
  ) as NodeListOf<HTMLDivElement>;
  if (mainEls.length === 0) {
    console.error("No block element found");
    if ((retry ?? 0) > INITIAL_FOCUS_RETRY_COUNT) return;
    setTimeout(() => focusEditor(retry ?? 0 + 1), 250);
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
  useFocusSoundEffect("input,button,.list-view,.list-view-item");

  const hasDialogOpen = EditorStore.isSaveFileDialogOpen;

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
    EditorStore.setOpenSaveFileDialog(true);
  }, []);

  useEffect(() => {
    function clickHandler(e: MouseEvent) {
      const path = e.composedPath();
      let element = path.find(
        (el) =>
          el instanceof HTMLElement &&
          (el.classList.contains("codex-editor") ||
            el.classList.contains("Dialog") ||
            el.nodeName === "DIALOG" ||
            el.nodeName === "EM-EMOJI-PICKER")
      );

      if (element) return;
      focusEditor();
    }

    document.addEventListener("click", clickHandler);

    return () => {
      document.removeEventListener("click", clickHandler);
    };
  }, []);

  function onDialogCancel() {
    EditorStore.setOpenSaveFileDialog(false);
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

  return (
    <div className="TextEditor sdi-app">
      <div className="Document sdi-app-workspace bg-general">
        <ReactEditorJS
          defaultValue={defaultDocument ?? undefined}
          onInitialize={onInitialize}
          onChange={onChange}
          tools={{
            paragraph: Paragraph,
            header: Header,
            quote: Quote,
            marker: Marker,
            list: List,
            delimiter: Delimiter,
            checklist: Checklist,
          }}
        />
        <EmojiPicker />
      </div>
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
          <CommandBar.Button
            combo={SAVE_COMBO}
            position={2}
            highlight
            showOnlyWhenModifiersActive
            onClick={onSave}
          >
            Save
          </CommandBar.Button>
          <CommandBar.Button
            combo={SAVE_AS_COMBO}
            position={2}
            highlight
            showOnlyWhenModifiersActive
          >
            SaveAs
          </CommandBar.Button>
          <CommandBar.Button
            combo={OPEN_COMBO}
            position={3}
            onClick={console.log}
          >
            Open
          </CommandBar.Button>
          <CommandBar.Button combo={QUIT_COMBO} position={10} onClick={onQuit}>
            Quit
          </CommandBar.Button>
        </CommandBar.Nav>
      )}
      <AnimatePresence>
        {EditorStore.isSaveFileDialogOpen && (
          <FileDialog
            key="save-file-dialog"
            mode="saveFile"
            onCancel={onDialogCancel}
            initialStorageProvider={EditorStore.file?.providerId}
            initialPath={EditorStore.file?.path}
            defaultFileName={
              EditorStore.file?.fileName ?? DEFAULT_NEW_FILE_NAME
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
});
TextEditor.displayName = "TextEditor";

export default TextEditor;
