declare module 'seq-emitter' {
	import * as MMLIterator from 'mml-iterator'

	class SeqEmitter {
		constructor(tracks: MMLIterator, config: { context?: AudioContext })
		public on(event: 'note' | 'end:all', handler: (e: any) => void): void
		public start(): void
		public stop(): void
	}

	export = SeqEmitter
}
