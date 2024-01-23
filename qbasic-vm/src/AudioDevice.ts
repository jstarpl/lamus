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

import MMLIterator from '@jstarpl/mml-iterator'
import SeqEmitter = require('seq-emitter')
import { IAudioDevice } from './IAudioDevice'

interface IMMLEmitterConfig {
	MMLIterator?: typeof MMLIterator
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
			.filter((source) => !!source.trim())
			// strip out MML header
			.map((source) => source.replace(/^MML/, ''))
			.map((source) => source.replace(/#/g, '+'))
			.map((source) => source.replace(/&/g, '^'))
			// MML songs available on the internet often assume the player is going
			// to use the same tempo as in the previous track
			.map((track) => {
				const tempo = track.match(/t(\d+)/i)
				if (!tempo && lastTempo) {
					return `t${lastTempo}` + track
				} else if (tempo) {
					lastTempo = parseInt(tempo[1], 10)
				}
				return track
			})
			.map((track) => new MMLIteratorClass(track, config))

		super(tracks, config)

		this.tracksNum = tracks.length
	}

	private static reverseOctave(source) {
		return source.replace(/[<>]/g, (str) => (str === '<' ? '>' : '<'))
	}
}

type AudioDeviceEvents = 'musicEnd'
type EventHandler = () => void

type Waveform = 'triangle' | 'sawtooth' | 'square' | 'noise' | 'sineRing' | 'sine'

/** This is WaveForm type, Attack, Decay, Sustain, Release, PulseWidth */
type Envelope = [Waveform, number, number, number, number, number]
enum EnvelopeProp {
	Type = 0,
	Attack = 1,
	Decay = 2,
	Sustain = 3,
	Release = 4,
	PulseWidth = 5,
}

// create new curve that will flatten values [0:127] to -1 and [128:255] to 1
const SQUARE_CURVE = new Float32Array(256)
SQUARE_CURVE.fill(-1, 0, 128)
SQUARE_CURVE.fill(1, 128, 256)

// constant signal on level 1
const CONSTANT_CURVE = new Float32Array(2)
CONSTANT_CURVE[0] = 1
CONSTANT_CURVE[1] = 1

export class AudioDevice implements IAudioDevice {
	private beeps: HTMLAudioElement[] = []
	private managedAudioElements: HTMLAudioElement[] = []
	private audioContext: AudioContext
	private currentMMLEmitter: MMLEmitter | undefined
	private eventListeners: Partial<Record<AudioDeviceEvents, EventHandler[]>>
	private volume: number
	private envelopes: Partial<Record<number, Envelope>>

	private noiseBuffer: AudioBuffer

	constructor() {
		this.reset().catch(console.error)
		void this.noiseBuffer
		void this.envelopes
	}

	setMusicVolume(volume: number): void {
		this.volume = volume
	}
	setMusicSynth(_synth: number): void {
		throw new Error('Method not implemented.')
	}
	setMusicSynthProperties(
		_synth: number,
		_attack: number,
		_decay: number,
		_sustain: number,
		_release: number,
		_waveform: Waveform,
		_pulseWidth: number
	) {
		throw new Error('Method not implemented.')
	}
	addEventListener(event: 'musicEnd', listener: () => void): void {
		const listeners = this.eventListeners[event] ?? []
		listeners.push(listener)
		this.eventListeners[event] = listeners
	}
	removeEventListener(event: 'musicEnd', listener: () => void): void {
		const listeners = this.eventListeners[event] ?? []
		const idx = listeners.indexOf(listener)
		if (idx < 0) return
		listeners.splice(idx, 1)
		this.eventListeners[event] = listeners
	}

