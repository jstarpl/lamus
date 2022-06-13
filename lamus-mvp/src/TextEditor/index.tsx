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
import { EVENT_UI_READY } from "../App";
import "./TextEditor.css";
import { EmojiPicker } from "../components/EmojiPicker";

const ReactEditorJS = createReactEditorJS();

const INITIAL_FOCUS_RETRY_COUNT = 3;

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

  const onInitialize = useCallback((instance: any) => {
    editorCore.current = instance;
    window.dispatchEvent(new CustomEvent(EVENT_UI_READY));

    setTimeout(() => {
      focusEditor();
    }, 1000);
  }, []);

  useEffect(() => {
    function clickHandler(e: MouseEvent) {
      const path = e.composedPath();
      let element = path.find(
        (el) =>
          el instanceof HTMLElement &&
          (el.classList.contains("codex-editor") ||
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
      <div className="CommandBar sdi-app-cmd-bar"></div>
    </div>
  );
});
TextEditor.displayName = "TextEditor";

export default TextEditor;
