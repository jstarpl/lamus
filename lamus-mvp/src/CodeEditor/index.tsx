import React, { useRef, useEffect, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { EditorView, keymap, scrollPastEnd } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "@codemirror/basic-setup";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { AppStore } from "../stores/AppStore";
import { EditorStore } from "./stores/EditorStore";
import { updateModel } from "./extensions/updateStore";
import { CommandBar } from "../components/CommandBar";
import { useNavigate } from "react-router-dom";
import {
  OPEN_COMBO,
  QUIT_COMBO,
  RUN_COMBO,
  SAVE_AS_COMBO,
  SAVE_COMBO,
} from "../lib/commonHotkeys";

import "./CodeEditor.css";

const CodeEditor = observer(function CodeEditor() {
  const editorView = useRef<EditorView | null>(null);
  const editorViewParent = useRef<HTMLDivElement | null>(null);

  const hasDialogOpen = false;

  const navigate = useNavigate();

  const onInitialize = useCallback(() => {
    AppStore.setUIReady();
  }, []);

  useEffect(() => {
    if (!editorViewParent.current) return;

    const newEditorView = new EditorView({
      parent: editorViewParent.current,
      state: EditorState.create({
        doc: EditorStore.document ?? undefined,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          scrollPastEnd(),
          javascript(),
          updateModel,
        ],
      }),
    });
    editorView.current = newEditorView;
    onInitialize();

    return () => {
      newEditorView.destroy();
    };
  }, [onInitialize]);

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <div className="CodeEditor sdi-app">
      <div className="sdi-app-workspace bg-general">
        <div className="Document" ref={editorViewParent}></div>
        <div className="Output">
          <div className="Output__Canvas" />
        </div>
      </div>
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
          <CommandBar.Button
            combo={SAVE_COMBO}
            position={2}
            highlight
            showOnlyWhenModifiersActive
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
          <CommandBar.Button
            combo={RUN_COMBO}
            position={5}
            onClick={console.log}
          >
            Run
          </CommandBar.Button>
          <CommandBar.Button combo={QUIT_COMBO} position={10} onClick={onQuit}>
            Quit
          </CommandBar.Button>
        </CommandBar.Nav>
      )}
    </div>
  );
});

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
