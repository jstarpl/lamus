import { GamepadDPadState, GamepadJoystickState } from "@lamus/qbasic-vm";
import { makeAutoObservable } from "mobx";

export class VirtualGamepadStoreClass {
  isVisible: boolean = false;

  x: number | null = null;
  y: number | null = null;

  fire = false;
  fire2 = false;
  fire3 = false;
  fire4 = false;

  constructor() {
    makeAutoObservable(
      this,
      {},
      {
        autoBind: true,
      }
    );
  }

  setDPadXY(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  releaseDPad(): void {
    this.x = null;
    this.y = null;
  }

  setFire(button: number, state: boolean): void {
    console.log({button, state})
    switch (button) {
      case 0:
        this.fire = state
        break;
      case 1:
        this.fire2 = state;
        break;
      case 2:
        this.fire3 = state;
        break;
      case 3:
        this.fire4 = state;
        break;
    }
  }

  getGamepadDPadState(): GamepadDPadState {
    return GamepadDPadState.NONE;
  }

  getGamepadJoystickState(): GamepadJoystickState {
    return [this.x ?? 0, this.y ?? 0];
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
  }
}
