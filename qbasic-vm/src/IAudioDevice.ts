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

export interface IAudioDevice {
	beep(num: number): Promise<void>
	addBeep(data: string | Blob): Promise<number>
	clearBeep(num: number): void

	playMusic(str: string, repeat?: number): Promise<void>
	stopMusic(): void
	isPlayingMusic(): boolean
	setMusicVolume(volume: number): void
	setMusicSynth(synth: number): void
	setMusicSynthProperties(
		synth: number,
		waveform: 'triangle' | 'sawtooth' | 'square' | 'noise' | 'sineRing' | 'sine',
		attack: number,
		decay: number,
		sustain: number,
		release: number,
		pulseWidth: number,
		tremolo: number,
		vibrato: number
	)
	makeSound(frequency: number, duration: number, volume?: number): Promise<void>

	addEventListener(event: 'musicEnd', listener: () => void): void
	removeEventListener(event: 'musicEnd', listener: () => void): void

	reset(): Promise<void>
}
