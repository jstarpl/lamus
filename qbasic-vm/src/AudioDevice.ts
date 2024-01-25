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

type Waveform = 'triangle' | 'sawtooth' | 'square' | 'noise' | 'sine' | 'sineRing'

/** This is WaveForm type, Attack, Decay, Sustain, Release, PulseWidth, Tremolo, Vibrato */
type Envelope = [Waveform, number, number, number, number, number, number, number]
enum EnvelopeProp {
	Type = 0,
	Attack = 1,
	Decay = 2,
	Sustain = 3,
	Release = 4,
	PulseWidth = 5,
	Tremolo = 6,
	Vibrato = 7,
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
			const osc1 = new OscillatorNode(this.audioContext, {
				frequency,
			})
			const amp = new GainNode(this.audioContext)

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
			0: ['square', 0, 0.6, 0, 0, 0.4, 0, 0],
			// Accordion
			1: ['sawtooth', 0.8, 0, 0.8, 0, 0, 0.2, 0],
			// Calliope
			2: ['triangle', 0, 0, 0.06, 0, 0, 0.5, 0],
			// Drum
			3: ['noise', 0, 0.5, 0.5, 0, 0, 0, 0],
			// Flute
			4: ['triangle', 0.6, 0.26, 0.26, 0, 0, 0, 0],
			// Guitar
			5: ['sawtooth', 0, 0.6, 0.13, 0.06, 0, 0, 0],
			// Harpsichord
			6: ['square', 0, 0.6, 0, 0, 0.12, 0, 0],
			// Organ
			7: ['square', 0, 0.6, 0.6, 0, 0.5, 0.1, 0],
			// Trumpet
			8: ['square', 0.5, 0.6, 0.26, 0.06, 0.12, 0, 0],
			// Xylophone
			9: ['triangle', 0, 0.6, 0, 0, 0.1, 0, 0],
			// Electric piano
			10: ['sine', 0, 0.6, 0, 0.1, 0, 0, 0],
			// Lazer
			11: ['sineRing', 0.2, 0, 1, 0.5, 0.18, 0, 0],
		}
	}
	private generateNoiseBuffer() {
		const audioContext = this.audioContext
		// we want 2 seconds worth, so that the looping is not noticable
		const bufferSize = 2 * audioContext.sampleRate
		const noiseBuffer = new AudioBuffer({
			length: bufferSize,
			sampleRate: audioContext.sampleRate,
		})
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
		const output = new GainNode(this.audioContext, {
			gain: volume,
		})
		const adsrEnvelope = new GainNode(this.audioContext)

		const attack = Math.max(Math.min(envelope[EnvelopeProp.Attack], duration), 0)
		const decay = Math.max(Math.min(envelope[EnvelopeProp.Decay], duration - attack), 0) * 3
		const sustain = Math.max(envelope[EnvelopeProp.Sustain], 0)
		const release = Math.max(envelope[EnvelopeProp.Release], 0.05)
		const pulseWidth = Math.min(Math.max(envelope[EnvelopeProp.PulseWidth], 0), 1)

		const tremolo = Math.min(Math.max(envelope[EnvelopeProp.Tremolo], 0), 1)
		// const vibrato = Math.min(Math.max(envelope[EnvelopeProp.Vibrato], 0), 1)

		const t0 = start
		const t1 = t0 + duration
		const t2 = t1 + release

		switch (envelope[EnvelopeProp.Type]) {
			case 'sawtooth':
			case 'sine':
			case 'triangle':
				this.createBasicOscillator(adsrEnvelope, envelope[EnvelopeProp.Type], noteNumber, start, duration, release)
				break
			case 'noise':
				this.createNoiseGenerator(adsrEnvelope, noteNumber, start, duration, release)
				break
			case 'square':
				this.createPulseOscillator(adsrEnvelope, noteNumber, start, duration, release, pulseWidth)
				break
			case 'sineRing':
				this.createRingSineOscillator(adsrEnvelope, noteNumber, start, duration, release, pulseWidth)
				break
			default:
				this.createBasicOscillator(adsrEnvelope, 'sine', noteNumber, start, duration, release)
				break
		}

		if (attack === 0) {
			adsrEnvelope.gain.setValueAtTime(1, t0)
		} else {
			adsrEnvelope.gain.setValueAtTime(0, t0)
			adsrEnvelope.gain.linearRampToValueAtTime(0, t0 + attack)
			adsrEnvelope.gain.setValueAtTime(1, t0 + attack)
		}

		if (decay !== 0) {
			adsrEnvelope.gain.linearRampToValueAtTime(sustain, t0 + attack + decay)
			adsrEnvelope.gain.setValueAtTime(sustain, t0 + attack + decay)
		}

		adsrEnvelope.gain.setValueAtTime(sustain, t1)
		adsrEnvelope.gain.linearRampToValueAtTime(0, t2)

		adsrEnvelope.connect(output)

		if (tremolo > 0) {
			const tremoloEfx = this.createTremolo(tremolo, t0, duration + release)
			tremoloEfx.connect(output.gain)
		}

		return output
	}
	private createTremolo(amount: number, start: number, duration: number): AudioNode {
		const t0 = start
		const t1 = t0 + duration

		const lfo = new OscillatorNode(this.audioContext, {
			type: 'sine',
			frequency: 8,
		})
		const level = new ConstantSourceNode(this.audioContext, {
			offset: -1,
		})
		const output = new GainNode(this.audioContext, {
			gain: 0.5 * amount,
		})
		lfo.connect(output)
		level.connect(output)

		lfo.start(t0)
		lfo.stop(t1)
		level.start(t0)
		level.stop(t1)

		return output
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
		const sawtooth = new OscillatorNode(this.audioContext, {
			type: 'sawtooth',
			frequency: this.noteToFreq(noteNumber),
		})
		// shape the output into a pulse wave.
		// const squareShaper = new WaveShaperNode(audioContext, { curve: SQUARE_CURVE })
		const squareShaper = new WaveShaperNode(this.audioContext, {
			curve: SQUARE_CURVE,
		})
		// create a constant signal level to offset the sawtooth
		const constantLevel = new ConstantSourceNode(this.audioContext, {
			offset: pulseWidth - 0.5,
		})

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

		var whiteNoise = new AudioBufferSourceNode(this.audioContext, {
			buffer: this.noiseBuffer,
			loop: true,
			detune: 240 * (noteNumber - 70),
		})
		whiteNoise.start(t0)
		whiteNoise.stop(t2)

		whiteNoise.connect(output)
	}
	private createRingSineOscillator(
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

		const modulator = new GainNode(this.audioContext)
		this.createBasicOscillator(modulator, 'sawtooth', noteNumber, start, duration, release)

		const modulation = new OscillatorNode(this.audioContext, {
			type: 'sine',
			frequency: pulseWidth * 100,
		})

		modulation.start(t0)
		modulation.stop(t2)

		modulator.gain.value = -1
		modulation.connect(modulator.gain)

		modulator.connect(output)
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
		const osc1 = new OscillatorNode(this.audioContext, {
			type,
			frequency: this.noteToFreq(noteNumber),
		})
		const osc2 = new OscillatorNode(this.audioContext, {
			type,
			frequency: this.noteToFreq(noteNumber),
		})

		osc1.detune.setValueAtTime(+12, t0)
		osc1.detune.linearRampToValueAtTime(+1, t1)
		osc1.start(t0)
		osc1.stop(t2)
		osc1.connect(output)

		osc2.detune.setValueAtTime(-12, t0)
		osc2.detune.linearRampToValueAtTime(-1, t1)
		osc2.start(t0)
		osc2.stop(t2)
		osc2.connect(output)
	}
}