	async beep(num: number): Promise<void> {
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
	async addBeep(urlOrData: string | Blob | HTMLAudioElement): Promise<number> {
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
	async playMusic(mml: string, repeat?: number): Promise<void> {
		return new Promise<void>((resolve) => {
			const config = { context: this.audioContext }

			if (this.currentMMLEmitter) {
				this.currentMMLEmitter.stop()
				this.currentMMLEmitter = undefined
			}

			const mmlEmitter = new MMLEmitter(mml, config)
			mmlEmitter.on('note', (e) => {
				// console.log('NOTE: ' + e)
				this.onMMLNote(e)
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
	private noteToFreq(noteNumber: number) {
		return 440 * Math.pow(2, (noteNumber - 69) / 12)
	}
	private onMMLNote(e: any) {
		if (!this.currentMMLEmitter) return
		const start = e.playbackTime
		const duration = e.duration * (e.quantize / 100)
		const volume = (1 / this.currentMMLEmitter.tracksNum / 3) * (e.velocity / 128)
		const noteNumber = e.noteNumber
		const instrument = e.instrument
		this.playNote(start, duration, volume, noteNumber, instrument)
	}
	playNote(
		start: number | null,
		duration: number,
		noteVolume: number,
		noteNumber: number,
		instrument: number | undefined
	) {
		start = start ?? this.audioContext.currentTime
		const volume = noteVolume * this.volume

		const envelope = (instrument ? this.envelopes[instrument] : undefined) ?? (this.envelopes[0] as Envelope)

		const graph = this.createGraphForNote(noteNumber, start, duration, volume, envelope)

		graph.connect(this.audioContext.destination)
	}
	async makeSound(frequency: number, duration: number, volume = 0.05): Promise<void> {
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
		this.volume = 1
		this.eventListeners = {}

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
		this.envelopes = AudioDevice.getDefaultEnvelopes()
		this.generateNoiseBuffer()
	}
	private static getDefaultEnvelopes(): Record<number, Envelope> {
		return {
			// Piano
			0: ['square', 0, 0.6, 0, 0, 0.4],
			// Accordion
			1: ['sawtooth', 0.8, 0, 0.8, 0, 0],
			// Calliope
			2: ['triangle', 0, 0, 0.06, 0, 0],
			// Drum
			3: ['noise', 0, 0.5, 0.5, 0, 0],
			// Flute
			4: ['triangle', 0.6, 0.26, 0.26, 0, 0],
			// Guitar
			5: ['sawtooth', 0, 0.6, 0.13, 0.06, 0],
			// Harpsichord
			6: ['square', 0, 0.6, 0, 0, 0.12],
			// Organ
			7: ['square', 0, 0.6, 0.6, 0, 0.5],
			// Trumpet
			8: ['square', 0.5, 0.6, 0.26, 0.06, 0.12],
			// Xylophone
			9: ['triangle', 0, 0.6, 0, 0, 0],
			// Electric piano
			10: ['sine', 0.1, 2, 0, 0.1, 0],
		}
	}
	private generateNoiseBuffer() {
		const audioContext = this.audioContext
		// we want 2 seconds worth, so that the looping is not noticable
		const bufferSize = 2 * audioContext.sampleRate
		const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
		const output = noiseBuffer.getChannelData(0)
		for (var i = 0; i < bufferSize; i++) {
			output[i] = Math.random() * 2 - 1
		}
		this.noiseBuffer = noiseBuffer
	}
	private createGraphForNote(
		noteNumber: number,
		start: number,
		duration: number,
		volume: number,
		envelope: Envelope
	): AudioNode {
		const amp = this.audioContext.createGain()

		const attack = Math.max(Math.min(envelope[EnvelopeProp.Attack], duration), 0)
		const decay = Math.min(envelope[EnvelopeProp.Decay], duration - attack) * 3
		const sustain = Math.max(envelope[EnvelopeProp.Sustain], 0) * volume
		const release = Math.max(envelope[EnvelopeProp.Release], 0.1)
		const pulseWidth = envelope[EnvelopeProp.PulseWidth]

		const t0 = start
		const t1 = t0 + duration
		const t2 = t1 + release

		switch (envelope[EnvelopeProp.Type]) {
			case 'sawtooth':
			case 'sine':
			case 'triangle':
				this.createBasicOscillator(amp, envelope[EnvelopeProp.Type], noteNumber, start, duration, release)
				break
			case 'noise':
				this.createNoiseGenerator(amp, noteNumber, start, duration, release)
				break
			case 'square':
				this.createPulseOscillator(amp, noteNumber, start, duration, release, pulseWidth)
				break
			default:
				this.createBasicOscillator(amp, 'sine', noteNumber, start, duration, release)
				break
		}

		if (attack === 0) {
			amp.gain.setValueAtTime(volume, t0)
		} else {
			amp.gain.setValueAtTime(0, t0)
			amp.gain.linearRampToValueAtTime(volume, t0 + attack)
			amp.gain.setValueAtTime(volume, t0 + attack)
		}

		if (decay !== 0) {
			amp.gain.linearRampToValueAtTime(sustain, t0 + attack + decay)
			amp.gain.setValueAtTime(sustain, t0 + attack + decay)
		}

		amp.gain.linearRampToValueAtTime(sustain, t1)
		amp.gain.linearRampToValueAtTime(1e-3, t2)

		return amp
	}
	private createPulseOscillator(
		output: AudioNode,
		noteNumber: number,
		start: number,
		duration: number,
		release: number,
		pulseWidth: number
	) {
		const t0 = start
		const t1 = t0 + duration
		const t2 = t1 + release

		// use a normal oscillator as the basis of pulse oscillator.
		// const oscillator = new OscillatorNode(audioContext, { type: 'sawtooth' })
		const sawtooth = this.audioContext.createOscillator()
		sawtooth.type = 'sawtooth'
		sawtooth.frequency.value = this.noteToFreq(noteNumber)
		// shape the output into a pulse wave.
		// const squareShaper = new WaveShaperNode(audioContext, { curve: SQUARE_CURVE })
		const squareShaper = this.audioContext.createWaveShaper()
		squareShaper.curve = SQUARE_CURVE
		// create a constant signal level to offset the sawtooth
		const constantLevel = this.audioContext.createConstantSource()
		constantLevel.offset.value = pulseWidth - 0.5

		sawtooth.start(t0)
		sawtooth.stop(t2)

		constantLevel.start(t0)
		constantLevel.stop(t2)

		sawtooth.connect(squareShaper)
		constantLevel.connect(squareShaper)

		squareShaper.connect(output)
	}
	private createNoiseGenerator(
		output: AudioNode,
		noteNumber: number,
		start: number,
		duration: number,
		release: number
	) {
		const t0 = start
		const t1 = t0 + duration
		const t2 = t1 + release

		var whiteNoise = this.audioContext.createBufferSource()
		whiteNoise.buffer = this.noiseBuffer
		whiteNoise.loop = true
		whiteNoise.start(t0)
		whiteNoise.stop(t2)

		whiteNoise.detune.setValueAtTime(240 * (noteNumber - 70), t0)

		whiteNoise.connect(output)
	}
	private createBasicOscillator(
		output: AudioNode,
		type: 'sine' | 'triangle' | 'sawtooth',
		noteNumber: number,
		start: number,
		duration: number,
		release: number
	) {
		const t0 = start
		const t1 = t0 + duration
		const t2 = t1 + release
		const osc1 = this.audioContext.createOscillator()
		const osc2 = this.audioContext.createOscillator()

		osc1.type = type
		osc2.type = type

		osc1.frequency.value = this.noteToFreq(noteNumber)
		osc1.detune.setValueAtTime(+12, t0)
		osc1.detune.linearRampToValueAtTime(+1, t1)
		osc1.start(t0)
		osc1.stop(t2)
		osc1.connect(output)

		osc2.frequency.value = this.noteToFreq(noteNumber)
		osc2.detune.setValueAtTime(-12, t0)
		osc2.detune.linearRampToValueAtTime(-1, t1)
		osc2.start(t0)
		osc2.stop(t2)
		osc2.connect(output)
	}
}
