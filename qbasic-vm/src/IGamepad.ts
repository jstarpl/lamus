/**
	Copyright 2021 Jan Starzak

	This file is part of qbasic-vm

	qbasic-vm is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	qbasic-vm is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with qbasic-vm.  If not, see <http://www.gnu.org/licenses/>.
*/

export interface IGamepad {
	getDPad(index: number): GamepadDPadState
	getJoystick(index: number): GamepadJoystickState

	reset(): void
}

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

export type GamepadJoystickState = [number, number]
