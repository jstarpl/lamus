declare module 'seq-emitter' {
	import * as MMLIterator from '@jstarpl/mml-iterator'

	class SeqEmitter {
		constructor(tracks: MMLIterator, config: { context?: AudioContext })
		scheduler: {
			context: AudioContext
			interval: number
			aheadTime: number
			timerAPI: any
			playbackTime: number
			currentTime: number
			state: string
			events: any[]
			process(): void
		}
		state: 'running' | 'suspended' | 'closed'
		on(event: 'note' | 'end:all', handler: (e: any) => void): void
		start(): void
		stop(): void
	}

	export = SeqEmitter
}
