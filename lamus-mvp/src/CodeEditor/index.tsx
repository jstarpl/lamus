import React, {
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { observer } from "mobx-react-lite";
import { autorun } from "mobx";
import { EditorView, keymap, scrollPastEnd } from "@codemirror/view";
import { EditorState, StateEffect } from "@codemirror/state";
import { basicSetup } from "@codemirror/basic-setup";
import { indentWithTab } from "@codemirror/commands";
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
import { VMRunState } from "./stores/VMStore";

import "./CodeEditor.css";
import { syntaxErrorDecorations } from "./extensions/syntaxErrorDecorator";

function displayFocusToClassName(displayFocus: "editor" | "output") {
  if (displayFocus === "editor") {
    return "Editor-Active";
  } else {
    return "Output-Active";
  }
}

function orientationToClassName(orientation: "landscape" | "portrait") {
  if (orientation === "landscape") {
    return "Orientation-Landscape";
  } else {
    return "Orientation-Portrait";
  }
}

const CodeEditor = observer(function CodeEditor() {
  const editorView = useRef<EditorView | null>(null);
  const editorViewParent = useRef<HTMLDivElement | null>(null);
  const consoleViewParent = useRef<HTMLDivElement | null>(null);
  const { errorDecorations, update: updateSyntaxErrorDecorations } = useMemo(
    () => syntaxErrorDecorations(),
    []
  );

  const hasDialogOpen = false;

  const navigate = useNavigate();

  const onInitialize = useCallback(() => {
    AppStore.setUIReady();
    const focusEditor = setTimeout(() => {
      editorView.current?.focus();
    }, 1000);

    return () => {
      clearTimeout(focusEditor);
    };
  }, []);

  const onInput = useCallback((e: Event) => {
    if (!(e instanceof CustomEvent)) return;
    EditorStore.setDisplayFocus("output");
    if (!consoleViewParent.current) return;
    const firstChild = consoleViewParent.current.querySelector("[tabindex]");
    if (!firstChild || !(firstChild instanceof HTMLElement)) return;
    firstChild.focus();
  }, []);

  useEffect(
    () =>
      autorun(() => {
        if (
          EditorStore.displayFocus === "output" &&
          consoleViewParent.current
        ) {
          const firstChild =
            consoleViewParent.current.querySelector("[tabindex]");
          if (!firstChild || !(firstChild instanceof HTMLElement)) return;
          firstChild.focus();
        } else if (
          EditorStore.displayFocus === "editor" &&
          editorView.current
        ) {
          console.log("Focusing");
          editorView.current.focus();
        }
      }),
    []
  );

  useEffect(
    () =>
      autorun(() => {
        const parsingErrors = EditorStore.vm?.parsingErrors ?? [];

        for (const error of parsingErrors) {
          console.error(
            `${(error.line ?? 0) + 1}:${(error.column ?? 0) + 1} ${
              error.message
            }`
          );
        }

        if (!editorView.current) return;

        const errorMessages: {
          message: string;
          from: number;
          to: number;
          column: number;
        }[] = [];

        const editor = editorView.current;

        let firstErrorPos: number | null = null;

        for (const error of parsingErrors) {
          const line = editor.state.doc.line((error.line ?? 0) + 1);
          if (firstErrorPos === null) firstErrorPos = line.from;
          errorMessages.push({
            message: error.message,
            from: line.from,
            to: line.to,
            column: error.column ?? 0,
          });
        }

        const effects: StateEffect<any>[] = [
          updateSyntaxErrorDecorations(errorMessages),
        ];

        if (firstErrorPos !== null) {
          console.log(`Scroll into view: ${firstErrorPos}`);
          effects.push(EditorView.scrollIntoView(firstErrorPos));
        }

        const transaction = editorView.current.state.update({
          effects,
        });
        editorView.current.dispatch(transaction);
      }),
    [updateSyntaxErrorDecorations]
  );

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
          updateModel,
          errorDecorations,
        ],
      }),
    });
    editorView.current = newEditorView;
    onInitialize();

    return () => {
      newEditorView.destroy();
    };
  }, [onInitialize, errorDecorations]);

  useLayoutEffect(() => {
    if (!consoleViewParent.current) return;

    const viewParent = consoleViewParent.current;
    const dispose = EditorStore.mountVirtualMachine(viewParent);

    viewParent.addEventListener("input", onInput);

    return () => {
      viewParent.removeEventListener("input", onInput);
      dispose();
    };
  }, [onInput]);

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onRun = useCallback(() => {
    if (!EditorStore.vm) return;

    const code = EditorStore.document ?? "";

    EditorStore.vm.setCode(code);
    EditorStore.vm.run();
  }, []);

  const onOutputClick = useCallback(() => {
    if (EditorStore.vm?.runState !== VMRunState.STOPPED) return;
    EditorStore.setDisplayFocus("editor");
  }, []);

  return (
    <div className="CodeEditor sdi-app">
      <div
        className={`sdi-app-workspace bg-general ${displayFocusToClassName(
          EditorStore.displayFocus
        )} ${orientationToClassName(
          EditorStore.vm?.outputOrientation ?? "portrait"
        )}`}
      >
        <div className="Document" ref={editorViewParent}></div>
        <div className="Output" onClick={onOutputClick}>
          <div className="Output__Canvas" ref={consoleViewParent} />
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
          <CommandBar.Button combo={RUN_COMBO} position={5} onClick={onRun}>
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
