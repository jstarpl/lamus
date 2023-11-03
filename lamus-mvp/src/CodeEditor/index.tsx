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
import { IError, VMRunState } from "./stores/VMStore";

import "./CodeEditor.css";
import { syntaxErrorDecorations } from "./extensions/syntaxErrorDecorator";
import { SoundEffectsContext } from "../helpers/SoundEffects";
import { useGlobalKeyboardHandler } from "../helpers/useKeyboardHandler";
import { isElementChildOf } from "../lib/lib";
import { AnimatePresence } from "framer-motion";
import { FileDialog, IAcceptEventProps } from "../FileManager/FileDialog";
import {
  DialogButtonResult,
  DialogButtons,
  DialogTemplates,
  DialogType,
  useModalDialog,
} from "../helpers/useModalDialog";
import { assertNever } from "../helpers/util";
import {
  FILE_PATH_SEPARATOR,
  PROVIDER_SEPARATOR,
} from "../stores/fileSystem/IFileSystemProvider";
import { useFragmentRoute } from "../helpers/useFragmentRoute";
import VirtualGamepad from "./vm/Gamepads/VirtualGamepad";

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

const EXIT_FINISHED_PROGRAM = "Escape";

const DEFAULT_NEW_FILE_NAME = "New_Program.bas";

const CodeEditor = observer(function CodeEditor() {
  const keyboard = useGlobalKeyboardHandler();
  const { showDialog } = useModalDialog();
  const soundEffectsContext = useContext(SoundEffectsContext);
  const editorView = useRef<EditorView | null>(null);
  const editorViewParent = useRef<HTMLDivElement | null>(null);
  const consoleViewParent = useRef<HTMLDivElement | null>(null);
  const { errorDecorations, update: updateSyntaxErrorDecorations } = useMemo(
    () => syntaxErrorDecorations(),
    []
  );

  const isOpenFileDialogOpen = useFragmentRoute("#open");
  const isSaveFileDialogOpen = useFragmentRoute("#save");

  const hasDialogOpen = isSaveFileDialogOpen || isOpenFileDialogOpen;

  const navigate = useNavigate();

  function resetFragment() {
    navigate(-1);
  }

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

    function onExitFinishedProgram(e: KeyboardEvent) {
      if (
        EditorStore.displayFocus === "output" &&
        EditorStore.vm?.runState !== VMRunState.RUNNING
      ) {
        EditorStore.setDisplayFocus("editor");
        focusEditor();
      }
    }

    keyboard.bind(CODE_EDITOR_SWITCH_CONTEXT, onTabEditorOutput, {
      preventDefaultPartials: false,
    });

    keyboard.bind(EXIT_FINISHED_PROGRAM, onExitFinishedProgram);

    return () => {
      keyboard.unbind(CODE_EDITOR_SWITCH_CONTEXT, onTabEditorOutput);
      keyboard.unbind(EXIT_FINISHED_PROGRAM, onExitFinishedProgram);
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

        const runtimeErrors = EditorStore.vm?.runtimeErrors ?? [];

        for (const error of runtimeErrors) {
          console.error(
            `${(error.line ?? 0) + 1}:${(error.column ?? 0) + 1} ${
              error.message
            }`
          );
        }

        if (!editorView.current) return;

        type IErrorMessage = {
          message: string;
          from: number;
          to: number;
          column: number;
        };

        function insertErrorIntoErrorMessages(
          error: IError,
          errorMessages: IErrorMessage[]
        ) {
          const line = editor.state.doc.line((error.line ?? 0) + 1);
          if (firstErrorPos === null) firstErrorPos = line.from;
          if (!error.message) return;
          errorMessages.push({
            message: error.message,
            from: line.from,
            to: line.to,
            column: error.column ?? 0,
          });
        }

        const errorMessages: IErrorMessage[] = [];

        const editor = editorView.current;

        let firstErrorPos: number | null = null;

        for (const error of parsingErrors) {
          insertErrorIntoErrorMessages(error, errorMessages);
        }

        for (const error of runtimeErrors) {
          insertErrorIntoErrorMessages(error, errorMessages);
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

    console.log("Creating new state");
    const newEditorView = new EditorView({
      parent: editorViewParent.current,
      state: EditorState.create({
        doc: EditorStore.document ?? "",
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

    EditorStore.setDisplayFocus("editor");

    return () => {
      newEditorView.destroy();
    };
  }, [onInitialize, errorDecorations]);

  useLayoutEffect(() => {
    if (!consoleViewParent.current) return;

    const viewParent = consoleViewParent.current;
    const dispose = EditorStore.mountVirtualMachine(
      viewParent,
      soundEffectsContext.getAllAudioElements(),
      showDialog
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

    if (EditorStore.file) {
      EditorStore.vm.setCWD(
        `${EditorStore.file.providerId}${PROVIDER_SEPARATOR}${
          EditorStore.file.path.length > 0 ? FILE_PATH_SEPARATOR : ""
        }${EditorStore.file.path.join(FILE_PATH_SEPARATOR)}/`
      );
    } else {
      EditorStore.vm.setCWD("");
    }
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

  const onSave = useCallback(() => {
    navigate("#save");
  }, []);

  const onSaveAs = useCallback(() => {
    navigate("#save");
  }, []);

  const onOpen = useCallback(() => {
    navigate("#open");
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
        if (!editorView.current || !EditorStore.document) return;
        AppStore.isBusy = false;
        resetFragment();
        if (!isOk) return;
        EditorStore.vm?.reset();
        console.log("Setting new state");
        editorView.current.setState(
          EditorState.create({
            doc: EditorStore.document ?? "",
            extensions: [
              basicSetup,
              keymap.of([indentWithTab]),
              scrollPastEnd(),
              updateModel,
              errorDecorations,
            ],
          })
        );
      })
      .catch((e) => {
        AppStore.isBusy = false;
        console.error(e);
      });
  }

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
        <VirtualGamepad />
      </div>
      {!hasDialogOpen && (
        <CommandBar.Nav key="command-bar">
          <CommandBar.Button
            combo={SAVE_COMBO}
            position={2}
            onClick={onSave}
            highlight
            showOnlyWhenModifiersActive
          >
            Save
          </CommandBar.Button>
          <CommandBar.Button
            combo={SAVE_AS_COMBO}
            position={2}
            onClick={onSaveAs}
            highlight
            showOnlyWhenModifiersActive
          >
            SaveAs
          </CommandBar.Button>
          <CommandBar.Button
            combo={OPEN_COMBO}
            position={3}
            onClick={onOpen}
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

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
