import { GamepadJoystickState } from "@lamus/qbasic-vm";
import { makeAutoObservable, runInAction } from "mobx";

const GAMEPAD_TIMEOUT = 2000;

export enum GamepadDPadState {
  NONE = 0,
  UP = 1,
  UP_RIGHT = 2,
  RIGHT = 3,
  DOWN_RIGHT = 4,
  DOWN = 5,
  DOWN_LEFT = 6,
  LEFT = 7,
  UP_LEFT = 8,
  FIRE = 128,
  FIRE2 = 64,
  FIRE3 = 32,
  FIRE4 = 16,
}

export class VirtualGamepadStoreClass {
  isVisible: boolean = false;

  x: number | null = null;
  y: number | null = null;

  _fire = false;
  _fire2 = false;
  _fire3 = false;
  _fire4 = false;

  _pingTimeout: number | null = null;

  constructor() {
    makeAutoObservable(
      this,
      {
        _pingTimeout: false,
        _ping: false,
        _hideVirtualGamepad: false,
      },
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
    switch (button) {
      case 0:
        this._fire = state;
        break;
      case 1:
        this._fire2 = state;
        break;
      case 2:
        this._fire3 = state;
        break;
      case 3:
        this._fire4 = state;
        break;
    }
  }

  getFireState(): [boolean, boolean, boolean, boolean] {
    this._ping();
    return [this._fire, this._fire2, this._fire3, this._fire4];
  }

  getGamepadDPadState(): GamepadDPadState {
    this._ping();
    return GamepadDPadState.NONE;
  }

  getGamepadJoystickState(): GamepadJoystickState {
    this._ping();
    return [this.x ?? 0, this.y ?? 0];
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
  }

  _hideVirtualGamepad = (): void => {
    if (this._pingTimeout !== null) {
      window.clearTimeout(this._pingTimeout);
      this._pingTimeout = null;
    }

    runInAction(() => {
      this._reset();
      this.setVisible(false);
    });
  };

  _showVirtualGamepad(): void {
    this.setVisible(true);
  }

  _ping = (): void => {
    if (this._pingTimeout !== null) {
      window.clearTimeout(this._pingTimeout);
    }

    if (!this.isVisible) {
      runInAction(() => {
        this._showVirtualGamepad();
      });
    }

    this._pingTimeout = window.setTimeout(
      this._hideVirtualGamepad,
      GAMEPAD_TIMEOUT
    );
  };

  _reset(): void {
    this._fire = false;
    this._fire2 = false;
    this._fire3 = false;
    this._fire4 = false;

    this.x = 0;
    this.y = 0;
  }
}
