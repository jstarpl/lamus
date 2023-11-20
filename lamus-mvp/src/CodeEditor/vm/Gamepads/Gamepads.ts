import {
  GamepadDPadState,
  GamepadJoystickState,
  IGamepad,
} from "@lamus/qbasic-vm";
import { VirtualGamepadStoreClass } from "../../stores/VirtualGamepadStore";

export class Gamepads implements IGamepad {
  constructor(private virtualGamepad: VirtualGamepadStoreClass) {}
  private getHardwareGamepadByIndex(index: number): Gamepad | undefined {
    const allGamepads = navigator.getGamepads().filter(Boolean);
    return allGamepads[index] ?? undefined;
  }
  private getVirtualDPad(): GamepadDPadState {
    let state = GamepadDPadState.NONE;

    const fireState = this.virtualGamepad.getFireState();

    if (fireState[0]) {
      state = state | GamepadDPadState.FIRE;
    }
    if (fireState[1]) {
      state = state | GamepadDPadState.FIRE2;
    }
    if (fireState[2]) {
      state = state | GamepadDPadState.FIRE3;
    }
    if (fireState[3]) {
      state = state | GamepadDPadState.FIRE4;
    }

    if (this.virtualGamepad.x === null || this.virtualGamepad.y === null)
      return state;

    if (this.virtualGamepad.y < -0.6) {
      // Y-axis is up

      if (this.virtualGamepad.x < -0.6) {
        // X-axis is left
        state = state | GamepadDPadState.UP_LEFT;
      } else if (this.virtualGamepad.x > 0.6) {
        state = state | GamepadDPadState.UP_RIGHT;
      } else {
        state = state | GamepadDPadState.UP;
      }
    } else if (this.virtualGamepad.y > 0.6) {
      // Y-axis is down

      if (this.virtualGamepad.x < -0.6) {
        // X-axis is left
        state = state | GamepadDPadState.DOWN_LEFT;
      } else if (this.virtualGamepad.x > 0.6) {
        state = state | GamepadDPadState.DOWN_RIGHT;
      } else {
        state = state | GamepadDPadState.DOWN;
      }
    } else {
      // Y-axis is center

      if (this.virtualGamepad.x < -0.6) {
        // X-axis is left
        state = state | GamepadDPadState.LEFT;
      } else if (this.virtualGamepad.x > 0.6) {
        state = state | GamepadDPadState.RIGHT;
      }
    }

    return state;
  }
  getDPad(index: number): GamepadDPadState {
    const gamepad = this.getHardwareGamepadByIndex(index);
    if (!gamepad) {
      if (index === 0) return this.getVirtualDPad();
      return GamepadDPadState.NONE;
    }

    let state = GamepadDPadState.NONE;

    if (
      this.gamepadButtonsArePressed(gamepad.buttons, [12]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [15, 13, 14])
    ) {
      state = GamepadDPadState.UP;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [12, 15]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [13, 14])
    ) {
      state = GamepadDPadState.UP_RIGHT;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [15]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [12, 13, 14])
    ) {
      state = GamepadDPadState.RIGHT;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [15, 13]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [12, 14])
    ) {
      state = GamepadDPadState.DOWN_RIGHT;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [13]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [12, 15, 14])
    ) {
      state = GamepadDPadState.DOWN;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [13, 14]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [12, 15])
    ) {
      state = GamepadDPadState.DOWN_LEFT;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [14]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [12, 13, 15])
    ) {
      state = GamepadDPadState.LEFT;
    } else if (
      this.gamepadButtonsArePressed(gamepad.buttons, [12, 14]) &&
      this.gamepadButtonsAreNotPressed(gamepad.buttons, [15, 13])
    ) {
      state = GamepadDPadState.UP_LEFT;
    }

    if (gamepad.buttons[0].pressed) {
      state = state | GamepadDPadState.FIRE;
    }
    if (gamepad.buttons[1].pressed) {
      state = state | GamepadDPadState.FIRE2;
    }
    if (gamepad.buttons[2].pressed) {
      state = state | GamepadDPadState.FIRE3;
    }
    if (gamepad.buttons[3].pressed) {
      state = state | GamepadDPadState.FIRE4;
    }

    return state;
  }
  private gamepadButtonsArePressed(
    gamepadButtons: readonly GamepadButton[],
    pressedButtons: number[]
  ): boolean {
    return this.gamepadButtonsHavePressedState(
      gamepadButtons,
      pressedButtons,
      true
    );
  }
  private gamepadButtonsAreNotPressed(
    gamepadButtons: readonly GamepadButton[],
    notPressedButtons: number[]
  ): boolean {
    return this.gamepadButtonsHavePressedState(
      gamepadButtons,
      notPressedButtons,
      false
    );
  }
  private gamepadButtonsHavePressedState(
    gamepadButtons: readonly GamepadButton[],
    buttonsToCheck: number[],
    desiredState: boolean
  ): boolean {
    for (const buttonIndex of buttonsToCheck) {
      if (gamepadButtons[buttonIndex]?.pressed !== desiredState) return false;
    }
    return true;
  }
  private getVirtualJoystick(): GamepadJoystickState {
    const floatingState = this.virtualGamepad.getGamepadJoystickState();
    return this.floatsToIntegers(floatingState[0], floatingState[1]);
  }
  private floatsToIntegers(x: number, y: number): GamepadJoystickState {
    return [
      Math.min(255, Math.round(x * 128 + 128)),
      Math.min(255, Math.round(y * 128 + 128)),
    ];
  }
  getJoystick(index: number): GamepadJoystickState {
    const gamepad = this.getHardwareGamepadByIndex(index);
    if (!gamepad) {
      if (index === 0) return this.getVirtualJoystick();
      return [0, 0];
    }

    return this.floatsToIntegers(gamepad.axes[0], gamepad.axes[1]);
  }
  reset(): void {}
}
7;
