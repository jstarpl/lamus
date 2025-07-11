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
import { makeAutoObservable, observable } from "mobx";
import { ShowModalDialogFunction } from "../../helpers/useModalDialog";
import { AppStore } from "../../stores/AppStore";
import { ProviderId } from "../../stores/FileSystemStore";
import Charmap from "../img/charmap.png";
import { Gamepads } from "../vm/Gamepads/Gamepads";
import { LamusStorage } from "../vm/LamusStorage";
import { Mouse } from "../vm/Mouse";
import setupGeneralIO from "./../vm/GeneralIO";
import { VirtualGamepadStoreClass } from "./VirtualGamepadStore";

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
  _powerSavingSuspend: boolean = false;
  outputOrientation: VMOutputOrientation = VMOutputOrientation.PORTRAIT;
  parsingErrors = observable.array<IError>([]);
  runtimeErrors = observable.array<IError>([]);
  virtualGamepad = new VirtualGamepadStoreClass();
  _viewParent: HTMLElement;
  _vm: VirtualMachine;
  _console: Console;
  _program: QBasicProgram | null = null;
  _destructors: (() => void)[] = [];
  _audio: AudioDevice;
  _generalIORouter: GeneralIORouter;
  _soundEffects: HTMLAudioElement[];
  _cwd: string = "";
  _powerSaving: boolean = true;
  _wakeLock: boolean = false;
  _wakeLockSentinel: WakeLockSentinel | null = null;

  constructor(
    viewParent: HTMLElement,
    soundEffects: HTMLAudioElement[],
    defaultStorageProviderId: ProviderId,
    public _showModalDialog: ShowModalDialogFunction
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
        _audio: false,
        _generalIORouter: false,
        _soundEffects: false,
        _showModalDialog: false,
        _enableScreenWakeLock: false,
      },
      {
        autoBind: true,
      }
    );

    this._viewParent = viewParent;
    this._soundEffects = soundEffects;

    const cons = new Console(
      viewParent,
      Charmap,
      undefined,
      SHORTER_SCREEN_SIDE_LENGTH,
      LONGER_SCREEN_SIDE_LENGTH
    );

    const audio = new AudioDevice();
    const network = new NetworkAdapter();
    const fileSystem = new LamusStorage(
      AppStore.fileSystem,
      defaultStorageProviderId
    );
    const generalIORouter = new GeneralIORouter();
    const crypto = new Cryptography();
    const gamepads = new Gamepads(this.virtualGamepad);
    const mousePointer = new Mouse(cons);
    const vm = new VirtualMachine({
      console: cons,
      audio: audio,
      networkAdapter: network,
      fileSystem: fileSystem,
      generalIo: generalIORouter,
      cryptography: crypto,
      gamepad: gamepads,
      pointer: mousePointer,
    });

    setTimeout(() => {
      cons.print("\nREADY.");
    }, 1000);

    vm.addListener("running", this._onRunning);
    vm.addListener("error", this._onError);
    vm.addListener("finished", this._onFinished);
    vm.addListener("reset", this._onReset);
    cons.addEventListener("input", this._onInput);
    cons.addEventListener("orientationchange", this._onOrientationChange);
    cons.addEventListener("resize", this._onResize);
    document.addEventListener("visibilitychange", this._onVisibilityChange);

    this._vm = vm;
    this._console = cons;
    this._audio = audio;
    this._generalIORouter = generalIORouter;
    this._setupPlatform();
  }

  _onVisibilityChange() {
    if (
      document.visibilityState === "hidden" &&
      this._powerSaving &&
      this.runState === VMRunState.RUNNING
    ) {
      console.log(`😴 Power Saving enabled, VM going to sleep`);
      this.pause();
      this._powerSavingSuspend = true;
    } else if (
      document.visibilityState === "visible" &&
      this.runState === VMRunState.SUSPENDED &&
      this._powerSavingSuspend === true
    ) {
      console.log(`😴 Power Saving enabled, VM resuming`);
      this.resume();
    }

    if (document.visibilityState === "visible" && this._wakeLock) {
      this._enableScreenWakeLock()
    }
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

  _onRunning() {
    this.runState = VMRunState.RUNNING;
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
    this._destructors.push(
      setupGeneralIO(this._generalIORouter, this._showModalDialog, this)
    );
  }

  _setupAudio() {
    Promise.all(
      this._soundEffects.map((effect) => this._audio.addBeep(effect))
    ).catch(console.error);
  }

  setPowerSaving(enabled: boolean) {
    this._powerSaving = enabled ?? true;
  }

  setWakeLock(enabled: boolean) {
    this._wakeLock = enabled ?? false;
    if (this._wakeLock) {
      this._enableScreenWakeLock();
    } else {
      this._disableScreenWakeLock();
    }
  }

  _disableScreenWakeLock() {
    if (this._wakeLockSentinel) {
      this._wakeLockSentinel.release().catch(() => {
        console.error(`Error releasing Screen Wake Lock`);
      })
      this._wakeLockSentinel = null;
    }
  }

  _enableScreenWakeLock() {
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request()
        .then((sentinel) => {
          this._wakeLockSentinel = sentinel;
          console.log("😀 Screen Wake Lock enabled");
        })
        .catch((e) => {
          console.error(`😿 Failed to acquire wakeLock:`, e);
        });
    }
  }

  setMousePointer(_enabled: boolean) {}

  setCode(code: string) {
    this.code = code;
    this._wakeLock = false;
    this._disableScreenWakeLock();
    this._powerSaving = true;
    this._powerSavingSuspend = false;
    this._program = null;
    this.runtimeErrors.replace([]);
    this.parsingErrors.replace([]);
    const program = new QBasicProgram(code, false);
    if (program.errors.length > 0) {
      this.parsingErrors.replace(
        program.errors.map((error) => ({
          message: error.message ?? error,
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
    this._powerSaving = true;
    this._powerSavingSuspend = false;
    const program = this._program;
    setTimeout(() => {
      this._vm.run(program, false);
    });
  }

  pause() {
    if (this.runState === VMRunState.RUNNING) {
      this._vm.suspend();
      this.runState = VMRunState.SUSPENDED;
    }
  }

  resume() {
    if (this.runState === VMRunState.SUSPENDED) {
      this._vm.resume();
      this.runState = VMRunState.RUNNING;
      this._powerSavingSuspend = false;
    }
  }

  reset() {
    this._vm.reset();
    this.runState = VMRunState.STOPPED;
    this._wakeLock = false;
    this._disableScreenWakeLock();
    this._powerSaving = true;
    this._powerSavingSuspend = false;
    this.setMousePointer(true);

    setTimeout(() => {
      this._console.print("\nREADY.");
    }, 1000);
  }

  print(str: string) {
    this._console.print(str);
  }

  dispose() {
    this._disableScreenWakeLock();
    this._vm.removeListener("error", this._onError);
    this._vm.removeListener("finished", this._onFinished);
    this._console.removeEventListener(
      "orientationchange",
      this._onOrientationChange
    );
    this._console.removeEventListener("resize", this._onResize);

    this._vm.reset();
    this._viewParent.replaceChildren();
    document.removeEventListener("visibilitychange", this._onVisibilityChange);

    this._destructors.forEach((destructor) => destructor());
  }

  setCWD(location: string) {
    this._cwd = location;
  }
}
