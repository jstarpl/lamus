/**
	Copyright 2010 Steve Hanov
	Copyright 2019 Jan Starzak

	This file is part of qbasic-vm
	File originally sourced from qb.js, also licensed under GPL v3

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

// Fix a problem with setTimeout/clearTimeout NodeJS vs Web
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./types/timeout.fix.d.ts" />

import { sprintf, getDebugConsole as dbg } from './DebugConsole'
import { Instruction } from './CodeGenerator'
import {
	DeriveTypeNameFromVariable,
	ScalarVariable,
	SomeScalarType,
	ArrayVariable,
	Dimension,
	SomeType,
	StringType,
	JSONType,
	IsNumericType,
	IsStringType,
	IntegerType,
} from './Types'
import { IConsole, STRUCTURED_INPUT_MATCH } from './IConsole'
import { IAudioDevice } from './IAudioDevice'
import { INetworkAdapter } from './INetworkAdapter'
import { IGeneralIO } from './IGeneralIO'
import { ICryptography } from './ICryptography'
import { QBasicProgram } from './QBasic'
import { Locus } from './Tokenizer'
import { EventEmitter } from 'eventemitter3'
import * as jsonPath from 'jsonpath'
import { FileAccessMode, IFileSystem } from './IFileSystem'

export enum RuntimeErrorCodes {
	DIVISION_BY_ZERO = 101,
	STACK_OVERFLOW = 201,
	STACK_UNDERFLOW = 202,
	UKNOWN_SYSCALL = 301,
	IO_ERROR = 401,
	INVALID_ARGUMENT = 405,
}

export class RuntimeError extends Error {
	private _code: RuntimeErrorCodes
	get code(): RuntimeErrorCodes {
		return this._code
	}
	private _locus: Locus | undefined
	get locus(): Locus | undefined {
		return this._locus
	}
	constructor(code: RuntimeErrorCodes, message: string, locus?: Locus) {
		super(message)
		this._code = code
		this._locus = locus
	}
}

export class TraceBuffer {
	readonly MAX_LINES = 200
	lines: string[] = []

	public toString(): string {
		return this.lines.join('')
	}

	public printf(...args: any[]): void {
		const str = sprintf(args)
		this.lines.push(str)
		if (this.lines.length > this.MAX_LINES) {
			this.lines.shift()
		}
		dbg().printf('%s', str)
	}
}

export class StackFrame {
	// Address to return to when the subroutine has ended.
	pc: number

	// map from name to the Scalar or Array variable.
	variables: object = {}

	constructor(pc: number) {
		this.pc = pc
		this.variables = {}
	}
}

const DEBUG = false

/**
 The VirtualMachine runs the bytecode given to it. It can run in one of two
 modes: Synchronously or Asynchronously.

 In synchronous mode, the program is run to completion before returning from
 the run() function. This can cause a browser window to freeze until execution
 completes.

 In asynchronous mode, a javascript interval is used. Every so often, we run
 some instructions and then stop. That way, the program appears to run while
 letting the user use the browser window.
 */
export class VirtualMachine extends EventEmitter<'error' | 'suspended' | 'running' | 'finished' | 'reset'> {
	// Stack
	stack: any[] = []

	// program counter.
	pc = 0

	// list of StackFrames. The last one is searched for variable references.
	// Failing that, the first one ( the main procedure ) is searched for any
	// shared variables matching the name.
	callstack: StackFrame[] = []

	// The console.
	cons: IConsole

	// The audio device
	audio: IAudioDevice | undefined

	// The file system
	fileSystem: IFileSystem | undefined

	// The network adapter
	networkAdapter: INetworkAdapter | undefined

	// The general I/O adapter
	generalIo: IGeneralIO | undefined

	// The cryptography engine
	cryptography: ICryptography | undefined

	// The bytecode (array of Instruction objects)
	instructions: Instruction[] = []

	// Array of user defined times.
	types: { [key: string]: SomeType } = {}

	// set of names of shared variables.
	shared: object = {}

	// Trace buffer for debugging.
	trace: TraceBuffer = new TraceBuffer()

	// Index of next data statement to be read.
	dataPtr = 0

	// Array of strings or numbers from the data statements.
	data: any[] = []

	// True if we are running asynchronously.
	asynchronous = false

	// True if the virtual machine is suspended for some reason (for example,
	// waiting for user input)
	suspended = false // eg. for INPUT statement.

	// The javascript interval used for running asynchronously.
	interval: number | undefined = undefined

	// Number of milliseconds between intervals
	private readonly INTERVAL_MS = 66 // ~15 fps

	// Number of instructions to run in an interval
	instructionsPerInterval = 32 * 1024

	// The last random number generated by a RND function. We have to remember
	// it because RND 0 returns the last one generated.
	lastRandomNumber = 0

	private defaultType: SomeScalarType

	frame: StackFrame

	cwd = ''

	// Status flag
	status = 0

	/**
	 * @param console A Console object that will be used as the screen.
	 */
	constructor(
		console: IConsole,
		audio?: IAudioDevice,
		networkAdapter?: INetworkAdapter,
		fileSystem?: IFileSystem,
		generalIo?: IGeneralIO,
		cryptography?: ICryptography
	) {
		super()
		this.cons = console
		this.audio = audio
		this.networkAdapter = networkAdapter
		this.fileSystem = fileSystem
		this.generalIo = generalIo
		this.cryptography = cryptography

		if (!DEBUG) {
			this.trace = {
				printf: function () {
					// a noop
				},
			} as TraceBuffer
		}
	}

	/**
	 Resets the virtual machine, halting any running program.
	*/
	public reset(program?: QBasicProgram): void {
		if (program) {
			this.assignProgram(program)
		} else {
			this.instructions.length = 0
		}

		this.stack.length = 0
		this.callstack.length = 0
		this.callstack.push(new StackFrame(this.instructions.length))
		this.frame = this.callstack[0]
		this.dataPtr = 0
		this.suspended = false
		this.status = 0
		if (this.interval) {
			clearInterval(this.interval)
			this.interval = undefined
		}

		this.pc = 0
		if (program) {
			this.cons.reset(program.testMode)
		} else {
			this.cons.reset()
		}
		this.audio?.reset().catch(console.error)
		this.networkAdapter?.reset().catch(console.error)
		this.generalIo?.reset()
		this.cryptography?.reset().catch(console.error)

		this.emit('reset')
	}

	private assignProgram(program: QBasicProgram): void {
		this.instructions = program.instructions
		this.types = program.types
		this.defaultType = program.defaultType
		this.data = program.data
		this.shared = program.shared
	}

	/**
	 Run a program to completion in synchronous mode, or
	Starts running a program in asynchronous mode.

	In asynchronous mode, it returns immediately.
	*/
	public run(program: QBasicProgram, synchronous: boolean): void {
		this.reset(program)
		this.asynchronous = !synchronous

		this.emit('running')
		if (synchronous) {
			try {
				while (this.pc < this.instructions.length) {
					this.runOneInstruction()
				}
			} catch (e) {
				this.emit('error', e)
			} finally {
				this.emit('finished')
			}
		} else {
			this.interval = setInterval(() => this.runSome(), this.INTERVAL_MS)
		}
	}

	/**
	 Suspend the CPU, maintaining all state. This happens when the program
	is waiting for user input.
	*/
	public suspend(): void {
		this.suspended = true
		this.emit('suspended')
		if (this.asynchronous) {
			clearInterval(this.interval)
		}
	}

	/**
	 Resume the CPU, after previously being suspended.
	*/
	public resume(): void {
		this.suspended = false
		this.emit('running')
		if (this.asynchronous) {
			this.runSome()
			this.interval = setInterval(() => this.runSome(), this.INTERVAL_MS)
		}
	}

	/**
	 Runs some instructions during asynchronous mode.
	*/
	public runSome(): void {
		try {
			for (let i = 0; i < this.instructionsPerInterval && this.pc < this.instructions.length && !this.suspended; i++) {
				this.runOneInstruction()
			}
		} catch (e) {
			this.suspend()
			if (e instanceof RuntimeError) {
				this.emit('error', e)
			} else {
				throw e
			}
		}

		if (this.pc === this.instructions.length) {
			clearInterval(this.interval)
			this.emit('finished')
		}
	}

	public runOneInstruction(): void {
		const instr = this.instructions[this.pc++]
		try {
			if (DEBUG) {
				this.trace.printf('Execute [%s] %s\n', this.pc - 1, instr)
			}
			instr.instr.execute(this, instr.arg)
		} catch (e) {
			if (e instanceof RuntimeError) {
				throw new RuntimeError(e.code, e.message, instr.locus)
			} else {
				throw e
			}
		}
	}

	/**
	 * Run all instructions on the current line of the program
	 */
	public runOneLine(): void {
		const currentLocus = this.instructions[this.pc].locus
		let i = 0
		do {
			this.runOneInstruction()
		} while (this.instructions[this.pc].locus.line === currentLocus.line && i++ < this.instructionsPerInterval) // don't get stuck in infinite loops
	}

	public setVariable(name: string, value: ScalarVariable<any> | ArrayVariable<any>): void {
		if (this.shared[name]) {
			this.callstack[0].variables[name] = value
		} else {
			this.frame.variables[name] = value
		}
	}

	public getVariable(name: string): ScalarVariable<any> | ArrayVariable<any> {
		let frame: StackFrame
		if (this.shared[name]) {
			frame = this.callstack[0]
		} else {
			frame = this.frame
		}

		if (frame.variables[name]) {
			return frame.variables[name]
		} else {
			// must create variable
			const typeName = DeriveTypeNameFromVariable(name)
			let type: SomeScalarType
			if (typeName === null) {
				type = this.defaultType
			} else {
				type = this.types[typeName] as SomeScalarType
			}

			const scalar = new ScalarVariable<any>(type, type.createInstance())
			frame.variables[name] = scalar
			return scalar
		}
	}

	public printStack(): void {
		if (DEBUG) {
			for (let i = 0; i < this.stack.length; i++) {
				const item = this.stack[i]
				let name = /*getObjectClass*/ item
				if (name === 'ScalarVariable') {
					name += ' ' + item.value
				}
				this.trace.printf('stack[%s]: %s\n', i, name)
			}
		}
	}

	public pushScalar(value: string | number | object, typeName: string): void {
		this.stack.push(new ScalarVariable<any>(this.types[typeName] as SomeScalarType, value))
	}
}

function getArgValue<T>(variable: ScalarVariable<T> | T): T {
	return variable instanceof ScalarVariable ? variable.value : variable
}

interface ISystemFunction {
	type: string
	args: string[]
	minArgs: number
	action: (vm: VirtualMachine) => void
}

type SystemFunctionsDefinition = {
	[key: string]: ISystemFunction
}

/**
	Defines the functions that can be called from a basic program. Functions
	must return a value. System subs, which do not return a value, are defined
	elsewhere. Some BASIC keywords, such as SCREEN, are both a function and a
	sub, and may do different things in the two contexts.

	Each entry is indexed by function name. The record contains:

	type: The name of the type of the return value of the function.

	args: An array of names of types of each argument.

	minArgs: the number of arguments required.

	action: A function taking the virtual machine as an argument. To implement
	the function, it should pop its arguments off the stack, and push its
	return value onto the stack. If minArgs <> args.length, then the top of the
	stack is an integer variable that indicates how many arguments were passed
	to the function.
 */
