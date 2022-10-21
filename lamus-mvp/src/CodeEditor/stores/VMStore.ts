import { makeAutoObservable, observable } from "mobx";

export enum VMRunState {
  STOPPED = "stopped",
  RUNNING = "running",
  SUSPENDED = "suspended",
}

export enum VMOutputOrientation {
  LANDSCAPE = "landscape",
  PORTRAIT = "portrait",
}

export class VMStoreClass {
  code: string = "";
  runState: VMRunState = VMRunState.STOPPED;
  outputOrientation: VMOutputOrientation = VMOutputOrientation.PORTRAIT;
  parsingErrors = observable.array<string>([]);
  runtimeErrors = observable.array<string>([]);

  constructor() {
    makeAutoObservable(this, {});
  }

  setRunState(newState: VMRunState) {
    this.runState = newState;
  }

  setOutputOrientation(newOrientation: VMOutputOrientation) {
    this.outputOrientation = newOrientation;
  }

  setCode(code: string) {
    this.code = code;
  }

  run() {
    this.runState = VMRunState.RUNNING;
  }
}
