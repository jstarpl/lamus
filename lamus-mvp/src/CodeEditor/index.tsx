import React, {
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useContext,
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
  PAUSE_COMBO,
  QUIT_COMBO,
  RUN_COMBO,
  SAVE_AS_COMBO,
  SAVE_COMBO,
  STOP_COMBO,
} from "../lib/commonHotkeys";
import { VMRunState } from "./stores/VMStore";

import "./CodeEditor.css";
import { syntaxErrorDecorations } from "./extensions/syntaxErrorDecorator";
import { SoundEffectsContext } from "../helpers/SoundEffects";
import { useGlobalKeyboardHandler } from "../helpers/useKeyboardHandler";
import { isElementChildOf } from "../lib/lib";

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

const CODE_EDITOR_SWITCH_CONTEXT = "Escape Escape Tab";

const CodeEditor = observer(function CodeEditor() {
  const keyboard = useGlobalKeyboardHandler();
  const soundEffectsContext = useContext(SoundEffectsContext);
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

  const focusOutput = useCallback(() => {
    if (!consoleViewParent.current) return;
    const firstChild = consoleViewParent.current.querySelector("[tabindex]");
    if (!firstChild || !(firstChild instanceof HTMLElement)) return;
    firstChild.focus();
  }, []);

  const focusEditor = useCallback(() => {
    if (!editorView.current) return;
    editorView.current.focus();
  }, []);

  const onInput = useCallback(
    (e: Event) => {
      if (!(e instanceof CustomEvent)) return;
      EditorStore.setDisplayFocus("output");
      focusOutput();
    },
    [focusOutput]
  );

  useEffect(() => {
    if (!keyboard) return;

    function onTabEditorOutput(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      // this should actually respond to actual focused elements
      const activeElement = document.activeElement;
      if (!activeElement || !(activeElement instanceof HTMLElement)) {
        editorView.current?.focus();
        return;
      }

      if (
        editorViewParent.current &&
        (activeElement === editorViewParent.current ||
          isElementChildOf(activeElement, editorViewParent.current))
      ) {
        EditorStore.setDisplayFocus("output");
        focusOutput();
      } else if (
        consoleViewParent.current &&
        (activeElement === consoleViewParent.current ||
          isElementChildOf(activeElement, consoleViewParent.current))
      ) {
        EditorStore.setDisplayFocus("editor");
        focusEditor();
      }
    }

    keyboard.bind(CODE_EDITOR_SWITCH_CONTEXT, onTabEditorOutput, {
      preventDefaultPartials: false,
    });

    return () => {
      keyboard.unbind(CODE_EDITOR_SWITCH_CONTEXT, onTabEditorOutput);
    };
  }, [keyboard, focusEditor, focusOutput]);

  useEffect(
    () =>
      autorun(() => {
        if (EditorStore.displayFocus === "output") {
          console.log("Focusing Output");
          focusOutput();
        } else if (EditorStore.displayFocus === "editor") {
          console.log("Focusing Editor");
          focusEditor();
        }
      }),
    [focusOutput, focusEditor]
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
          if (!error.message) continue;
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
    const dispose = EditorStore.mountVirtualMachine(
      viewParent,
      soundEffectsContext.getAllAudioElements()
    );

    viewParent.addEventListener("input", onInput);

    return () => {
      viewParent.removeEventListener("input", onInput);
      dispose();
    };
  }, [onInput, soundEffectsContext]);

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onRun = useCallback(() => {
    if (!EditorStore.vm) return;

    const code = EditorStore.document ?? "";

    EditorStore.vm.setCode(code);
    EditorStore.vm.run();
  }, []);

  const onResume = useCallback(() => {
    if (!EditorStore.vm) return;

    EditorStore.vm.resume();
  }, []);

  const onStop = useCallback(() => {
    if (!EditorStore.vm) return;

    EditorStore.vm.reset();
  }, []);

  const onPause = useCallback(() => {
    if (!EditorStore.vm) return;

    EditorStore.vm.pause();
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
            showOnlyWhenModifiersActive
          >
            Open
          </CommandBar.Button>
          {EditorStore.vm?.runState !== VMRunState.SUSPENDED && (
            <CommandBar.Button
              combo={RUN_COMBO}
              position={5}
              onClick={onRun}
              showOnlyWhenModifiersActive
            >
              Run
            </CommandBar.Button>
          )}
          {EditorStore.vm?.runState === VMRunState.SUSPENDED && (
            <CommandBar.Button
              combo={RUN_COMBO}
              position={5}
              onClick={onResume}
              showOnlyWhenModifiersActive
            >
              Run
            </CommandBar.Button>
          )}
          {EditorStore.vm?.runState !== VMRunState.IDLE &&
            EditorStore.vm?.runState !== VMRunState.STOPPED && (
              <CommandBar.Button
                combo={STOP_COMBO}
                position={5}
                onClick={onStop}
                showOnlyWhenModifiersActive
              >
                Stop
              </CommandBar.Button>
            )}
          {EditorStore.vm?.runState === VMRunState.RUNNING && (
            <CommandBar.Button
              combo={PAUSE_COMBO}
              position={6}
              onClick={onPause}
              showOnlyWhenModifiersActive
            >
              Pause
            </CommandBar.Button>
          )}
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
