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

import { ILocus } from './QBasic'
import { getDebugConsole as dbg } from './DebugConsole'

let NextStateId = 0

let POST_NEWLINE = -1
let PRE_NEWLINE = -2
let DIGIT_CHAR = -3
let ANY_CHAR = -4

type Char = string | number

/**
  Represents a location in the source file. (The name "location" cannot be used
  because it has a special meaning in browsers.) This is used throughout the
  compiler to map program statements to token positions.

  @constructor
 */
export class Locus implements ILocus {
	line: number
	position: number

	constructor(line: number, position: number) {
		this.line = line
		this.position = position
	}

	public toString() {
		return '' + (this.line + 1) + ':' + (this.position + 1)
	}
}

/**
  When the match function is called, it will return true if the argument
  matches a particular character.

  @constructor
 */
export class CharMatcher {
	mchar: Char

	constructor(ch: Char) {
		this.mchar = ch
	}

	public match(ch: Char) {
		// dbg.printf("Compare %s with %s\n", this.mchar, ch );
		if (this.mchar === DIGIT_CHAR) {
			return ch >= '0' && ch <= '9'
		} else if (this.mchar === ANY_CHAR) {
			return ch !== POST_NEWLINE && ch !== PRE_NEWLINE && ch !== '\n'
		} else {
			return ch === this.mchar
		}
	}

	public toString() {
		if (this.mchar === DIGIT_CHAR) {
			return '\\d'
		} else {
			return this.mchar
		}
	}
}

/**
  When the match function is called, it will return true if the argument
  matches a particular character range.

  @constructor
 */
export class RangeMatcher {
	ranges: string[][]
	include: boolean

	constructor(ranges: string[][], include: boolean) {
		// list of [ start, end ]
		this.ranges = ranges
		this.include = include // boolean
	}

	public match(ch) {
		for (let i = 0; i < this.ranges.length; i++) {
			let range = this.ranges[i]
			if (ch >= range[0] && ch <= range[1]) {
				return this.include
			}
		}

		return !this.include
	}

	public toString() {
		let str = '['
		if (!this.include) {
			str += '^'
		}
		for (let i = 0; i < this.ranges.length; i++) {
			if (this.ranges[i][0] === this.ranges[i][1]) {
				str += this.ranges[i][0]
			} else {
				str += this.ranges[i][0] + '-' + this.ranges[i][1]
			}
		}
		return str + ']'
	}
}

/** @constructor */
export class NfaState {
	mchar: RangeMatcher | CharMatcher | null
	next: NfaState[]
	id: number
	lastList: number
	accept: any

	constructor(charMatcher: RangeMatcher | CharMatcher | null) {
		this.mchar = charMatcher
		this.next = []
		this.id = NextStateId++
		this.lastList = 0
		this.accept = undefined
	}

	public toString() {
		let str = '\nState [' + this.id + '] ch=' + this.mchar + '\n'
		if (this.accept !== undefined) {
			str += '    Accept ' + this.accept + '\n'
		}
		for (let i = 0; i < this.next.length; i++) {
			str +=
				'    ch=' + this.next[i].mchar + ' goto [' + this.next[i].id + ']\n'
		}
		return str
	}
}

/** @constructor */
export class DfaState {
	nfaStates: NfaState[]
	next: object
	accepts: any[]
	id: number

	constructor() {
		this.nfaStates = []
		this.next = {}
		this.accepts = []
		this.id = NextStateId++
	}
}

/** @constructor */
class NFA {
	start: NfaState
	end: NfaState

	constructor(start, end) {
		this.start = start
		this.end = end
	}

	public toString() {
		let processed = {}
		let stack = [this.start]
		let str = ''

		while (stack.length > 0) {
			let state = stack.pop()!
			if (processed[state.toString()]) {
				continue
			}
			processed[state.toString()] = 1

			for (let i = 0; i < state.next.length; i++) {
				stack.push(state.next[i])
			}
			str += state.toString()
		}
		return str
	}
}

export class Token {
	id: string
	text: string
	position: number
	locus: Locus

	constructor(id, text, line, position) {
		this.id = id
		this.text = text
		this.locus = new Locus(line, position)
	}

	public toString() {
		return 'Token(' + this.text + ')'
	}
}

export class Tokenizer {
	root: NfaState
	rootDfa: DfaState
	expr: any
	index: number
	listId: number
	dfaCache: {
		[key: string]: DfaState
	}
	text: string
	lineNumbers: number[]

	EOF_TOKEN: any
	IGNORE_TOKEN: any

	finished: boolean

