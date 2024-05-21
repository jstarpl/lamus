import { indentWithTab } from "@codemirror/commands";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, keymap, scrollPastEnd } from "@codemirror/view";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { CommandBar } from "src/components/CommandBar";
import {
  FIND_COMBO,
  OPEN_COMBO,
  PAUSE_COMBO,
  QUIT_COMBO,
  RUN_COMBO,
  SAVE_AS_COMBO,
  SAVE_COMBO,
  STOP_COMBO,
} from "src/lib/commonHotkeys";
import { AppStore } from "src/stores/AppStore";
import { updateModel } from "./extensions/updateStore";
import { EditorStore } from "./stores/EditorStore";
import { IError, VMRunState } from "./stores/VMStore";

import { AnimatePresence } from "framer-motion";
import { FileDialog, IAcceptEventProps } from "src/FileManager/FileDialog";
import { SoundEffectsContext } from "src/helpers/SoundEffects";
import { useFragmentRoute } from "src/helpers/useFragmentRoute";
import { useGlobalKeyboardHandler } from "src/helpers/useKeyboardHandler";
import {
  DialogButtonResult,
  DialogButtons,
  DialogTemplates,
  DialogType,
  useModalDialog,
} from "src/helpers/useModalDialog";
import { assertNever } from "src/helpers/util";
import { isElementChildOf } from "src/lib/lib";
import {
  FILE_PATH_SEPARATOR,
  PROVIDER_SEPARATOR,
} from "src/stores/fileSystem/IFileSystemProvider";
import "./CodeEditor.css";
import { basicSetup } from "./codeMirrorBasicSetup";
import { FindReplaceDialog, IFindEventProps } from "./dialogs/FindReplaceDialog";
import { qbasic } from "./extensions/qbasic-lang";
import { syntaxErrorDecorations } from "./extensions/syntaxErrorDecorator";
import { syntaxTheme } from "./extensions/theme";
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
  const isFindDialogOpen = useFragmentRoute("#find");

  const hasDialogOpen =
    isSaveFileDialogOpen || isOpenFileDialogOpen || isFindDialogOpen;

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

        const ctx: { firstError: { from: number; to: number } | null } = {
          firstError: null,
        };

        function insertErrorIntoErrorMessages(
          error: IError,
          errorMessages: IErrorMessage[]
        ) {
          const line = editor.state.doc.line((error.line ?? 0) + 1);
          if (ctx.firstError === null) ctx.firstError = line;
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

        for (const error of parsingErrors) {
          insertErrorIntoErrorMessages(error, errorMessages);
        }

        for (const error of runtimeErrors) {
          insertErrorIntoErrorMessages(error, errorMessages);
        }

        const effects: StateEffect<any>[] = [
          updateSyntaxErrorDecorations(errorMessages),
        ];

        if (ctx.firstError !== null) {
          console.log(`Scroll into view: ${ctx.firstError.from}`);
          effects.push(EditorView.scrollIntoView(ctx.firstError.from, {
            yMargin: 20,
            xMargin: 20,
            x: 'nearest',
            y: 'center',
          }));
        }

        const transaction = editorView.current.state.update({
          selection: ctx.firstError?.to !== undefined ? {
            anchor: ctx.firstError.to,
          } : undefined,
          effects,
        });
        editorView.current.dispatch(transaction);
      }),
    [updateSyntaxErrorDecorations]
  );

  const createEditorState = useCallback((document: string) => {
    return EditorState.create({
      doc: document ?? "",
      extensions: [
        basicSetup,
        qbasic(),
        syntaxTheme,
        keymap.of([indentWithTab]),
        scrollPastEnd(),
        updateModel,
        errorDecorations,
      ],
    });
  }, []);

  useEffect(() => {
    if (!editorViewParent.current) return;

    console.log("Creating new state");
    const newEditorView = new EditorView({
      parent: editorViewParent.current,
      state: createEditorState(EditorStore.document ?? ""),
    });
    editorView.current = newEditorView;
    onInitialize();

    EditorStore.setDisplayFocus("editor");

    return () => {
      newEditorView.destroy();
    };
  }, [onInitialize, createEditorState, errorDecorations]);

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

  const onFind = useCallback(() => {
    const s = editorView.current?.state
    let text: string | undefined
    if (s && !s.selection.main.empty) {
      text = s.sliceDoc(s.selection.main.from, s.selection.main.to)
      navigate("#find?" + new URLSearchParams({ text }));
    } else {
      navigate("#find");
    }
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

  function onFindDialogGo({ searchText }: IFindEventProps) {
    console.log(searchText);
    resetFragment();
  }

  function onFindDialogCancel() {
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
        editorView.current.setState(createEditorState(EditorStore.document));
      })
      .catch((e) => {
        AppStore.isBusy = false;
        console.error(e);
      });
  }

  return (
    <div className="CodeEditor sdi-app">
      <div
        className={`sdi-app-workspace bg-code ${displayFocusToClassName(
          EditorStore.displayFocus
        )} ${orientationToClassName(
          EditorStore.vm?.outputOrientation ?? "portrait"
        )}`}
      >
        <div className="Document" ref={editorViewParent}></div>
        <div className="Output" onClick={onOutputClick}>
          <div className="Output__Canvas" ref={consoleViewParent} />
        </div>
        <AnimatePresence>
          {EditorStore.vm?.runState === VMRunState.RUNNING &&
          EditorStore.displayFocus === "output" &&
          EditorStore.vm?.virtualGamepad?.isVisible ? (
            <VirtualGamepad />
          ) : null}
        </AnimatePresence>
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
          {EditorStore.vm?.runState !== VMRunState.RUNNING && (
            <CommandBar.Button
              combo={FIND_COMBO}
              position={7}
              onClick={onFind}
              showOnlyWhenModifiersActive
            >
              Find
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
      <FindReplaceDialog
        show={isFindDialogOpen}
        onFind={onFindDialogGo}
        onCancel={onFindDialogCancel}
      />
    </div>
  );
});

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;
