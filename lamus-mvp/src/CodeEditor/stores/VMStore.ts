import { makeAutoObservable, observable } from "mobx";
import {
  AudioDevice,
  Console,
  Cryptography,
  GeneralIORouter,
  NetworkAdapter,
  QBasicProgram,
  RuntimeError,
  VirtualMachine,
} from "@lamus/qbasic-vm";
import setupGeneralIO from "./../vm/GeneralIO";
import { LamusStorage } from "../vm/LamusStorage";
import { AppStore } from "../../stores/AppStore";
import { ProviderId } from "../../stores/FileSystemStore";

export enum VMRunState {
  IDLE = "idle",
  STOPPED = "stopped",
  RUNNING = "running",
  SUSPENDED = "suspended",
}

export enum VMOutputOrientation {
  LANDSCAPE = "landscape",
  PORTRAIT = "portrait",
}

export interface IError {
  message: string;
  line?: number;
  column?: number;
}

const LONGER_SCREEN_SIDE_LENGTH = 600;
const SHORTER_SCREEN_SIDE_LENGTH = 320;

export class VMStoreClass {
  code: string = "";
  runState: VMRunState = VMRunState.IDLE;
  outputOrientation: VMOutputOrientation = VMOutputOrientation.PORTRAIT;
  parsingErrors = observable.array<IError>([]);
  runtimeErrors = observable.array<IError>([]);
  _viewParent: HTMLElement;
  _vm: VirtualMachine;
  _console: Console;
  _program: QBasicProgram | null = null;
  _destructors: (() => void)[] = [];
  _audio: AudioDevice;
  _soundEffects: HTMLAudioElement[];
  _cwd: string = "";

  constructor(
    viewParent: HTMLElement,
    soundEffects: HTMLAudioElement[],
    defaultStorageProviderId: ProviderId
  ) {
    makeAutoObservable(
      this,
      {
        _viewParent: false,
        _vm: false,
        _console: false,
        _program: false,
        _destructors: false,
        _cwd: false,
      },
      {
        autoBind: true,
      }
    );

    this._viewParent = viewParent;
    this._soundEffects = soundEffects;

    const cons = new Console(
      viewParent,
      undefined,
      SHORTER_SCREEN_SIDE_LENGTH,
      LONGER_SCREEN_SIDE_LENGTH,
      new URL(
        "../../../public/CodeEditor/charmap.png",
        import.meta.url
      ).toString()
    );

    const audio = new AudioDevice();
    const network = new NetworkAdapter();
    const fileSystem = new LamusStorage(
      AppStore.fileSystem,
      defaultStorageProviderId
    );
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

    this._destructors.push(setupGeneralIO(generalIORouter));

    setTimeout(() => {
      cons.print("\nREADY.");
    }, 1000);

    vm.addListener("error", this._onError);
    vm.addListener("finished", this._onFinished);
    vm.addListener("reset", this._onReset);
    cons.addEventListener("input", this._onInput);
    cons.addEventListener("orientationchange", this._onOrientationChange);
    cons.addEventListener("resize", this._onResize);

    this._vm = vm;
    this._console = cons;
    this._audio = audio;
    this._setupAudio();
  }

  _setRunState(newState: VMRunState) {
    this.runState = newState;
  }

  _setOutputOrientation(newOrientation: VMOutputOrientation) {
    this.outputOrientation = newOrientation;
  }

  _onError(error: Error) {
    if (error instanceof RuntimeError) {
      this.runtimeErrors.push({
        message: `Runtime Error: ${error.message}`,
        column: error.locus?.position,
        line: error.locus?.line,
      });
    }
    this.runState = VMRunState.SUSPENDED;
  }

  _onFinished() {
    this.runState = VMRunState.STOPPED;
  }

  _onOrientationChange(evt: Event) {
    if (!(evt instanceof CustomEvent)) return;
    const customEvent: CustomEvent<{ landscape: boolean }> = evt;
    if (customEvent.detail.landscape === true) {
      this._setOutputOrientation(VMOutputOrientation.LANDSCAPE);
    } else {
      this._setOutputOrientation(VMOutputOrientation.PORTRAIT);
    }
  }

  _onResize(evt: Event) {
    if (!(evt instanceof CustomEvent)) return;
    const customEvent: CustomEvent<{
      width: number;
      height: number;
      rows: number;
      cols: number;
    }> = evt;

    if (customEvent.detail.width > customEvent.detail.height) {
      this._console.resize(
        LONGER_SCREEN_SIDE_LENGTH,
        SHORTER_SCREEN_SIDE_LENGTH
      );
    } else {
      this._console.resize(
        SHORTER_SCREEN_SIDE_LENGTH,
        LONGER_SCREEN_SIDE_LENGTH
      );
    }
  }

  _onInput() {
    this._viewParent.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: false,
      })
    );
  }

  _onReset() {
    this._setupPlatform();
  }

  _setupPlatform() {
    this._setupAudio();
  }

  _setupAudio() {
    Promise.all(
      this._soundEffects.map((effect) => this._audio.addBeep(effect))
    ).catch(console.error);
  }

  setCode(code: string) {
    this.code = code;
    this._program = null;
    this.runtimeErrors.replace([]);
    this.parsingErrors.replace([]);
    const program = new QBasicProgram(code, false);
    if (program.errors.length > 0) {
      this.parsingErrors.replace(
        program.errors.map((error) => ({
          message: error.message,
          line: error.locus?.line,
          column: error.locus?.position,
        }))
      );
      return;
    }
    this._vm.reset();
    this._program = program;
  }

  run() {
    if (this._program === null) return;
    this._vm.cwd = this._cwd;

    this.runtimeErrors.replace([]);
    this.runState = VMRunState.RUNNING;
    const program = this._program;
    setImmediate(() => {
      this._vm.run(program, false);
    });
  }

  pause() {
    if (this.runState === VMRunState.RUNNING) {
      this._vm.suspend();
      console.log(this._vm);
      this.runState = VMRunState.SUSPENDED;
    }
  }

  resume() {
    if (this.runState === VMRunState.SUSPENDED) {
      this._vm.resume();
      this.runState = VMRunState.RUNNING;
    }
  }

  reset() {
    this._vm.reset();
    this.runState = VMRunState.STOPPED;

    setTimeout(() => {
      this._console.print("\nREADY.");
    }, 1000);
  }

  print(str: string) {
    this._console.print(str);
  }

  dispose() {
    this._vm.removeListener("error", this._onError);
    this._vm.removeListener("finished", this._onFinished);
    this._console.removeEventListener(
      "orientationchange",
      this._onOrientationChange
    );
    this._console.removeEventListener("resize", this._onResize);

    this._vm.reset();
    this._viewParent.replaceChildren();

    this._destructors.forEach((destructor) => destructor());
  }

  setCWD(location: string) {
    this._cwd = location;
  }
}