	constructor() {
		this.root = new NfaState(null)
		this.expr = null
		this.index = 0
		this.listId = 1
		this.dfaCache = {}

		// text to tokenize.
		this.text = ''

		// for each line, the character position of that line in the text.
		this.lineNumbers = []

		// users can redefine these if they want.
		this.EOF_TOKEN = {}
		this.IGNORE_TOKEN = {}

		// check this to determine if we have reached the end of the text.
		this.finished = true
	}

	public addToken(id, expr) {
		this.expr = expr
		this.index = 0
		let nfa = this.parseAlternation()
		this.root.next.push(nfa.start)
		nfa.end.accept = id
	}

	public ignore(expr) {
		this.addToken(this.IGNORE_TOKEN, expr)
	}

	public eof() {
		return this.index === this.expr.length
	}

	public matchChar(ch) {
		if (this.expr[this.index] === ch) {
			this.index++
			return true
		}
		return false
	}

	public peek(ch) {
		return this.expr[this.index] === ch
	}

	public parseChar() {
		if (this.matchChar('\\')) {
			if (this.matchChar('n')) {
				return '\n'
			} else if (this.matchChar('r')) {
				return '\r'
			} else if (this.matchChar('t')) {
				return '\t'
			} else if (this.matchChar('d')) {
				return DIGIT_CHAR
			} else {
				return this.expr[this.index++]
			}
		} else if (this.matchChar('.')) {
			return ANY_CHAR
		} else if (this.matchChar('$')) {
			return PRE_NEWLINE
		} else if (this.matchChar('^')) {
			return POST_NEWLINE
		} else {
			return this.expr[this.index++]
		}
	}

	public parseRange() {
		let include = true
		let ranges: string[][] = []

		while (!this.eof() && !this.peek(']')) {
			if (this.matchChar('^')) {
				include = false
			}
			let first = this.parseChar()
			let last = first
			if (this.matchChar('-')) {
				last = this.parseChar()
			}

			if (first === DIGIT_CHAR) {
				first = '0'
				last = '9'
			}

			// dbg.printf("Pushing range %s..%s\n", first, last );
			ranges.push([first, last])
		}

		let state = new NfaState(new RangeMatcher(ranges, include))
		return new NFA(state, state)
	}

	public parseBasic() {
		let nfa

		if (this.matchChar('(')) {
			nfa = this.parseAlternation()
			if (!this.matchChar(')')) {
				throw new Error("Expected ')'")
			}
		} else if (this.matchChar('[')) {
			// dbg.printf("Encountered RANGE!\n");
			nfa = this.parseRange()
			if (!this.matchChar(']')) {
				throw new Error("Expected ']'")
			}
		} else {
			let state = new NfaState(new CharMatcher(this.parseChar()))
			nfa = new NFA(state, state)
		}

		return nfa
	}

	public parseKleene() {
		let nfa = this.parseBasic()
		let splitter
		if (this.matchChar('+')) {
			splitter = new NfaState(null)
			nfa.end.next.push(splitter)
			splitter.next.push(nfa.start)
			nfa.end = splitter
		} else if (this.matchChar('*')) {
			splitter = new NfaState(null)
			splitter.next.push(nfa.start)
			nfa.end.next.push(splitter)
			nfa.start = splitter
			nfa.end = splitter
		} else if (this.matchChar('?')) {
			let start = new NfaState(null)
			let end = new NfaState(null)
			start.next.push(nfa.start)
			start.next.push(end)
			nfa.end.next.push(end)
			nfa.start = start
			nfa.end = end
		}

		return nfa
	}

	public parseConcat() {
		let start = new NfaState(null)
		let end = start
		for (;;) {
			if (this.peek('|') || this.peek(')') || this.eof()) {
				break
			}
			let nfa = this.parseKleene()
			end.next.push(nfa.start)
			end = nfa.end
		}
		return new NFA(start, end)
	}

	public parseAlternation() {
		let start = new NfaState(null)
		let end = new NfaState(null)
		do {
			let nfa = this.parseConcat()
			start.next.push(nfa.start)
			nfa.end.next.push(end)
		} while (this.matchChar('|'))

		return new NFA(start, end)
	}

	public addState(nfaStateList: NfaState[], accepts, nfaState) {
		if (nfaState.lastList === this.listId) {
			// dbg.printf("Skip adding nfa State [%d]\n", nfaState.id );
			return
		}

		// dbg.printf("Add NFA state [%d]\n", nfaState.id );
		if (nfaState.accept !== undefined) {
			accepts.push(nfaState.accept)
		}

		nfaState.lastList = this.listId
		nfaStateList.push(nfaState)

		if (nfaState.mchar === null) {
			for (let i = 0; i < nfaState.next.length; i++) {
				this.addState(nfaStateList, accepts, nfaState.next[i])
			}
		}
	}

