import React, { useRef, useEffect, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { EditorView, keymap, scrollPastEnd } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "@codemirror/basic-setup";
import { indentWithTab } from "@codemirror/commands";
import {
  Console,
  AudioDevice,
  NetworkAdapter,
  LocalStorageFileSystem,
  GeneralIORouter,
  VirtualMachine,
  QBasicProgram,
  Cryptography,
} from "@lamus/qbasic-vm";
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
import { VMRunState } from "./stores/VMStore";
import { autorun } from "mobx";

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
  const virtualMachine = useRef<VirtualMachine | null>(null);
  const consoleViewParent = useRef<HTMLDivElement | null>(null);

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

  const onError = useCallback((error: any) => {
    console.error(error);
  }, []);

  const onFinished = useCallback(() => {
    console.log("finished");
    EditorStore.vm.setRunState(VMRunState.STOPPED);
  }, []);

  const onInput = useCallback(() => {
    console.log("VM is waiting for input");
    EditorStore.setDisplayFocus("output");
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

  const onOrientationChange = useCallback((event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    console.log(event.detail);
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

  useEffect(() => {
    if (!consoleViewParent.current) return;

    const viewParent = consoleViewParent.current;

    const cons = new Console(
      viewParent,
      undefined,
      320,
      600,
      process.env.PUBLIC_URL + "/CodeEditor/"
    );
    const audio = new AudioDevice();
    const network = new NetworkAdapter();
    const fileSystem = new LocalStorageFileSystem();
    const generalIORouter = new GeneralIORouter();
    const crypto = new Cryptography();
    const vm = new VirtualMachine(
      cons,
      audio,
      network,
      fileSystem,
      generalIORouter,
      crypto
    );

    virtualMachine.current = vm;
    // const dbg = new DebugConsole(document.getElementById('debug'))

    vm.addListener("error", onError);
    vm.addListener("finished", onFinished);
    cons.addEventListener("input", onInput);
    cons.addEventListener("orientationchange", onOrientationChange);

    setTimeout(() => {
      cons.print("\nREADY.");
    }, 1000);

    return () => {
      vm.removeListener("error", onError);
      vm.removeListener("finished", onFinished);
      cons.removeEventListener("orientationchange", onOrientationChange);

      vm.reset();
      viewParent.replaceChildren();
    };
  }, [onError, onFinished, onOrientationChange, onInput]);

  const onQuit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onRun = useCallback(() => {
    const vm = virtualMachine.current;
    if (!vm) return;

    const code = EditorStore.document ?? "";

    vm.reset();
    const program = new QBasicProgram(code, false);
    if (program.errors.length === 0) {
      vm.cwd = "";

      vm.run(program, false);
      vm.once("running", () => {
        if (virtualMachine.current) {
          EditorStore.run();
        }
      });
      // vm.on("error", (error) => {
      //   // dbg.print('Runtime error: ' + error + ' at ' + error.locus + '\n')
      // });
    } else {
      vm.reset();
      console.error(program.errors);
      // for (let i = 0; i < program.errors.length; i++) {
      //   dbg.print(program.errors[i].message + '\n')
      // }
    }
  }, [virtualMachine]);

  return (
    <div className="CodeEditor sdi-app">
      <div
        className={`sdi-app-workspace bg-general ${displayFocusToClassName(
          EditorStore.displayFocus
        )} ${orientationToClassName(EditorStore.vm.outputOrientation)}`}
      >
        <div className="Document" ref={editorViewParent}></div>
        <div className="Output">
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
