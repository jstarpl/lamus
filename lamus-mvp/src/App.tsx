import React, { useRef, useCallback, useEffect } from "react";
import "./App.css";
import _ from "lodash";
import Paragraph from "@editorjs/paragraph";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import List from "@editorjs/list";
import Delimiter from "@editorjs/delimiter";
import Checklist from "@editorjs/checklist";
import { createReactEditorJS } from "react-editor-js";
import { KeyboardHandler } from "./KeyboardHandler";
import { MouseHandler } from "./MouseHandler";
import { AppStore } from "./stores/AppStore";
import { EditorStore } from "./stores/EditorStore";
import { HideMouseOnType } from "./helpers/HideMouseOnType";

const ReactEditorJS = createReactEditorJS();

function focusEditor() {
  const mainEls = document.querySelectorAll(
    ".ce-paragraph.cdx-block"
  ) as NodeListOf<HTMLDivElement>;
  if (mainEls.length === 0) console.error("Block element not found");
  // select last block
  mainEls.item(mainEls.length - 1).focus();
}

function App() {
  // not reactive, because editor.js is not a controlled input
  // we're treating the EditorStore as write-only
  const defaultDocument: object = EditorStore.document;

  const editorCore = useRef<any>(null);

  useEffect(() => {
    console.log(AppStore.deviceId);
  }, []);

  const onInitialize = useCallback((instance: any) => {
    editorCore.current = instance;
    setTimeout(() => {
      focusEditor();
    }, 1000);
  }, []);

  useEffect(() => {
    function clickHandler(e: MouseEvent) {
      const path = e.composedPath();
      let foundEditorJsInPath = false;
      for (const el of path) {
        if (
          el instanceof HTMLElement &&
          el.classList.contains("codex-editor")
        ) {
          foundEditorJsInPath = true;
          break;
        }
      }

      if (foundEditorJsInPath) return;
      focusEditor();
    }

    document.addEventListener("click", clickHandler);

    return () => {
      document.removeEventListener("click", clickHandler);
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onChange = useCallback(
    _.debounce(() => {
      if (editorCore.current === null) return;
      editorCore.current
        .save()
        .then((data: object) => {
          EditorStore.setDocument(data);
        })
        .catch((e: any) => console.error(e));
    }, 250),
    [editorCore]
  );

  return (
    <div className="App">
      <KeyboardHandler />
      <MouseHandler />
      <HideMouseOnType defaultCursorVisible={false} />
      <ReactEditorJS
        defaultValue={defaultDocument}
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
    </div>
  );
}

export default App;
