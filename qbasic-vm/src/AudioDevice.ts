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

import * as MMLIterator from 'mml-iterator'
import SeqEmitter = require('seq-emitter')
import { IAudioDevice } from './IAudioDevice'

interface IMMLEmitterConfig {
	MMLIterator?: MMLIterator
	reverseOctave?: boolean
	context?: AudioContext
}

// Taken from: mml-emitter by Nao Yonamine
// https://github.com/mohayonao/mml-emitter
// License: MIT
class MMLEmitter extends SeqEmitter {
	tracksNum: number

	constructor(source: string, config: IMMLEmitterConfig = {}) {
		if (config.reverseOctave) {
			source = MMLEmitter.reverseOctave(source)
		}

		const MMLIteratorClass = config.MMLIterator || MMLIterator
		let lastTempo: number | undefined = undefined
		const tracks = source
			.toLowerCase()
			.split(/[;,]/)
			.filter(source => !!source.trim())
			// strip out MML header
			.map(source => source.replace(/^MML@/, ''))
			// MML songs available on the internet often assume the player is going
			// to use the same tempo as in the previous track
			.map(track => {
				const tempo = track.match(/t(\d+)/i)
				if (!tempo && lastTempo) {
					return `t${lastTempo}` + track
				} else if (tempo) {
					lastTempo = parseInt(tempo[1], 10)
				}
				return track
			})
			.map(track => new MMLIteratorClass(track, config))

		super(tracks, config)

		this.tracksNum = tracks.length
	}

	private static reverseOctave(source) {
		return source.replace(/[<>]/g, str => (str === '<' ? '>' : '<'))
	}
}

export class AudioDevice implements IAudioDevice {
	private beeps: HTMLAudioElement[] = []
	private managedAudioElements: HTMLAudioElement[] = []
	private audioContext: AudioContext
	private currentMMLEmitter: MMLEmitter | undefined

	constructor() {
		this.reset()
	}

	beep(num: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const endedHandler = () => {
				resolve()
				this.beeps[num].removeEventListener('ended', endedHandler)
			}
			if (!this.beeps[num]) reject('Beep not set')
			this.beeps[num].currentTime = 0
			this.beeps[num].addEventListener('ended', endedHandler)
			this.beeps[num].play().catch((e) => reject(e))
		})
	}
	addBeep(urlOrData: string | Blob | HTMLAudioElement): Promise<number> {
		return new Promise((resolve, reject) => {
			let beepAudio: HTMLAudioElement
			if (typeof urlOrData === 'string') {
				beepAudio = new Audio(urlOrData)
				document.body.appendChild(beepAudio)
				this.managedAudioElements.push(beepAudio)
			} else if (urlOrData instanceof HTMLAudioElement) {
				beepAudio = urlOrData
			} else {
				beepAudio = new Audio(URL.createObjectURL(urlOrData))
				document.body.appendChild(beepAudio)
				this.managedAudioElements.push(beepAudio)
			}
			beepAudio.style.display = 'none'
			const idx = this.beeps.push(beepAudio)
			if ((beepAudio.networkState === 2 || beepAudio.readyState < 4) && !beepAudio.error) {
				beepAudio.addEventListener('canplaythrough', () => {
					resolve(idx)
				})
				beepAudio.addEventListener('error', (e) => {
					reject(e)
				})
			} else {
				if (beepAudio.error) {
					reject(beepAudio.error)
					return
				}
				resolve(idx)
			}
		})
	}
	clearBeep(num: number): void {
		delete this.beeps[num]
	}
	playMusic(mml: string, repeat?: number): Promise<void> {
		return new Promise<void>((resolve) => {
			const config = { context: this.audioContext }

			if (this.currentMMLEmitter) {
				this.currentMMLEmitter.stop()
				this.currentMMLEmitter = undefined
			}

			const mmlEmitter = new MMLEmitter(mml, config)
			mmlEmitter.on('note', (e) => {
				// console.log('NOTE: ' + JSON.stringify(e))
				this.playNote(e)
			})
			mmlEmitter.on('end:all', () => {
				// console.log('END : ' + JSON.stringify(e))
				// loop forever
				if (repeat === undefined || repeat > 1) {
					resolve(this.playMusic(mml, repeat === undefined ? undefined : repeat - 1))
				} else {
					this.currentMMLEmitter = undefined
					resolve()
				}
			})

			mmlEmitter.start()
			this.currentMMLEmitter = mmlEmitter
		})
	}
	stopMusic(): void {
		if (this.currentMMLEmitter) {
			this.currentMMLEmitter.stop()
			this.currentMMLEmitter = undefined
		}
	}
	isPlayingMusic(): boolean {
		return !this.currentMMLEmitter
	}
	private mtof(noteNumber: number) {
		return 440 * Math.pow(2, (noteNumber - 69) / 12)
	}
	private playNote(e: any) {
		const t0 = e.playbackTime
		const t1 = t0 + e.duration * (e.quantize / 100)
		const t2 = t1 + 0.5
		const osc1 = this.audioContext.createOscillator()
		const osc2 = this.audioContext.createOscillator()
		const amp = this.audioContext.createGain()
		const volume = (1 / this.currentMMLEmitter!.tracksNum / 3) * (e.velocity / 128)

		osc1.frequency.value = this.mtof(e.noteNumber)
		osc1.detune.setValueAtTime(+12, t0)
		osc1.detune.linearRampToValueAtTime(+1, t1)
		osc1.start(t0)
		osc1.stop(t2)
		osc1.connect(amp)

		osc2.frequency.value = this.mtof(e.noteNumber)
		osc2.detune.setValueAtTime(-12, t0)
		osc2.detune.linearRampToValueAtTime(-1, t1)
		osc2.start(t0)
		osc2.stop(t2)
		osc2.connect(amp)

		amp.gain.setValueAtTime(volume, t0)
		amp.gain.setValueAtTime(volume, t1)
		amp.gain.exponentialRampToValueAtTime(1e-3, t2)
		amp.connect(this.audioContext.destination)
	}
	makeSound(frequency: number, duration: number, volume = 0.05): Promise<void> {
		frequency = Math.min(Math.max(12, frequency), 4000)
		return new Promise<void>((resolve) => {
			const baseTime = this.audioContext.currentTime
			const t0 = baseTime
			const t1 = t0 + duration / 1000
			const t2 = t1 + duration / 1000
			const osc1 = this.audioContext.createOscillator()
			const amp = this.audioContext.createGain()

			osc1.frequency.value = frequency
			osc1.detune.setValueAtTime(+12, t0)
			osc1.detune.linearRampToValueAtTime(+1, t1)
			osc1.start(t0)
			osc1.stop(t2)
			osc1.connect(amp)

			amp.gain.setValueAtTime(volume, t0)
			amp.gain.setValueAtTime(volume, t1)
			amp.gain.exponentialRampToValueAtTime(1e-3, t2)
			amp.connect(this.audioContext.destination)
			osc1.addEventListener('ended', () => {
				resolve()
			})
		})
	}
	async reset(): Promise<void> {
		this.beeps.length = 0
		for (const element of this.managedAudioElements) {
			try {
				document.body.removeChild(element)
			} catch (e) {
				console.error('Could not remove managed Audio Element: ', e)
			}
		}
		this.managedAudioElements.length = 0
		if (this.audioContext && (this.audioContext.state === 'running' || this.audioContext.state === 'suspended')) {
			try {
				await this.audioContext.close()
			} catch (e) {
				console.error('Could not close audioContext: ', e)
			}
		}
		this.audioContext = new AudioContext()
	}
}