	public nextState(dfaState: DfaState, ch) {
		let nfaStateList: NfaState[] = []
		let accepts = []
		let i
		// dbg.printf("Transition from DFA[%d] on ch=%s\n", dfaState.id, ch );

		this.listId++

		for (i = 0; i < dfaState.nfaStates.length; i++) {
			let nfaState = dfaState.nfaStates[i]
			if (nfaState.mchar !== null) {
				if (nfaState.mchar.match(ch)) {
					this.addState(nfaStateList, accepts, nfaState.next[0])
				} else if (ch === PRE_NEWLINE || ch === POST_NEWLINE) {
					this.addState(nfaStateList, accepts, nfaState)
				}
			}
		}

		nfaStateList.sort(function(a, b) {
			return a.id - b.id
		})

		let key = ''
		for (i = 0; i < nfaStateList.length; i++) {
			key += nfaStateList[i].id + '.'
		}

		if (!this.dfaCache[key]) {
			dfaState = new DfaState()
			// dbg.printf("Created DFA state [%d] accepts=%s\n", dfaState.id, accepts );
			dfaState.nfaStates = nfaStateList
			dfaState.accepts = accepts
			this.dfaCache[key] = dfaState
		} else {
			// dbg.printf("Returning cached DFA state [%d] accepts=%s\n",
			//        this.dfaCache[key].id, this.dfaCache[key].accepts );
		}

		return this.dfaCache[key]
	}

	public setText(text: string) {
		this.text = text
		this.lineNumbers.length = 0
		this.lineNumbers.push(0)
		this.finished = false

		for (let i = 0; i < this.text.length; i++) {
			if (this.text[i] === '\n') {
				this.lineNumbers.push(i + 1)
			}
		}
	}

	public getLine(lineno: number) {
		return this.text.substr(
			this.lineNumbers[lineno],
			this.lineNumbers[lineno + 1] - this.lineNumbers[lineno]
		)
	}

	/**
		Retrieve a list of tokens that match at a given position. The list is
		returned sorted in order of length.

		@param text Text to match.
		@param line Line number to begin matching, starting from 0
		@param position Character position on the line to begin matching.
	*/
	public nextTokenInternal(line, position) {
		let last: Char = ''
		let accept: Token | null = null

		if (!this.rootDfa) {
			this.rootDfa = new DfaState()
			this.addState(this.rootDfa.nfaStates, this.rootDfa.accepts, this.root)
		}

		let dfaState = this.rootDfa

		let startPosition = this.lineNumbers[line] + position
		// dbg.printf("Start match from %d:%d\n", line, position );

		if (startPosition === this.text.length) {
			this.finished = true
			return new Token(this.EOF_TOKEN, '!xxxxEOF', line, position)
		}

		if (startPosition > 0) {
			last = this.text[startPosition - 1]
		}

		for (let i = startPosition; i < this.text.length; i++) {
			// dbg.printf("Enter DFA state %d\n", dfaState.id );
			let ch: Char = this.text[i]

			if (ch === '\n' && last !== PRE_NEWLINE) {
				ch = PRE_NEWLINE
				i--
			} else if (last === '\n' || last === 0) {
				ch = POST_NEWLINE
				i--
			}

			if (last === '\n') {
				line++
			}
			last = ch

			if (dfaState.next[ch] === undefined) {
				dfaState.next[ch] = this.nextState(dfaState, ch)
			}
			dfaState = dfaState.next[ch]

			if (dfaState.accepts.length) {
				// dbg.printf("Would accept %s\n", dfaState.accepts[0] );
				// dbg.printf("i:%d line:%d lineNumbers=%d\n",
				//    i, line, this.lineNumbers[line] );
				accept = new Token(
					dfaState.accepts[0],
					this.text.substr(startPosition, i - startPosition + 1),
					line,
					startPosition - this.lineNumbers[line]
				)
			}

			if (dfaState.nfaStates.length === 0) {
				break
			}
		}

		if (accept) {
			// dbg.printf("Returning match id=%s at %d:%d text=%s\n", accept.id,
			//    accept.locus.line, accept.locus.position, accept.text );
		} else {
			dbg().printf("Bad token at '%s'\n", this.text.substr(startPosition, 10))
			dbg().printf('ascii %d\n', this.text.charCodeAt(startPosition))
		}

		return accept
	}

	public nextToken(line, position) {
		for (;;) {
			let token = this.nextTokenInternal(line, position)
			if (token === null || token.id !== this.IGNORE_TOKEN) {
				return token
			}
			line = token.locus.line
			position = token.locus.position + token.text.length
		}
	}
}