export const SystemFunctions: SystemFunctionsDefinition = {
	ST: {
		type: 'INTEGER',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(vm.status)
		},
	},

	RND: {
		type: 'SINGLE',
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let n = 1
			if (numArgs === 1) {
				n = vm.stack.pop()
			}

			if (n !== 0) {
				vm.lastRandomNumber = Math.random()
			}
			vm.stack.push(vm.lastRandomNumber)
		},
	},

	CHR$: {
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const num = vm.stack.pop()
			vm.stack.push(String.fromCharCode(num))
		},
	},

	ASC: {
		type: 'INTEGER',
		args: ['STRING', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let pos = 1
			if (numArgs > 1) {
				pos = vm.stack.pop()
			}
			const str = vm.stack.pop()
			vm.stack.push(str.charCodeAt(pos - 1))
		},
	},

	INKEY$: {
		type: 'STRING',
		args: [],
		minArgs: 0,
		action: function (vm) {
			const code = vm.cons.getKeyFromBuffer()
			let result = ''

			if (code !== -1) {
				result = String.fromCodePoint(code)
				if (code === 0) {
					result += String.fromCharCode(vm.cons.getKeyFromBuffer())
				}
			}

			vm.stack.push(result)
		},
	},

	LEN: {
		type: 'INTEGER',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			const variable = vm.stack.pop()
			if (variable instanceof ArrayVariable) {
				vm.stack.push(variable.values.length)
				return
			} else if (variable instanceof ScalarVariable && variable.type.name === 'STRING') {
				vm.stack.push(variable.value.length)
				return
			} else if (typeof variable === 'string') {
				vm.stack.push(variable.length)
				return
			}

			throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for LEN')
		},
	},

	MID$: {
		type: 'STRING',
		args: ['STRING', 'INTEGER', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let len
			if (numArgs === 3) {
				len = vm.stack.pop()
			}
			const start = vm.stack.pop()
			const str = vm.stack.pop()
			vm.stack.push(str.substr(start - 1, len))
		},
	},

	LEFT$: {
		type: 'STRING',
		args: ['STRING', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			const num = vm.stack.pop()
			const str = vm.stack.pop()
			vm.stack.push(str.substr(0, num))
		},
	},

	RIGHT$: {
		type: 'STRING',
		args: ['STRING', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			const num = vm.stack.pop()
			const str = vm.stack.pop()
			vm.stack.push(str.substr(str.length - num))
		},
	},

	INSTR: {
		// [startAt%, ] haystack$, needle$
		type: 'INTEGER',
		args: ['ANY', 'STRING', 'STRING'],
		minArgs: 2,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			const needle: string = vm.stack.pop()
			const haystack: string = vm.stack.pop()
			let start = 0
			if (numArgs > 2) {
				start = vm.stack.pop()
			}
			vm.stack.push(haystack.indexOf(needle, start))
		},
	},

	REPL$: {
		// haystack$, needle$, subs$, startAt% = 0, upTill% = -1
		type: 'STRING',
		args: ['STRING', 'STRING', 'STRING', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			function escapeRegExp(text: string) {
				return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
			}

			const numArgs = vm.stack.pop()
			let count = -1
			let position = 0
			let isRegex = false
			if (numArgs > 5) {
				isRegex = vm.stack.pop() !== 0
			}
			if (numArgs > 4) {
				count = vm.stack.pop()
			}
			if (numArgs > 3) {
				position = vm.stack.pop()
			}
			const substitute = vm.stack.pop()
			const needle: string = vm.stack.pop()
			const haystack: string = vm.stack.pop()
			let result: string = haystack

			let i = 0
			function replacer(match) {
				if (i >= position && (i === -1 || i < count)) {
					i++
					return substitute
				}
				i++
				return match
			}

			if (isRegex) {
				result = result.replace(new RegExp(needle, 'g'), replacer)
			} else {
				result = result.replace(new RegExp(escapeRegExp(needle), 'g'), replacer)
			}

			vm.stack.push(result)
		},
	},

	TIMER: {
		type: 'INTEGER',
		args: [],
		minArgs: 0,
		action: function (vm) {
			// return number of seconds since midnight. DEVIATION: We return a
			// floating point value rather than an integer, so that nibbles
			// will work properly when its timing loop returns a value less
			// than one second.
			const date = new Date()

			const result =
				date.getMilliseconds() / 1000 + date.getSeconds() + date.getMinutes() * 60 + date.getHours() * 60 * 60

			vm.stack.push(result)
		},
	},

	TIME$: {
		type: 'STRING',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(new Date().toISOString().substr(11, 8))
		},
	},

	TIME: {
		type: 'INTEGER',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(performance?.now() || Date.now())
		},
	},

	DATE$: {
		type: 'STRING',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(new Date().toISOString().substr(0, 10))
		},
	},

	PEEK: {
		type: 'INTEGER',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			// pop one argument off the stack and replace it with 0.
			vm.stack.pop()
			vm.stack.push(0)
		},
	},

	LCASE$: {
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(vm.stack.pop().toLowerCase())
		},
	},

	UCASE$: {
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(vm.stack.pop().toUpperCase())
		},
	},

	TRIM$: {
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(vm.stack.pop().trim())
		},
	},

	STR$: {
		type: 'STRING',
		args: ['SINGLE', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let pad = 0
			if (numArgs > 1) {
				pad = vm.stack.pop()
			}

			const num = vm.stack.pop()
			const result = Number(num).toString(10)
			vm.stack.push('0000000000000000000000000000000000000000000000000000'.substr(0, pad - result.length) + result)
		},
	},

	HEX$: {
		type: 'STRING',
		args: ['SINGLE', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let pad = 0
			if (numArgs > 1) {
				pad = vm.stack.pop()
			}

			const num = vm.stack.pop()
			const result = Number(num).toString(16)
			vm.stack.push('0000000000000000000000000000000000000000000000000000'.substr(0, pad - result.length) + result)
		},
	},

	SPACE$: {
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const numSpaces = vm.stack.pop()
			let str = ''
			for (let i = 0; i < numSpaces; i++) {
				str += ' '
			}
			vm.stack.push(str)
		},
	},

	STRING$: {
		type: 'STRING',
		args: ['INTEGER', 'ANY'],
		minArgs: 2,
		action: function (vm) {
			const input = vm.stack.pop()
			const numChars = vm.stack.pop()
			let pattern = String(input)
			if (typeof input === 'number') {
				pattern = String.fromCodePoint(input)
			}
			let str = ''
			for (let i = 0; i < numChars; i++) {
				str += pattern
			}
			vm.stack.push(str)
		},
	},

	VAL: {
		type: 'SINGLE',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(parseFloat(vm.stack.pop()))
		},
	},

	INT: {
		type: 'INTEGER',
		args: ['SINGLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.floor(vm.stack.pop()))
		},
	},

	FLOOR: {
		type: 'INTEGER',
		args: ['SINGLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.floor(vm.stack.pop()))
		},
	},

	CEIL: {
		type: 'INTEGER',
		args: ['SINGLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.ceil(vm.stack.pop()))
		},
	},

	ROUND: {
		type: 'INTEGER',
		args: ['SINGLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.round(vm.stack.pop()))
		},
	},

	SQR: {
		type: 'DOUBLE',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.sqrt(Number(vm.stack.pop())))
		},
	},

	SGN: {
		type: 'INTEGER',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			const val = Number(vm.stack.pop())
			vm.stack.push(val === 0 ? 0 : val < 0 ? -1 : 1)
		},
	},

	EXP: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.exp(vm.stack.pop()))
		},
	},

	LOG: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.log(vm.stack.pop()))
		},
	},

	POW: {
		type: 'DOUBLE',
		args: ['DOUBLE', 'DOUBLE'],
		minArgs: 2,
		action: function (vm) {
			const multiplier = vm.stack.pop()
			const value = vm.stack.pop()
			vm.stack.push(Math.pow(value, multiplier))
		},
	},

	PI: {
		type: 'DOUBLE',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(Math.PI)
		},
	},

	RAD: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push((vm.stack.pop() / 360) * 2 * Math.PI)
		},
	},

	DEG: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push((vm.stack.pop() / 2 / Math.PI) * 360)
		},
	},

	SIN: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.sin(vm.stack.pop()))
		},
	},

	COS: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.cos(vm.stack.pop()))
		},
	},

	TAN: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.tan(vm.stack.pop()))
		},
	},

	ASIN: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.asin(vm.stack.pop()))
		},
	},

	ACOS: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.acos(vm.stack.pop()))
		},
	},

	ATAN: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.atan(vm.stack.pop()))
		},
	},

	SINH: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.sinh(vm.stack.pop()))
		},
	},

	COSH: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.cosh(vm.stack.pop()))
		},
	},

	TANH: {
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.tanh(vm.stack.pop()))
		},
	},

	CLASSIFY: {
		// number#
		// returns 2 for NaN, 1 for Infinite, 0 for Finite
		type: 'DOUBLE',
		args: ['DOUBLE'],
		minArgs: 1,
		action: function (vm) {
			const value = vm.stack.pop()
			vm.stack.push(Number.isNaN(value) ? 2 : Number.isFinite(value) ? 0 : 1)
		},
	},

	ABS: {
		type: 'DOUBLE',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			vm.stack.push(Math.abs(Number(vm.stack.pop())))
		},
	},

	MIN: {
		type: 'DOUBLE',
		args: ['ANY', 'ANY'],
		minArgs: 1,
		action: function (vm) {
			const numArgs = vm.stack.pop()

			const variable = vm.stack.pop()
			if (numArgs === 1 && variable instanceof ArrayVariable && IsNumericType(variable.type)) {
				vm.stack.push(Math.min(...variable.values.map((item) => Number(item.value))))
				return
			} else if (typeof variable === 'number') {
				const values = [Number(variable)]
				for (let i = 1; i < numArgs; i++) {
					const nextVariable = vm.stack.pop()
					if (typeof nextVariable !== 'number')
						throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for MAX')
					values.push(Number(nextVariable))
				}
				vm.stack.push(Math.min(...values))
				return
			}

			throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for MIN')
		},
	},

	MAX: {
		type: 'DOUBLE',
		args: ['ANY', 'ANY'],
		minArgs: 1,
		action: function (vm) {
			const numArgs = vm.stack.pop()

			const variable = vm.stack.pop()
			if (numArgs === 1 && variable instanceof ArrayVariable && IsNumericType(variable.type)) {
				vm.stack.push(Math.max(...variable.values.map((item) => Number(item.value))))
				return
			} else if (typeof variable === 'number') {
				const values = [Number(variable)]
				for (let i = 1; i < numArgs; i++) {
					const nextVariable = vm.stack.pop()
					if (typeof nextVariable !== 'number')
						throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for MAX')
					values.push(Number(nextVariable))
				}
				vm.stack.push(Math.max(...values))
				return
			}

			throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for MAX')
		},
	},

	IMGLOAD: {
		type: 'INTEGER',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			vm.suspend()
			let urlOrData: string | Blob
			let fileName = vm.stack.pop()
			const isUrl = !!fileName.match(/^https?:\/\//)

			if (isUrl || !vm.fileSystem) {
				// either this is a file or we don't have a file system, fallback to Internet-style references
				if (!isUrl) {
					fileName = vm.cwd + fileName
				}
				urlOrData = fileName
				vm.cons
					.loadImage(urlOrData)
					.then((idx) => {
						vm.stack.push(idx)
						vm.resume()
					})
					.catch(() => {
						vm.stack.push(-1)
						vm.resume()
					})
				return
			}

			const fs = vm.fileSystem
			const handle = fs.getFreeFileHandle()
			fileName = vm.cwd + fileName
			fs.open(handle, fileName, FileAccessMode.BINARY)
				.then(async () => {
					const blob = await fs.getAllContentsBlob(handle)
					urlOrData = blob
					await fs.close(handle)
					const idx = await vm.cons.loadImage(urlOrData)
					vm.stack.push(idx)
					vm.resume()
				})
				.catch(() => {
					vm.stack.push(-1)
					vm.resume()
				})
			return
		},
	},

	EOF: {
		// (fileNum1%|#N1)
		type: 'INTEGER',
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let fileNum = 1
			if (numArgs > 0) {
				fileNum = vm.stack.pop()
			}

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.eof(fileNum)
					.then((isEof) => {
						vm.stack.push(isEof ? -1 : 0)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while checking EOF: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	LOC: {
		// fileNum1%
		type: 'INTEGER',
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let fileNum = 1
			if (numArgs > 0) {
				fileNum = vm.stack.pop()
			}

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.position(fileNum)
					.then((position) => {
						vm.stack.push(position)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while checking LOC: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	RGB: {
		type: 'INTEGER',
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const blue = vm.stack.pop()
			const green = vm.stack.pop()
			const red = vm.stack.pop()
			vm.stack.push(-1 * ((((red >> 3) & 31) << 10) + (((green >> 3) & 31) << 5) + ((blue >> 3) & 31)))
		},
	},

	BGMCHK: {
		type: 'INTEGER',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(vm.audio && vm.audio.isPlayingMusic() ? -1 : 0)
		},
	},

	BEEPLOAD: {
		args: ['STRING'],
		type: 'INTEGER',
		minArgs: 1,
		action: function (vm) {
			let urlOrData: string | Blob
			let fileName = getArgValue(vm.stack.pop())
			const isUrl = !!fileName.match(/^https?:\/\//)

			if (!vm.audio) {
				vm.stack.push(-1)
				return
			}

			if (isUrl || !vm.fileSystem) {
				// either this is a file or we don't have a file system, fallback to Internet-style references
				if (!isUrl) {
					fileName = vm.cwd + fileName
				}
				urlOrData = fileName
				vm.suspend()
				vm.audio
					.addBeep(urlOrData)
					.then((idx) => {
						vm.stack.push(idx)
						vm.resume()
					})
					.catch(() => {
						vm.stack.push(-1)
						vm.resume()
					})
				return
			}

			const audio = vm.audio
			const fs = vm.fileSystem
			const handle = fs.getFreeFileHandle()
			fileName = vm.cwd + fileName
			fs.open(handle, fileName, FileAccessMode.BINARY)
				.then(async () => {
					const blob = await fs.getAllContentsBlob(handle)
					urlOrData = blob
					await fs.close(handle)
					const idx = await audio.addBeep(urlOrData)
					vm.stack.push(idx)
					vm.resume()
				})
				.catch(() => {
					vm.stack.push(-1)
					vm.resume()
				})
			return
		},
	},

	JOIN$: {
		// split_arr$(), delim$
		args: ['ANY', 'STRING'],
		type: 'STRING',
		minArgs: 2,
		action: function (vm) {
			const delim = vm.stack.pop()
			const target = vm.stack.pop() as ArrayVariable<StringType>

			if (target.type !== vm.types['STRING']) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, `Argument is not an array of STRING`)
			}

			vm.stack.push(target.values.map((item) => item.value).join(delim))
		},
	},

	'JSONREAD%': {
		// dataObjJ, path$ [, default%]
		type: 'INTEGER',
		args: ['JSON', 'STRING', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			// this also converts JSON true and false to -1 and 0
			const numArgs = vm.stack.pop()
			let defValue = 0

			if (numArgs > 2) {
				defValue = vm.stack.pop()
			}
			const path = vm.stack.pop()
			const obj = vm.stack.pop()

			const resultArr = jsonPath.query(obj, path)
			if (resultArr.length === 0) {
				vm.stack.push(defValue)
			} else {
				const result = resultArr[0]
				vm.stack.push(typeof result === 'boolean' ? (result === true ? -1 : 0) : Math.floor(result))
			}
		},
	},

	'JSONREAD#': {
		// dataObjJ, path$ [, default#]
		type: 'DOUBLE',
		args: ['JSON', 'STRING', 'DOUBLE'],
		minArgs: 2,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let defValue = 0

			if (numArgs > 2) {
				defValue = vm.stack.pop()
			}
			const path = vm.stack.pop()
			const obj = vm.stack.pop()

			const resultArr = jsonPath.query(obj, path)
			if (resultArr.length === 0) {
				vm.stack.push(defValue)
			} else {
				const result = resultArr[0]
				vm.stack.push(Number(result))
			}
		},
	},

	JSONREAD$: {
		// dataObjJ, path$ [, default$]
		type: 'STRING',
		args: ['JSON', 'STRING', 'STRING'],
		minArgs: 2,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let defValue = ''

			if (numArgs > 2) {
				defValue = vm.stack.pop()
			}
			const path = vm.stack.pop()
			const obj = vm.stack.pop()

			const resultArr = jsonPath.query(obj, path)
			if (resultArr.length === 0) {
				vm.stack.push(defValue)
			} else {
				vm.stack.push(String(resultArr[0] ?? defValue))
			}
		},
	},

	JSON: {
		// data$
		type: 'JSON',
		args: ['STRING'],
		minArgs: 0,
		action: function (vm) {
			let obj = {}
			const numArgs = vm.stack.pop()
			try {
				if (numArgs > 0) {
					obj = JSON.parse(vm.stack.pop())
				}
				vm.status = 0
			} catch (e) {
				// could not parse JSON, we output an empty object
				vm.status = -4
			}
			vm.stack.push(obj)
		},
	},

	JSONSTR$: {
		// dataJ
		type: 'STRING',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			const obj = vm.stack.pop()

			if (typeof obj !== 'object') {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for JSONSTR$')
			}

			if (obj instanceof ArrayVariable) {
				if (
					obj.type.name !== 'JSON' &&
					obj.type.name !== 'INTEGER' &&
					obj.type.name !== 'DOUBLE' &&
					obj.type.name !== 'SINGLE' &&
					obj.type.name !== 'STRING'
				) {
					throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Invalid argument for JSONSTR$')
				}

				vm.stack.push(
					JSON.stringify(
						obj.values.map((value) => value.value),
						undefined,
						1
					)
				)
				return
			}

			vm.stack.push(JSON.stringify(obj, undefined, 1))
		},
	},

	CSRLIN: {
		type: 'INTEGER',
		args: [],
		minArgs: 0,
		action: function (vm) {
			vm.stack.push(vm.cons.y + 1)
		},
	},

	POS: {
		type: 'INTEGER',
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			if (numArgs > 0) {
				vm.stack.pop()
			}

			vm.stack.push(vm.cons.x + 1)
		},
	},

	B64ENC$: {
		// data$
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const text = vm.stack.pop()
			vm.stack.push(btoa(text))
		},
	},

	B64DEC$: {
		// b64Data$
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const text = vm.stack.pop()
			vm.stack.push(atob(text))
		},
	},

	B64URL$: {
		// urlUnsafeB64Data$
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			let input = vm.stack.pop()
			// Replace base64 standard chars with url compatible ones
			// and remove padding
			input = input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=*$/, '')

			vm.stack.push(input)
		},
	},

	B64DEURL$: {
		// urlSafeB64Data$
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			let input = vm.stack.pop()
			// Replace url compatible chars with base64 standard chars
			input = input.replace(/-/g, '+').replace(/_/g, '/')

			// Pad out with standard base64 required padding characters
			const pad = input.length % 4
			if (pad) {
				if (pad === 1) {
					throw new RuntimeError(
						RuntimeErrorCodes.INVALID_ARGUMENT,
						'Input base64url string is the wrong length to determine padding'
					)
				}
				input += new Array(5 - pad).join('=')
			}

			vm.stack.push(input)
		},
	},

	INP$: {
		// address$
		type: 'STRING',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const address = vm.stack.pop()

			if (vm.generalIo) {
				vm.suspend()

				vm.generalIo
					.input(address)
					.then((data) => {
						vm.stack.push(data)
						vm.status = 0
						vm.resume()
					})
					.catch((error) => {
						vm.trace.printf('Error while getting data from address: %s', error)
						vm.stack.push('')
						vm.status = -2
						vm.resume()
					})
			} else {
				vm.status = -1
				vm.stack.push('')
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'General IO not available')
			}
		},
	},

	SHA1$: {
		// data$
		type: 'STRING',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			const data = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.hashSHA1(data)
					.then((hash) => {
						vm.stack.push(hash)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while hashing: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	SHA256$: {
		// data$
		type: 'STRING',
		args: ['ANY'],
		minArgs: 1,
		action: function (vm) {
			const data = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.hashSHA256(data)
					.then((hash) => {
						vm.stack.push(hash)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while hashing: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPSIGN$: {
		// keyId, data$
		// keyId, dataJ
		// Signs the data with an EC P-256 DSA key, as generated by CPGENKEYPAIR, resulting in a ES256 Digital Signature
		type: 'STRING',
		args: ['INTEGER', 'ANY'],
		minArgs: 2,
		action: function (vm) {
			const data = vm.stack.pop()
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				if (typeof data !== 'string' && typeof data !== 'object')
					throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, `Data needs to be either STRING or JSON`)

				vm.suspend()

				vm.cryptography
					.sign(keyId, data)
					.then((hash) => {
						vm.stack.push(hash)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error when trying to sign data: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPVERIFY: {
		// keyId, dataJ, signature$
		// keyId, data$, signature$
		type: 'INTEGER',
		args: ['INTEGER', 'ANY', 'STRING'],
		minArgs: 3,
		action: function (vm) {
			const signature = vm.stack.pop()
			const data = vm.stack.pop()
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				if (typeof data !== 'string' && typeof data !== 'object')
					throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, `Data needs to be either STRING or JSON`)

				vm.suspend()

				vm.cryptography
					.verify(keyId, data, signature)
					.then((correct) => {
						vm.stack.push(correct === true ? -1 : 0)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while verifying signature: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPEPUBK$: {
		// pubKeyId%
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const pubKeyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.exportPublicKey(pubKeyId)
					.then((pubKey) => {
						vm.stack.push(pubKey)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while exporting key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPEPRIVK$: {
		// privKeyId%
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const privateKeyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.exportPrivateKey(privateKeyId)
					.then((pubKey) => {
						vm.stack.push(pubKey)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while exporting key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPIPUBK: {
		// pubKey$
		type: 'INTEGER',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const pubKey = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.importPublicKey(pubKey)
					.then((pubKeyId) => {
						vm.stack.push(pubKeyId)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while importing key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPIPRIVK: {
		// privKey$
		type: 'INTEGER',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const privateKey = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.importPrivateKey(privateKey)
					.then((pubKeyId) => {
						vm.stack.push(pubKeyId)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while importing key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPENCRYPT$: {
		// keyId%, data$
		type: 'STRING',
		args: ['INTEGER', 'STRING'],
		minArgs: 2,
		action: function (vm) {
			const data = vm.stack.pop()
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.encrypt(keyId, data)
					.then((encData) => {
						vm.stack.push(encData)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while encrypting: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPDECRYPT$: {
		// keyId%, encData$
		type: 'STRING',
		args: ['INTEGER', 'STRING'],
		minArgs: 2,
		action: function (vm) {
			const encData = vm.stack.pop()
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.encrypt(keyId, encData)
					.then((data) => {
						vm.stack.push(data)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while decrypting: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPEAESK$: {
		// keyId%
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.exportKey(keyId)
					.then((aesKey) => {
						vm.stack.push(aesKey)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while exporting key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPIAESK: {
		// aesKey$
		type: 'INTEGER',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const aesKey = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.importKey(aesKey)
					.then((aesKeyId) => {
						vm.stack.push(aesKeyId)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while importing key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPMASTERKDECRYPT: {
		// masterKeyId%, passphrase$
		type: 'INTEGER',
		args: ['INTEGER', 'STRING'],
		minArgs: 2,
		action: function (vm) {
			const passphrase = vm.stack.pop()
			const masterKey = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.decryptMasterKey(passphrase, masterKey)
					.then((aesKeyId) => {
						vm.stack.push(aesKeyId)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while importing key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPEMASTERK$: {
		// masterKeyId%
		type: 'STRING',
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.exportMasterKey(keyId)
					.then((pubKey) => {
						vm.stack.push(pubKey)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while exporting key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPIMASTERK: {
		// masterKey$
		type: 'INTEGER',
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const masterKey = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.importMasterKey(masterKey)
					.then((pubKeyId) => {
						vm.stack.push(pubKeyId)
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while importing key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},
}

interface ISystemSubroutine {
	args?: string[]
	minArgs?: number
	action: (vm: VirtualMachine) => void
}

type SystemSubroutinesDefinition = {
	[key: string]: ISystemSubroutine
}

/**
	Defines the system subroutines that can be called from a basic program.
	Functions must return a value. System functions, which return a value, are
	defined elsewhere.

	Each entry is indexed by the name of the subroutine. The record contains:

	args: An array of names of types of each argument.

	minArgs: (optional) the number of arguments required.

	action: A function taking the virtual machine as an argument. To implement
	the function, it should pop its arguments off the stack, and push its
	return value onto the stack. If minArgs is present, and not equal to
	args.length, then the top of the stack is an integer variable that
	indicates how many arguments were passed to the function.
 */
export const SystemSubroutines: SystemSubroutinesDefinition = {
	HCF: {
		args: [],
		minArgs: 0,
		action: function (vm) {
			// this is here on purpose, to allow setting traps from inside BASIC
			// eslint-disable-next-line no-debugger
			debugger

			// remove passed in arguments
			let numArgs = vm.stack.pop()
			while (numArgs--) {
				vm.stack.pop()
			}
		},
	},

	CLS: {
		action: function (vm) {
			// clears the console screen.
			vm.cons.cls()
		},
	},

	RANDOMIZE: {
		action: function (vm) {
			// NOT IMPLEMENTED. Seeding the random number generator
			// is not possible using the built-in Javascript functions.
			vm.stack.pop()
		},
	},

	PLAY: {
		args: ['STRING', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let repeat: number | undefined = undefined
			const music = getArgValue(vm.stack.pop())

			if (argCount > 1) {
				repeat = getArgValue(vm.stack.pop())
			}

			if (vm.audio) {
				vm.suspend()
				vm.audio
					.playMusic(music, repeat || 1)
					.then(() => {
						vm.resume()
					})
					.catch((e) => console.error(e))
			}
		},
	},

	BGMPLAY: {
		args: ['STRING', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			// BGMPLAY is the same as PLAY, it just doesn't suspend the VM
			const argCount = vm.stack.pop()
			let repeat: number | undefined = undefined
			const music = getArgValue(vm.stack.pop())

			if (argCount > 1) {
				repeat = getArgValue(vm.stack.pop())
			}

			if (vm.audio) {
				vm.audio.playMusic(music, repeat).catch((e) => console.error(e))
			}
		},
	},

	BGMSTOP: {
		action: function (vm) {
			if (vm.audio) {
				vm.audio.stopMusic()
			}
		},
	},

	SOUND: {
		args: ['INTEGER', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let volume = 1
			if (argCount > 2) {
				volume = getArgValue(vm.stack.pop()) / 255
			}
			const length = Math.max(1, Math.min(5000, Math.round(getArgValue(vm.stack.pop()))))
			const frequency = Math.round((Math.round(getArgValue(vm.stack.pop())) / 255) * (4000 - 12) + 12)

			if (vm.audio) {
				vm.audio.makeSound(frequency, length, volume).catch((e) => console.error(e))
			}
		},
	},

	BEEP: {
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let beepId = 0
			if (argCount > 0) {
				beepId = getArgValue(vm.stack.pop())
			}

			if (vm.audio) {
				vm.suspend()
				vm.audio
					.beep(beepId)
					.then(() => vm.resume())
					.catch(() => vm.resume())
			}
		},
	},

	BEEPCLR: {
		args: ['INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const beepId = getArgValue(vm.stack.pop())
			if (!vm.audio) return

			vm.audio.clearBeep(beepId)
		},
	},

	SLEEP: {
		args: ['SINGLE'],
		minArgs: 0,
		action: function (vm) {
			const argCount = vm.stack.pop()
			vm.suspend()
			if (argCount === 1) {
				// if an argument is provided, wait X seconds
				const sleep = getArgValue(vm.stack.pop())
				// eslint-disable-next-line prefer-const
				let cancelSleep: () => void

				const timeout = setTimeout(() => {
					vm.off('suspended', cancelSleep)
					vm.resume()
				}, sleep * 1000)
				cancelSleep = () => {
					clearTimeout(timeout)
				}

				vm.once('suspended', cancelSleep)
			} else {
				// if no argument is provided, use a global trapped key to resume
				// eslint-disable-next-line prefer-const
				let cancelSleep: () => void

				vm.cons.onKey(-1, () => {
					vm.cons.onKey(-1, undefined)
					vm.off('suspended', cancelSleep)
					vm.resume()
				})
				cancelSleep = () => {
					vm.cons.onKey(-1, undefined)
				}

				vm.once('suspended', cancelSleep)
			}
		},
	},

	SYSTEM: {
		action: function () {
			// NOT IMPLEMENTED
			// vm.stack.pop();
		},
	},

	print_using: {
		action: function (vm) {
			// pop # args
			const argCount = vm.stack.pop()

			// pop terminator
			const terminator = vm.stack.pop()

			const args: any[] = []
			for (let i = 0; i < argCount - 1; i++) {
				args.unshift(vm.stack.pop())
			}

			const formatString = args.shift().value

			let curArg = 0
			let output = ''

			// for each character in the string,
			for (let pos = 0; pos < formatString.length; pos++) {
				let ch = formatString.charAt(pos)

				// if the character is '#',
				if (ch === '#') {
					// if out of arguments, then type mismatch error.
					if (curArg === args.length || !IsNumericType(args[curArg].type)) {
						// TODO: errors.
						dbg().printf('Type mismatch error.\n')
						break
					}

					// store character position
					const backupPos = pos
					let digitCount = 0
					// for each character of the string,
					for (; pos < formatString.length; pos++) {
						ch = formatString.charAt(pos)
						// if the character is '#',
						if (ch === '#') {
							// increase digit count
							digitCount++

							// if the character is ','
						} else if (ch === ',') {
							// do nothing
						} else {
							// break out of loop
							break
						}
					}

					// convert current arg to a string. Truncate or pad to
					// appropriate number of digits.
					let argAsString = '' + args[curArg].value
					if (argAsString.length > digitCount) {
						argAsString = argAsString.substr(argAsString.length - digitCount)
					} else {
						while (argAsString.length < digitCount) {
							argAsString = ' ' + argAsString
						}
					}

					let curDigit = 0

					// go back to old character position.
					// for each character of the string,
					for (pos = backupPos; pos < formatString.length; pos++) {
						ch = formatString.charAt(pos)
						// if the character is a '#'
						if (ch === '#') {
							// output the next digit.
							output += argAsString[curDigit++]
							// if the character is a ',',
						} else if (ch === ',') {
							// output a comma.
							output += ch
						} else {
							// break out.
							break
						}
					}

					// increment current argument.
					curArg += 1
					pos -= 1
				} else {
					// character was not #. output it verbatim.
					output += ch
				}
			}

			vm.cons.print(output)
			if (terminator === ',') {
				let x = vm.cons.x
				let spaces = ''
				while (++x % 14) {
					spaces += ' '
				}
				vm.cons.print(spaces)
			} else if (terminator !== ';') {
				vm.cons.print('\n')
			}
		},
	},

	LOCATE: {
		// Y% [, X%]
		args: ['INTEGER', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let col = 1
			if (argCount > 1) {
				col = getArgValue(vm.stack.pop())
			}
			const row = getArgValue(vm.stack.pop())
			vm.cons.locate(row, col)
		},
	},

	COLOR: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let bg: number | null = null
			let bo: number | null = null
			if (argCount > 2) {
				bo = Math.round(getArgValue(vm.stack.pop())) || 0
			}
			if (argCount > 1) {
				bg = Math.round(getArgValue(vm.stack.pop())) || 0
			}
			const fg = Math.round(getArgValue(vm.stack.pop())) || 0
			vm.cons.color(fg, bg, bo)
		},
	},

	READ: {
		// Actually, arguments must be STRING or NUMBER, but there is no way to
		// indicate that to the type checker at the moment.
		args: ['ANY', 'ANY'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			const args: any[] = []
			let i

			for (i = 0; i < argCount; i++) {
				args.unshift(vm.stack.pop())
			}

			// TODO: out of data error.
			for (i = 0; i < argCount; i++) {
				vm.trace.printf('READ %s\n', vm.data[vm.dataPtr])
				args[i].value = vm.data[vm.dataPtr++]
				if (args[i].value === null) {
					// user specified ,, in a data statement
					args[i].value = args[i].type.createInstance()
				}
			}
		},
	},

	SCREEN: {
		action: function (vm) {
			const mode = getArgValue(vm.stack.pop())
			vm.cons.screen(mode)
		},
	},

	INPUT: {
		action: function (vm) {
			// TODO: Support multiple arguments. Convert strings input by the
			// user to numbers.
			const argCount = vm.stack.pop()
			const args: any[] = []

			vm.trace.printf('Argcount=%s\n', argCount)

			for (let i = 0; i < argCount; i++) {
				args.unshift(vm.stack.pop())
			}

			const fileHandle = vm.stack.pop()
			const newLineAfterEnter = vm.stack.pop() !== 0
			const readUpToNewLine = vm.stack.pop() !== 0

			let currentArg = 0
			let pastResult = ''

			async function handleFileInput(val: number | string | object): Promise<void> {
				const arg = args[currentArg]
				if (IsStringType(arg.type) && typeof val === 'string') {
					arg.value = String(val)
				} else if (IsNumericType(arg.type)) {
					arg.value = typeof val === 'string' ? Number.parseFloat(val) : Number(val)
					if (arg.type.name === 'INTEGER') {
						arg.value = Math.floor(arg.value)
					}
				}
				currentArg++

				if (currentArg >= argCount) {
					return Promise.resolve()
				} else if (vm.fileSystem) {
					return vm.fileSystem.read(fileHandle).then(async (result) => handleFileInput(result))
				} else {
					return Promise.reject()
				}
			}

			async function handleInput(result: string): Promise<void> {
				result = pastResult + result
				const csvMatch = new RegExp(STRUCTURED_INPUT_MATCH)
				let m: RegExpExecArray | null = null
				let lastIndex = 0
				do {
					m = csvMatch.exec(result)
					if (m) {
						let val = m[1]
						const thisArg = args[currentArg]
						if (IsStringType(thisArg.type)) {
							const originalLen = val.length
							val = String(val).replace(/^"(.*)"$/gi, '$1')
							// if val is quoted, replace double quotes with single quotes
							thisArg.value = val.length !== originalLen ? val.replace(/""/gi, '"') : val
						} else if (IsNumericType(thisArg.type)) {
							thisArg.value = Number.parseFloat(val)
							if (thisArg.type.name === 'INTEGER') {
								thisArg.value = Math.floor(thisArg.value)
							}
						}
						lastIndex = csvMatch.lastIndex
						currentArg++
					}
				} while (m !== null && currentArg < argCount)
				pastResult = result.substr(lastIndex)

				if (currentArg >= argCount) {
					return Promise.resolve()
				} else {
					return vm.cons.input(newLineAfterEnter).then(handleInput)
				}
			}

			vm.suspend()
			if (fileHandle === null) {
				if (readUpToNewLine) {
					vm.cons
						.input(newLineAfterEnter)
						.then((result) => {
							args[0].value = result
						})
						.then(() => vm.resume())
						.catch((e) => {
							dbg().printf('Error when reading input: %s', e)
							vm.resume()
						})
				} else {
					vm.cons
						.input(newLineAfterEnter)
						.then(async (result) => handleInput(result))
						.then(() => vm.resume())
						.catch((e) => {
							dbg().printf('Error when reading input: %s', e)
							vm.resume()
						})
				}
			} else {
				if (vm.fileSystem) {
					vm.fileSystem
						.read(fileHandle)
						.then(handleFileInput)
						.then(() => vm.resume())
						.catch((e) => {
							dbg().printf('Error when reading input: %s', e)
							vm.resume()
						})
				} else {
					dbg().printf('File system not available')
					vm.resume()
				}
			}
		},
	},

	SWAP: {
		action: function (vm) {
			const lhs = vm.stack.pop()
			const rhs = vm.stack.pop()
			const temp = lhs.value
			lhs.value = rhs.value
			rhs.value = temp
			// TODO: Type checking.
		},
	},

	INC: {
		args: ['INTEGER', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let step = 1

			if (argCount > 1) {
				step = getArgValue(vm.stack.pop())
			}

			const variable = vm.stack.pop()
			variable.value = variable.value + step
		},
	},

	DEC: {
		args: ['INTEGER', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let step = 1

			if (argCount > 1) {
				step = getArgValue(vm.stack.pop())
			}

			const variable = vm.stack.pop()
			variable.value = variable.value - step
		},
	},

	WIDTH: {
		action: function (vm) {
			// TODO: NOT IMPLEMENTED
			vm.stack.pop()
			vm.stack.pop()
		},
	},

	WINDOW: {
		// [ X1%, Y1%, X2%, Y2% [, CLEAR] ]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let clear = false

			if (argCount === 0) {
				vm.cons.window()
				return
			}
			if (argCount < 4 || argCount > 5) {
				throw new RuntimeError(
					RuntimeErrorCodes.INVALID_ARGUMENT,
					`Provide coordinates for window, or no coordinates to reset`
				)
			}

			if (argCount === 5) {
				clear = getArgValue(vm.stack.pop()) === 1
			}

			const y2 = Math.round(getArgValue(vm.stack.pop()))
			const x2 = Math.round(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.window(x1, y1, x2, y2)

			if (clear) {
				vm.cons.cls()
			}
		},
	},

	WAIT: {
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			vm.suspend()

			const argCount = vm.stack.pop()
			let frames = 1
			if (argCount === 1) {
				// if an argument is provided, wait X frames
				frames = getArgValue(vm.stack.pop())
			}

			let cancelWait: () => void
			if (window) {
				let waitedFrames = 0
				let frameRequest: number
				const waitFrame = () => {
					waitedFrames++
					if (waitedFrames >= frames) {
						vm.off('suspended', cancelWait)
						vm.resume()
					} else {
						frameRequest = vm.cons.onNextFrame(waitFrame)
					}
				}
				frameRequest = vm.cons.onNextFrame(waitFrame)
				cancelWait = () => vm.cons.cancelOnNextFrame(frameRequest)
			} else {
				const timeout = setTimeout(() => {
					vm.off('suspended', cancelWait)
					vm.resume()
				}, frames)
				cancelWait = () => clearTimeout(timeout)
			}

			vm.once('suspended', cancelWait)
		},
	},

	IMGPUT: {
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let dw = undefined
			let dh = undefined
			let sx = undefined
			let sy = undefined
			let sw = undefined
			let sh = undefined
			if (argCount >= 9) {
				sh = getArgValue(vm.stack.pop())
				sw = getArgValue(vm.stack.pop())
				sy = getArgValue(vm.stack.pop())
				sx = getArgValue(vm.stack.pop())
			}
			if (argCount >= 5) {
				dh = getArgValue(vm.stack.pop())
				dw = getArgValue(vm.stack.pop())
			}
			const dy = getArgValue(vm.stack.pop())
			const dx = getArgValue(vm.stack.pop())
			const imageHandle = getArgValue(vm.stack.pop())
			try {
				const image = vm.cons.getImage(imageHandle)
				vm.cons.putImage(image, dx, dy, dw, dh, sx, sy, sw, sh)
			} catch (e) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, e)
			}
		},
	},

	IMGSIZE: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			// const _argCount =
			vm.stack.pop()
			const height = vm.stack.pop()
			const width = vm.stack.pop()
			const imageHandle = getArgValue(vm.stack.pop())
			try {
				const image = vm.cons.getImage(imageHandle)

				width.value = Math.round(image.naturalWidth)
				height.value = Math.round(image.naturalHeight)
			} catch (e) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, e)
			}
		},
	},

	IMGCLR: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const imageHandle = getArgValue(vm.stack.pop())

			vm.cons.clearImage(imageHandle)
		},
	},

	SPSET: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			vm.suspend()
			const argCount = vm.stack.pop()
			let frames = 1
			if (argCount > 2) {
				frames = getArgValue(vm.stack.pop())
			}
			const imageHandle = getArgValue(vm.stack.pop())
			const spriteNum = getArgValue(vm.stack.pop())

			vm.cons
				.createSprite(spriteNum - 1, vm.cons.getImage(imageHandle), frames)
				.then(() => {
					vm.resume()
				})
				.catch((e) => {
					throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, e)
				})
		},
	},

	SPOFS: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		action: function (vm) {
			const y = getArgValue(vm.stack.pop())
			const x = getArgValue(vm.stack.pop())
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.offsetSprite(spriteNum - 1, x, y)
		},
	},

	SPSCALE: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		action: function (vm) {
			const scaleY = getArgValue(vm.stack.pop())
			const scaleX = getArgValue(vm.stack.pop())
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.scaleSprite(spriteNum - 1, scaleX, scaleY)
		},
	},

	SPROT: {
		args: ['INTEGER', 'INTEGER'],
		action: function (vm) {
			const angle = getArgValue(vm.stack.pop())
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.rotateSprite(spriteNum - 1, angle)
		},
	},

	SPHOME: {
		args: ['INTEGER', 'INTEGER', 'INTEGER'],
		action: function (vm) {
			const homeY = getArgValue(vm.stack.pop())
			const homeX = getArgValue(vm.stack.pop())
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.homeSprite(spriteNum - 1, homeX, homeY)
		},
	},

	SPHIDE: {
		// SPRITE%
		args: ['INTEGER'],
		action: function (vm) {
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.displaySprite(spriteNum - 1, false)
		},
	},

	SPSHOW: {
		// SPRITE%
		args: ['INTEGER'],
		action: function (vm) {
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.displaySprite(spriteNum - 1, true)
		},
	},

	SPANIM: {
		// SPRITE%, START_FRAME%, END_FRAME% [, LOOP]
		// SPRITE%, START_FRAME%, END_FRAME% [[, SPEED], LOOP]
		// SPRITE%, START_FRAME%, END_FRAME%, SPEED, LOOP, PING_PONG, PING_PONG_FLIP
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let loop = true
			let speed = 1
			let pingPong = false
			let pingPongFlip = 0
			if (argCount > 5) {
				pingPongFlip = getArgValue(vm.stack.pop()) & 3
				pingPong = getArgValue(vm.stack.pop()) === 0 ? false : true
			}
			if (argCount > 3) {
				loop = getArgValue(vm.stack.pop()) === 0 ? false : true
			}
			if (argCount > 4) {
				speed = Math.round(getArgValue(vm.stack.pop()))
			}
			const stopFrame = Math.round(getArgValue(vm.stack.pop()))
			const startFrame = Math.round(getArgValue(vm.stack.pop()))
			const spriteNum = Math.round(getArgValue(vm.stack.pop()))
			vm.cons.animateSprite(spriteNum - 1, startFrame - 1, stopFrame - 1, speed, loop, pingPong, pingPongFlip)
		},
	},

	SPCLR: {
		// SPRITE%
		args: ['INTEGER'],
		action: function (vm) {
			const spriteNum = getArgValue(vm.stack.pop())
			vm.cons.clearSprite(spriteNum - 1)
		},
	},

	GSAVE: {
		// [X1%, Y1%, X2%, Y2%, ] TargetArray()
		args: ['ANY', 'ANY', 'ANY', 'ANY', 'ARRAY OF INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let x1: number | undefined = undefined
			let y1: number | undefined = undefined
			let x2: number | undefined = undefined
			let y2: number | undefined = undefined
			const target = vm.stack.pop() as ArrayVariable<IntegerType>
			if (argCount > 1) {
				y2 = getArgValue(vm.stack.pop())
				x2 = getArgValue(vm.stack.pop())
				y1 = getArgValue(vm.stack.pop())
				x1 = getArgValue(vm.stack.pop())
			}
			let imgData: Uint8ClampedArray
			if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
				imgData = vm.cons.get(x1, y1, x2, y2)
			} else {
				imgData = vm.cons.get()
			}
			target.resize([new Dimension(1, imgData.length)])
			for (let i = 0; i < imgData.length; i++) {
				target.assign([i + 1], new ScalarVariable<number>(vm.types['INTEGER'] as IntegerType, imgData[i]))
			}
		},
	},

	GLOAD: {
		// [X%, Y%, Width%, Height%, ] SourceArray()
		args: ['ANY', 'ANY', 'ANY', 'ANY', 'ARRAY OF INTEGER'],
		minArgs: 1,
		action: function (vm) {
			// paint 32-bit RGBA image from array
			const argCount = vm.stack.pop()
			let x1: number | undefined = undefined
			let y1: number | undefined = undefined
			let width: number | undefined = undefined
			let height: number | undefined = undefined
			const source = vm.stack.pop() as ArrayVariable<IntegerType>
			if (source.type.name !== 'INTEGER')
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Source Array needs to be ARRAY OF INTEGER')

			if (argCount > 1) {
				height = getArgValue(vm.stack.pop())
				width = getArgValue(vm.stack.pop())
				y1 = getArgValue(vm.stack.pop())
				x1 = getArgValue(vm.stack.pop())
			}
			const pixels = new Uint8ClampedArray(source.values.length)
			for (let i = 0; i < source.values.length; i++) {
				pixels[i] = source.values[i].value & 255
			}

			if (x1 !== undefined && y1 !== undefined && width !== undefined && height !== undefined) {
				vm.cons.put(pixels, x1, y1, width, height)
			} else {
				vm.cons.put(pixels)
			}
		},
	},

	GCLIP: {
		// [ X1%, Y1%, X2%, Y2% ]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const argCount = vm.stack.pop()

			if (argCount === 0) {
				vm.cons.clip()
				return
			}
			if (argCount !== 4) {
				throw new RuntimeError(
					RuntimeErrorCodes.INVALID_ARGUMENT,
					`Provide coordinates for clipping, or no coordinates to reset`
				)
			}

			const y2 = Math.round(getArgValue(vm.stack.pop()))
			const x2 = Math.round(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.clip(x1, y1, x2, y2)
		},
	},

	GLINE: {
		// X1%, Y1% [[, X2%, Y2%], COLOR%]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 2,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let x2: number | undefined = undefined
			let y2: number | undefined = undefined
			let color: number | undefined = undefined
			if (argCount > 2) {
				color = Math.round(getArgValue(vm.stack.pop()))
			}
			if (argCount > 3) {
				y2 = Math.round(getArgValue(vm.stack.pop()))
				x2 = Math.round(getArgValue(vm.stack.pop()))
			}
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			if (x2 !== undefined && y2 !== undefined) {
				vm.cons.line(x1, y1, x2, y2, color)
			} else {
				vm.cons.lineTo(x1, y1, color)
			}
		},
	},

	GPAINT: {
		// X%, Y%, COLOR% [, BORDER_COLOR%]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let borderColor: number | undefined = undefined
			if (argCount > 3) {
				borderColor = Math.round(getArgValue(vm.stack.pop()))
			}
			const color: number | undefined = Math.round(getArgValue(vm.stack.pop()))
			const y = Math.round(getArgValue(vm.stack.pop()))
			const x = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.paint(x, y, color, borderColor)
		},
	},

	GBOX: {
		// X1%, Y1%, X2%, Y2% [, COLOR%]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 4,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let color: number | undefined

			if (argCount > 4) {
				color = Math.round(getArgValue(vm.stack.pop()))
			}
			const y2 = Math.round(getArgValue(vm.stack.pop()))
			const x2 = Math.round(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.box(x1, y1, x2, y2, color)
		},
	},

	GFILL: {
		// X1%, Y1%, X2%, Y2% [, COLOR%]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 4,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let color: number | undefined

			if (argCount > 4) {
				color = Math.round(getArgValue(vm.stack.pop()))
			}
			const y2 = Math.round(getArgValue(vm.stack.pop()))
			const x2 = Math.round(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.fill(x1, y1, x2, y2, color)
		},
	},

	GTRI: {
		// X1%, Y1%, X2%, Y2%, X3%, Y3% [, COLOR%]
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 6,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let color: number | undefined

			if (argCount > 6) {
				color = Math.round(getArgValue(vm.stack.pop()))
			}
			const y3 = Math.round(getArgValue(vm.stack.pop()))
			const x3 = Math.round(getArgValue(vm.stack.pop()))
			const y2 = Math.round(getArgValue(vm.stack.pop()))
			const x2 = Math.round(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.triangleFill(x1, y1, x2, y2, x3, y3, color)
		},
	},

	GCIRCLE: {
		// X%, Y% [[[[,FILL% ], ASPECT#], START_ANGLE#, END_ANGLE#], COLOR%]
		args: ['INTEGER', 'INTEGER', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let startAngle: number | undefined
			let endAngle: number | undefined
			let color: number | undefined
			let aspect: number | undefined
			let fill = false

			if (argCount > 3) {
				color = Math.round(getArgValue(vm.stack.pop()))
			}
			if (argCount > 7) {
				fill = getArgValue(vm.stack.pop()) === 0 ? false : true
			}
			if (argCount > 6) {
				aspect = Number(getArgValue(vm.stack.pop()))
			}
			if (argCount > 4) {
				startAngle = Number(getArgValue(vm.stack.pop()))
				endAngle = Number(getArgValue(vm.stack.pop()))
			}
			const radius = Number(getArgValue(vm.stack.pop()))
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			vm.cons.circle(x1, y1, radius, color, startAngle, endAngle, aspect, fill, false)
		},
	},

	GPSET: {
		// X%, Y%, COLOR%
		// X%, Y%, RED%, GREEN%, BLUE%
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()
			let color: number | [number, number, number]

			if (argCount === 5) {
				const blue = Math.round(getArgValue(vm.stack.pop())) & 255
				const green = Math.round(getArgValue(vm.stack.pop())) & 255
				const red = Math.round(getArgValue(vm.stack.pop())) & 255

				color = [red, green, blue]
			} else {
				const colorNum = Math.round(getArgValue(vm.stack.pop()))

				color = colorNum
			}

			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))
			vm.cons.putPixel(x1, y1, color as any)
		},
	},

	GPGET: {
		// X%, Y%, OUT RED%, OUT GREEN%, OUT BLUE%
		args: ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER'],
		action: function (vm) {
			const blueVar = vm.stack.pop() as ScalarVariable<number>
			const greenVar = vm.stack.pop() as ScalarVariable<number>
			const redVar = vm.stack.pop() as ScalarVariable<number>
			const y1 = Math.round(getArgValue(vm.stack.pop()))
			const x1 = Math.round(getArgValue(vm.stack.pop()))

			const [red, green, blue] = vm.cons.getPixel(x1, y1)

			redVar.value = red
			greenVar.value = green
			blueVar.value = blue
		},
	},

	JSONREAD: {
		// JSON_OBJ, JSON_PATH$, OUT JSON_OBJ()
		args: ['JSON', 'STRING', 'ARRAY OF JSON'],
		minArgs: 3,
		action: function (vm) {
			// numArgs
			vm.stack.pop()

			const target = vm.stack.pop() as ArrayVariable<JSONType>

			if (target.type !== vm.types['JSON']) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Output needs to be a JSON array')
			}

			const path = getArgValue(vm.stack.pop())
			const obj = getArgValue(vm.stack.pop())

			const resultArr = jsonPath.query(obj, path)
			target.resize([new Dimension(1, resultArr.length)])
			for (let i = 0; i < resultArr.length; i++) {
				target.assign([i + 1], new ScalarVariable<object>(vm.types['JSON'] as JSONType, resultArr[i]))
			}
		},
	},

	JSONWRITE: {
		// JSON_OBJ, JSON_PATH$, VALUE, CONVERT_TO_BOOL
		args: ['JSON', 'STRING', 'ANY', 'INTEGER'],
		minArgs: 3,
		action: function (vm) {
			const numArgs = vm.stack.pop()
			let convertToBool = false

			if (numArgs > 3) {
				convertToBool = vm.stack.pop() === 0 ? false : true
			}

			const value = getArgValue(vm.stack.pop())
			const path = getArgValue(vm.stack.pop()) as string
			const obj = vm.stack.pop() as ScalarVariable<object>

			const explodedPath = path.split(/[.[\]]/).filter((element) => element !== '')
			if (explodedPath.shift() !== '$') {
				throw new RuntimeError(
					RuntimeErrorCodes.INVALID_ARGUMENT,
					`Only root-anchored paths are supported. Path provided was: "${path}"`
				)
			} else if (explodedPath.length < 1) {
				throw new RuntimeError(
					RuntimeErrorCodes.INVALID_ARGUMENT,
					`Path needs to have at least a single node. Path provided was: "${path}"`
				)
			}

			let target = obj.value
			while (explodedPath.length > 1) {
				let section: number | string = explodedPath.shift()!
				if (section !== '*') {
					if (section.match(/^\d+$/)) {
						section = Number(section)
					} else if (section[0] === '"' && section[section.length - 1] === '"') {
						section = section.substring(1, section.length - 1)
					}

					if (target[section] === undefined) {
						if (explodedPath[0] === '*') {
							target[section] = []
						} else {
							target[section] = {}
						}
					}
					target = target[section]
				} else if (section === '*' && Array.isArray(target)) {
					const tempObj = {}
					target.push(tempObj)
					target = tempObj
				} else {
					throw new RuntimeError(
						RuntimeErrorCodes.INVALID_ARGUMENT,
						`Node '${section}' is not an array. Path provided was: "${path}"`
					)
				}
			}

			target[explodedPath.shift()!] = typeof value === 'number' && convertToBool ? (value === 0 ? false : true) : value
		},
	},

	SPLIT: {
		// SOURCE$, DELIM$, OUT SPLIT_ARR$()
		args: ['STRING', 'STRING', 'ARRAY OF STRING'],
		minArgs: 3,
		action: function (vm) {
			vm.stack.pop() //numArgs

			const target = vm.stack.pop() as ArrayVariable<StringType>
			if (target.type !== vm.types['STRING']) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Output needs to be a STRING array')
			}

			const delim = getArgValue(vm.stack.pop())
			const source = getArgValue(vm.stack.pop())

			const resultArr = source.split(delim)

			target.resize([new Dimension(1, resultArr.length)])
			for (let i = 0; i < resultArr.length; i++) {
				target.assign([i + 1], new ScalarVariable<string>(vm.types['STRING'], resultArr[i]))
			}
		},
	},

	FETCH: {
		// URL$, OUT RESPONSE_CODE%, OUT DATA$ [, METHOD$ [[, HEADERS$()] | [, AUTHORIZATION] [[, BODY$] | [, OPTIONS, BODY$] | [, OPTIONS]]]]
		args: ['STRING', 'INTEGER', 'STRING', 'STRING', 'ANY', 'ANY', 'ANY'],
		minArgs: 3,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let headers: Record<string, string> | undefined
			let method = 'GET'
			let body: string | undefined = undefined
			let options = 0
			let cache: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload' | undefined =
				undefined
			let credentials: 'include' | 'omit' | 'same-origin' | undefined = undefined

			if (argCount > 6) {
				body = getArgValue(vm.stack.pop())
			}
			if (argCount > 5) {
				if (argCount === 6) {
					const bodyOrOptions = getArgValue<string | number>(vm.stack.pop())
					if (typeof bodyOrOptions === 'number') {
						options = Math.round(Number(bodyOrOptions))
					} else {
						body = bodyOrOptions
					}
				} else {
					options = Math.round(Number(getArgValue(vm.stack.pop())))
				}

				const cacheOption = options % 10
				switch (cacheOption) {
					case 1:
						cache = 'force-cache'
						break
					case 2:
						cache = 'no-cache'
						break
					case 3:
						cache = 'no-store'
						break
					case 4:
						cache = 'only-if-cached'
						break
					case 5:
						cache = 'reload'
						break
					default:
					case 0:
						cache = 'default'
				}

				const credentialsOption = (options % 100) / 10
				switch (credentialsOption) {
					case 1:
						credentials = 'include'
						break
					case 2:
						credentials = 'omit'
						break
					default:
					case 0:
						credentials = 'same-origin'
				}
			}
			if (argCount > 4) {
				const headersOrAuth = vm.stack.pop()

				if (headersOrAuth instanceof ArrayVariable) {
					headers = {}
					const headersArray = vm.stack.pop() as ArrayVariable<StringType>
					const pairs = headersArray.values.length / 2
					let i = 0
					while (i < pairs) {
						headers[headersArray.values[i++].value] = String(headersArray.values[i++].value)
					}
				} else {
					const auth = getArgValue(headersOrAuth)
					headers = {
						Authorization: String(auth),
					}
				}
			}
			if (argCount > 3) {
				method = getArgValue(vm.stack.pop())
			}
			const outData = vm.stack.pop()
			const outResCode = vm.stack.pop()
			const url = getArgValue(vm.stack.pop())

			if (vm.networkAdapter) {
				vm.suspend()
				vm.networkAdapter
					.fetch(url, {
						method,
						headers,
						body,
						cache,
						credentials,
					})
					.then((value) => {
						outResCode.value = value.code
						outData.value = value.body
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.trace.printf('Error while fetching data: %s\n', reason)
						outResCode.value = -2
						vm.status = -2
						vm.resume()
					})
			} else {
				outResCode.value = -1
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Network adapter not available')
			}
		},
	},

	WSOPEN: {
		// URL$ [, HANDLE% [, PROTOCOL$]]
		args: ['STRING', 'INTEGER', 'STRING'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let protocol: string | undefined = undefined

			let handle = 0
			if (argCount > 2) {
				protocol = getArgValue(vm.stack.pop())
			}
			if (argCount > 1) {
				handle = getArgValue(vm.stack.pop())
			}
			const url = getArgValue(vm.stack.pop())

			if (vm.networkAdapter) {
				vm.suspend()
				vm.networkAdapter
					.wsOpen(handle, url, protocol)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.trace.printf('Error while opening WebSocket: %s\n', reason)
						vm.status = -2
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Network adapter not available')
			}
		},
	},

	WSCLOSE: {
		// [ HANDLE% ]
		args: ['INTEGER'],
		minArgs: 0,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let handle = 0
			if (argCount > 0) {
				handle = getArgValue(vm.stack.pop())
			}

			if (vm.networkAdapter) {
				vm.suspend()
				vm.networkAdapter
					.wsClose(handle)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.trace.printf('Error while closing WebSocket: %s\n', reason)
						vm.status = -2
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Network adapter not available')
			}
		},
	},

	WSWRITE: {
		// DATA$ [, HANDLE% ]
		args: ['STRING', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let handle = 0
			if (argCount > 1) {
				handle = getArgValue(vm.stack.pop())
			}

			const data = getArgValue(vm.stack.pop())

			if (vm.networkAdapter) {
				vm.suspend()
				vm.networkAdapter
					.wsSend(handle, data)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while sending data through WebSocket: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Network adapter not available')
			}
		},
	},

	WSREAD: {
		// OUT DATA$ [, HANDLE% ]
		args: ['STRING', 'INTEGER'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let handle = 0
			if (argCount > 1) {
				handle = getArgValue(vm.stack.pop())
			}

			const outData = vm.stack.pop()

			if (vm.networkAdapter) {
				vm.suspend()
				vm.networkAdapter
					.wsGetMessageFromBuffer(handle)
					.then((data) => {
						if (data === undefined) {
							vm.status = 4 // buffer is empty
							vm.resume()
							return
						}
						outData.value = String(data)
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while reading data from WebSocket buffer: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Network adapter not available')
			}
		},
	},

	OPEN: {
		// filename$ FOR (INPUT|OUTPUT|APPEND|RANDOM|BINARY) AS (fileNum%|#N)
		action: function (vm) {
			const fileHandle = vm.stack.pop()
			const fileName = vm.cwd + vm.stack.pop()
			const mode = vm.stack.pop() as FileAccessMode

			if (vm.fileSystem) {
				vm.suspend()
				vm.fileSystem
					.open(fileHandle, fileName, mode)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while opening file: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	CLOSE: {
		// [(fileNum1%|#N1), (fileNum2%|#N2), (fileNum3%|#N3), ...]
		action: function (vm) {
			const argCount = vm.stack.pop()

			let fileHandles: number[] = []
			for (let i = 0; i < argCount; i++) {
				fileHandles.push(vm.stack.pop())
			}

			if (vm.fileSystem) {
				const fileSystem = vm.fileSystem
				vm.suspend()

				if (argCount === 0) {
					fileHandles = vm.fileSystem.getUsedFileHandles()
				}

				Promise.all(fileHandles.map(async (fileHandle) => fileSystem.close(fileHandle)))
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while closing file: %s\n', reason)
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	WRITE: {
		// [(fileNum1%|#N1),] PrintItem1, PrintItem2, PrintItem3
		action: function (vm) {
			const fileHandle = vm.stack.pop()
			const buf = vm.stack.pop()

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.write(fileHandle, buf)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while writing to file: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	SEEK: {
		// [(fileNum1%|#N1),] offset%
		action: function (vm) {
			const fileHandle = vm.stack.pop() ?? 1
			const offset = getArgValue(vm.stack.pop())

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.seek(fileHandle, offset)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while seeking in file: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	KILL: {
		// fileName$
		args: ['STRING'],
		minArgs: 1,
		action: function (vm) {
			const fileName = vm.cwd + getArgValue(vm.stack.pop())

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.kill(fileName)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.status = -2
						vm.trace.printf('Error while deleting files: %s\n', reason)
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	DIRECTORY: {
		// [fileName$, ] OUT fileNames()
		args: ['ANY', 'ARRAY OF STRING'],
		minArgs: 1,
		action: function (vm) {
			const argCount = vm.stack.pop()

			let specifier = vm.cwd + '*'

			const target = vm.stack.pop() as ArrayVariable<StringType>

			if (target.type !== vm.types['STRING']) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, 'Output needs to be a STRING array')
			}

			if (argCount > 1) {
				specifier = vm.cwd + getArgValue(vm.stack.pop())
			}

			if (vm.fileSystem) {
				vm.suspend()

				vm.fileSystem
					.directory(specifier)
					.then((files) => {
						target.resize([new Dimension(1, files.length)])
						for (let i = 0; i < files.length; i++) {
							target.assign([i + 1], new ScalarVariable<string>(vm.types['STRING'] as StringType, files[i]))
						}
						vm.status = 0
						vm.resume()
					})
					.catch((error) => {
						vm.trace.printf('Error while listing directory contents: %s\n', error)
						vm.status = -2
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `File System not available`)
			}
		},
	},

	OUT: {
		// address$, data$
		args: ['STRING', 'STRING'],
		action: function (vm) {
			const data = getArgValue(vm.stack.pop())
			const address = getArgValue(vm.stack.pop())

			if (vm.generalIo) {
				vm.suspend()

				vm.generalIo
					.output(address, data)
					.then(() => {
						vm.status = 0
						vm.resume()
					})
					.catch((reason) => {
						vm.trace.printf('Error while outputting data to address: %s\n', reason)
						vm.status = -2
						vm.resume()
					})
			} else {
				vm.status = -1
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'General IO not available')
			}
		},
	},

	CPGENKEYPAIR: {
		// OUT pubKeyId%, OUT privKeyId%
		// Generates ECDSA P-256 keys
		args: ['INTEGER', 'INTEGER'],
		action: function (vm) {
			const privKeyId = vm.stack.pop()
			const pubKeyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.genKeyPair()
					.then(([publicKeyId, privateKeyId]) => {
						privKeyId.value = privateKeyId
						pubKeyId.value = publicKeyId
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while generating key pair: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPGENKEYAES: {
		// OUT aesKeyId%
		args: ['INTEGER'],
		action: function (vm) {
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.genAESKey()
					.then((aesKeyId) => {
						keyId.value = aesKeyId
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while generating AES key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPCLRKEY: {
		// keyId%
		args: ['INTEGER'],
		action: function (vm) {
			const keyId = getArgValue(vm.stack.pop())

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.forgetKey(keyId)
					.then(() => {
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while forgetting key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPGENMKEY: {
		// OUT masterKeyId%, passphrase$
		args: ['INTEGER', 'STRING'],
		action: function (vm) {
			const passphrase = getArgValue(vm.stack.pop())
			const keyId = vm.stack.pop()

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.genEncryptedMasterKey(passphrase)
					.then((masterKeyId) => {
						keyId.value = masterKeyId
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while generating AES key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},

	CPMKEYUPDPASS: {
		// masterKeyId%, oldPassphrase$, newPassphrase$
		args: ['INTEGER', 'STRING'],
		action: function (vm) {
			const newPassphrase = getArgValue(vm.stack.pop())
			const oldPassphrase = getArgValue(vm.stack.pop())
			const keyId = getArgValue(vm.stack.pop())

			if (vm.cryptography) {
				vm.suspend()

				vm.cryptography
					.updatePassphraseKey(oldPassphrase, newPassphrase, keyId)
					.then(() => {
						vm.resume()
					})
					.catch((error) => {
						throw new RuntimeError(RuntimeErrorCodes.IO_ERROR, `Error while generating AES key: ${error}`)
					})
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, `Cryptography not available`)
			}
		},
	},
}

export interface IInstruction {
	name: string
	addrLabel?: boolean
	dataLabel?: boolean
	numArgs?: 0 | 1
	execute: (vm: VirtualMachine, arg: number | string | undefined) => void
}

interface IDataLabelInstruction extends IInstruction {
	dataLabel?: true
	numArgs?: 1
	execute: (vm: VirtualMachine, arg: number) => void
}

interface IAddrLabelInstruction extends IInstruction {
	addrLabel?: true
	numArgs?: 1
	execute: (vm: VirtualMachine, arg: number | string) => void
}

interface INoArgInstruction extends IInstruction {
	addrLabel?: false
	dataLabel?: false
	numArgs: 0
	execute: (vm: VirtualMachine, arg?: undefined) => void
}

type InstructionDefinition = {
	[key: string]: IDataLabelInstruction | IAddrLabelInstruction | INoArgInstruction
}

/**
 Defines the instruction set of the virtual machine. Each entry is indexed by
 the name of the instruction, and consists of a record of the following values:

 name: The name of the instruction for display purposes.

 addrLabel: If present, and set to "true", the argument of the instruction is
 interpretted as an address during the linking stage.

 dataLabel: If present, and set to "true", the argument of the instruction is
 the index of a DATA statement.

 numArgs: If present and set to 0, the instruction takes no arguments.
 Otherwise, it is assumed to take 1 argument.

 execute: A function taking as its first argument the virtual machine, and as
 its second argument the parameter of the instruction. It should manipulate the
 virtual machine's stack or program counter to implement the instruction.
 */
export const Instructions: InstructionDefinition = {
	FORLOOP: {
		name: 'forloop',
		addrLabel: true,
		execute: function (vm, arg) {
			// For loops are tedious to implement in bytecode, because
			// depending on whether STEP is positive or negative we either
			// compare the counter with < or >. To simplify things, we create
			// the forloop instruction to perform this comparison.

			// argument is the address of the end of the for loop.

			// stack is:
			// end value
			// step expression
			// loop variable REFERENCE

			// if the for loop is ended, then all three of its arguments are
			// popped off the stack, and we jump to the end address. Otherwise,
			// only the loop variable is popped and no branch is performed.

			const counter = vm.stack[vm.stack.length - 1]
			const step = vm.stack[vm.stack.length - 2]
			const end = vm.stack[vm.stack.length - 3]

			if ((step < 0 && counter < end) || (step > 0 && counter > end)) {
				vm.stack.length -= 3
				vm.pc = arg
			} else {
				vm.stack.pop()
			}
		},
	},

	COPYTOP: {
		name: 'copytop',
		numArgs: 0,
		execute: function (vm) {
			// Duplicates the top of the stack
			vm.stack.push(vm.stack[vm.stack.length - 1])
		},
	},

	RESTORE: {
		name: 'restore',
		dataLabel: true,
		execute: function (vm, arg) {
			// Restore the data pointer to the given value.
			if (vm.debug) {
				vm.trace.printf('RESTORE to %s\n', arg)
			}
			vm.dataPtr = arg
		},
	},

	POPVAL: {
		name: 'popval',
		execute: function (vm, arg) {
			// Argument is the name of the variable. Sets that variable's value
			// to the top of the stack.
			vm.getVariable(arg).value = vm.stack.pop()
		},
	},

	POP: {
		name: 'pop',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.pop()
		},
	},

	PUSHREF: {
		name: 'pushref',
		execute: function (vm, arg) {
			// The argument is the name of a variable. Push a reference to that
			// variable onto the top of the stack.
			vm.stack.push(vm.getVariable(arg))
		},
	},

	PUSHVALUE: {
		name: 'pushvalue',
		execute: function (vm, arg) {
			// The argument is the name of a variable. Push the value of that
			// variable to the top of the stack.
			vm.stack.push(vm.getVariable(arg).value)
		},
	},

	PUSHTYPE: {
		name: 'pushtype',
		execute: function (vm, arg) {
			// The argument is the name of a built-in or user defined type.
			// Push the type object onto the stack, for later use in an alloc
			// system call.
			vm.stack.push(vm.types[arg])
		},
	},

	POPVAR: {
		name: 'popvar',
		execute: function (vm, arg) {
			// Sets the given variable to refer to the top of the stack, and
			// pops the top of the stack. The stack top must be a reference.
			vm.setVariable(arg, vm.stack.pop())
		},
	},

	NEW: {
		name: 'new',
		execute: function (vm, arg) {
			// The argument is a typename. Replace the top of the stack with a
			// reference to that value, with the given type.
			const type = vm.types[arg]
			vm.stack.push(new ScalarVariable(type, type.copy(vm.stack.pop())))
		},
	},

	END: {
		name: 'end',
		numArgs: 0,
		execute: function (vm) {
			// End the program. The CPU ends the program when the program
			// counter reaches the end of the instructions, so make that happen
			// now.
			vm.pc = vm.instructions.length
		},
	},

	UNARY_OP: {
		name: 'unary_op',
		execute: function (vm, arg) {
			const rhs = vm.stack.pop()
			let value
			if (arg === 'NOT') {
				value = ~rhs
			} else {
				vm.trace.printf('No such unary operator: %s\n', arg)
			}

			vm.stack.push(value)
		},
	},

	'=': {
		name: '=',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() === vm.stack.pop() ? -1 : 0)
		},
	},

	'<': {
		name: '<',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs < rhs ? -1 : 0)
		},
	},

	'<=': {
		name: '<=',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs <= rhs ? -1 : 0)
		},
	},

	'>': {
		name: '>',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs > rhs ? -1 : 0)
		},
	},

	'>=': {
		name: '>=',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs >= rhs ? -1 : 0)
		},
	},

	'<>': {
		name: '<>',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() !== vm.stack.pop() ? -1 : 0)
		},
	},

	AND: {
		name: 'and',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() & vm.stack.pop())
		},
	},

	OR: {
		name: 'or',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() | vm.stack.pop())
		},
	},

	XOR: {
		name: 'or',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() ^ vm.stack.pop())
		},
	},

	EQV: {
		name: 'eqv',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push((lhs & rhs) | (lhs === rhs ? -1 : 0))
		},
	},

	IMP: {
		name: 'imp',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push((rhs & -1) | (lhs === rhs ? -1 : 0))
		},
	},

	'^': {
		name: '^',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(Math.pow(lhs, rhs))
		},
	},

	'+': {
		name: '+',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs + rhs)
		},
	},

	'-': {
		name: '-',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs - rhs)
		},
	},

	'*': {
		name: '*',
		numArgs: 0,
		execute: function (vm) {
			vm.stack.push(vm.stack.pop() * vm.stack.pop())
		},
	},

	'>>': {
		name: '>>',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs >> rhs)
		},
	},

	'<<': {
		name: '<<',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			const lhs = vm.stack.pop()
			vm.stack.push(lhs << rhs)
		},
	},

	'/': {
		name: '/',
		numArgs: 0,
		execute: function (vm) {
			// TODO: \ operator.
			const rhs = vm.stack.pop()
			if (rhs === 0) throw new RuntimeError(RuntimeErrorCodes.DIVISION_BY_ZERO, 'Division by zero')
			const lhs = vm.stack.pop()
			vm.stack.push(lhs / rhs)
		},
	},

	MOD: {
		name: 'mod',
		numArgs: 0,
		execute: function (vm) {
			const rhs = vm.stack.pop()
			if (rhs === 0) throw new RuntimeError(RuntimeErrorCodes.DIVISION_BY_ZERO, 'Division by zero')
			const lhs = vm.stack.pop()
			vm.stack.push(lhs % rhs)
		},
	},

	BZ: {
		name: 'bz',
		addrLabel: true,
		execute: function (vm, arg) {
			// Branch on zero. Pop the top of the stack. If zero, jump to
			// the given address.
			const expr = vm.stack.pop()
			if (!expr) {
				vm.pc = arg
			}
		},
	},

	BNZ: {
		name: 'bnz',
		addrLabel: true,
		execute: function (vm, arg) {
			// Branch on non-zero. Pop the top of the stack. If non-zero, jump
			// to the given address.
			const expr = vm.stack.pop()
			if (expr) {
				vm.pc = arg
			}
		},
	},

	JMP: {
		name: 'jmp',
		addrLabel: true,
		execute: function (vm, arg) {
			// Jump to the given address.
			vm.pc = arg
		},
	},

	CALL: {
		name: 'call',
		addrLabel: true,
		execute: function (vm, arg) {
			// Call a function or subroutine. This creates a new stackframe
			// with no variables defined.
			vm.frame = new StackFrame(vm.pc)
			vm.callstack.push(vm.frame)
			vm.pc = arg
		},
	},

	GOSUB: {
		name: 'gosub',
		addrLabel: true,
		execute: function (vm, arg) {
			// like call, but stack frame shares all variables from the old
			// stack frame.
			const oldvariables = vm.frame.variables
			vm.frame = new StackFrame(vm.pc)
			vm.frame.variables = oldvariables
			vm.callstack.push(vm.frame)
			vm.pc = arg
		},
	},

	RET: {
		name: 'ret',
		numArgs: 0,
		execute: function (vm) {
			// Return from a gosub, function, or subroutine call.
			const returnAddr = vm.callstack.pop()
			if (returnAddr === undefined) throw new RuntimeError(RuntimeErrorCodes.STACK_UNDERFLOW, 'Stack underflow')
			vm.pc = returnAddr.pc
			vm.frame = vm.callstack[vm.callstack.length - 1]
		},
	},

	PUSHCONST: {
		name: 'pushconst',
		execute: function (vm, arg) {
			// Push a constant value onto the stack. The argument is a
			// javascript string or number.

			vm.stack.push(arg)
		},
	},

	ARRAY_DEREF: {
		name: 'array_deref',
		numArgs: 1,
		execute: function (vm, arg) {
			// Dereference an array. The top of the stack is the variable
			// reference, followed by an integer for each dimension.

			// Argument is whether we want the reference or value.

			// get the variable
			const variable = vm.stack.pop() as ArrayVariable<any>

			const indexes: number[] = []

			// for each dimension,
			for (let i = 0; i < variable.dimensions.length; i++) {
				// pop it off the stack in reverse order.
				const index = vm.stack.pop()
				if (index === undefined) throw new RuntimeError(RuntimeErrorCodes.STACK_UNDERFLOW, 'Stack underflow')
				indexes.unshift(index)
			}

			// TODO: bounds checking.
			const arrayMember = variable.access(indexes)
			if (arrayMember === undefined) {
				throw new RuntimeError(RuntimeErrorCodes.INVALID_ARGUMENT, `Argument out of bounds`)
			}

			if (arg) {
				vm.stack.push(arrayMember)
			} else {
				vm.stack.push(arrayMember.value)
			}
		},
	},

	MEMBER_DEREF: {
		name: 'member_deref',
		execute: function (vm, arg) {
			// Dereference a user defined type member.
			// Argument is the javascript string containing the name of the
			// member. The top of the stack is a reference to the user
			// variable.

			const userVariable = vm.stack.pop()
			const deref = userVariable[arg]

			vm.stack.push(deref)
		},
	},

	MEMBER_VALUE: {
		name: 'member_value',
		execute: function (vm, arg) {
			// Dereference a user defined type member.
			// Argument is the javascript string containing the name of the
			// member. The top of the stack is a reference to the user
			// variable.

			const userVariable = vm.stack.pop()
			const deref = userVariable[arg]

			vm.stack.push(deref.value)
		},
	},

	ASSIGN: {
		name: 'assign',
		numArgs: 0,
		execute: function (vm) {
			// Copy the value into the variable reference.
			// Stack: left hand side: variable reference
			// right hand side: value to assign.

			const lhs = vm.stack.pop()
			const rhs = vm.stack.pop()

			lhs.value = lhs.type.copy(rhs)
		},
	},

	REG_EVENT_HANDLER: {
		name: 'reg_event_handler',
		numArgs: 1,
		addrLabel: true,
		execute: function (vm, arg) {
			const handler = arg
			const address = vm.stack.pop()

			if (vm.generalIo) {
				vm.generalIo.addEventListener(address, (data) => {
					const stringType = vm.types['STRING']
					const dataVariable = new ScalarVariable<string>(stringType, data)
					vm.stack.push(dataVariable)
					vm.frame = new StackFrame(vm.pc)
					vm.callstack.push(vm.frame)
					vm.pc = handler
				})
			} else {
				vm.trace.printf('General IO not available')
			}
		},
	},

	SYSCALL: {
		name: 'syscall',
		execute: function (vm, arg) {
			let variable
			let type
			let x
			let spaces
			let i
			// Execute a system function or subroutine. The argument is a
			// javascript string containing the name of the routine.
			if (vm.debug) {
				vm.trace.printf('Execute syscall %s\n', arg)
			}
			if (arg === 'print') {
				const num = 1
				for (i = 0; i < num; i++) {
					const what = vm.stack.pop()
					if (vm.debug) {
						vm.trace.printf('printing %s\n', what)
					}
					vm.cons.print('' + what)
				}
			} else if (arg === 'alloc_array') {
				type = vm.stack.pop()
				const numDimensions = vm.stack.pop()
				const dimensions: Dimension[] = []
				for (i = 0; i < numDimensions; i++) {
					const upper = vm.stack.pop()
					const lower = vm.stack.pop()
					dimensions.unshift(new Dimension(lower, upper))
				}

				variable = new ArrayVariable(type, dimensions)
				vm.stack.push(variable)
			} else if (arg === 'print_comma') {
				x = vm.cons.x
				spaces = ''
				while (++x % 14) {
					spaces += ' '
				}
				vm.cons.print(spaces)
			} else if (arg === 'print_tab') {
				const col = vm.stack.pop() - 1
				x = vm.cons.x
				spaces = ''
				while (++x < col) {
					spaces += ' '
				}
				vm.cons.print(spaces)
			} else if (arg === 'alloc_scalar') {
				type = vm.stack.pop()
				variable = new ScalarVariable(type, type.createInstance())
				vm.stack.push(variable)
			} else if (SystemFunctions[arg]) {
				SystemFunctions[arg].action(vm)
			} else if (SystemSubroutines[arg]) {
				SystemSubroutines[arg].action(vm)
			} else {
				throw new RuntimeError(RuntimeErrorCodes.UKNOWN_SYSCALL, 'Unknown syscall: ' + arg)
			}
		},
	},
}
