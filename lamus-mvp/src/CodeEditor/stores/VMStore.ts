import { action, makeAutoObservable, observable } from "mobx";
import {
  AudioDevice,
  Console,
  Cryptography,
  GeneralIORouter,
  LocalStorageFileSystem,
  NetworkAdapter,
  QBasicProgram,
  VirtualMachine,
} from "@lamus/qbasic-vm";
import setupGeneralIO from "./../vm/GeneralIO";

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

export class VMStoreClass {
  code: string = "";
  runState: VMRunState = VMRunState.IDLE;
  outputOrientation: VMOutputOrientation = VMOutputOrientation.PORTRAIT;
  parsingErrors = observable.array<IError>([]);
  runtimeErrors = observable.array<string>([]);
  _viewParent: HTMLElement;
  _vm: VirtualMachine;
  _console: Console;
  _program: QBasicProgram | null = null;
  _destructors: (() => void)[] = [];

  constructor(viewParent: HTMLElement) {
    makeAutoObservable(
      this,
      {
        _viewParent: false,
        _vm: false,
        _console: false,
        _program: false,
        _destructors: false,
      },
      {
        autoBind: true,
      }
    );

    this._viewParent = viewParent;

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

    this._destructors.push(setupGeneralIO(generalIORouter));

    setTimeout(() => {
      cons.print("\nREADY.");
    }, 1000);

    vm.addListener("error", this._onError);
    vm.addListener("finished", this._onFinished);
    cons.addEventListener("input", this._onInput);
    cons.addEventListener("orientationchange", this._onOrientationChange);

    this._vm = vm;
    this._console = cons;
  }

  _setRunState(newState: VMRunState) {
    this.runState = newState;
  }

  _setOutputOrientation(newOrientation: VMOutputOrientation) {
    this.outputOrientation = newOrientation;
  }

  _onError(error: any) {
    console.error(error);
    this.runtimeErrors.push(String(error));
    this.runState = VMRunState.SUSPENDED;
  }

  _onFinished() {
    this.runState = VMRunState.STOPPED;
  }

  _onOrientationChange(event: Event) {
    if (!(event instanceof CustomEvent)) return;
    console.log(event.detail);
  }

  _onInput() {
    this._viewParent.dispatchEvent(
      new CustomEvent("input", {
        bubbles: true,
        cancelable: false,
      })
    );
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
    this._vm.cwd = "";

    this.runtimeErrors.replace([]);
    this._vm.run(this._program, false);
    this._vm.once(
      "running",
      action(() => {
        this.runState = VMRunState.RUNNING;
      })
    );
  }

  reset() {
    this._vm.reset();
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

    this._vm.reset();
    this._viewParent.replaceChildren();

    this._destructors.forEach((destructor) => destructor());
  }
}
