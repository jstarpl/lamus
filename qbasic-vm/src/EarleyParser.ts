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

import { Rule, RuleSet, IToken } from './RuleSet'
import { Token, Locus, Tokenizer } from './Tokenizer'
import { getDebugConsole as dbg, sprintf } from './DebugConsole'
import { ErrorType, IError } from './QBasic'

let NextId = 0

/** @constructor */
class EarleyItem {
	id: number
	rule: Rule
	pos: number
	base: number
	token: Token | any | undefined
	prev: EarleyItem | undefined
	locus: Locus | undefined

	constructor(rule: Rule, position: number, base: number, token?: Token, prev?: EarleyItem, locus?: Locus) {
		this.id = NextId++
		this.rule = rule
		this.pos = position
		this.base = base
		this.token = token
		this.prev = prev
		this.locus = locus
	}

	public toString() {
		let str = '[' + this.id + '] ' + this.rule.name + ':'
		let i
		for (i = 0; i < this.rule.symbols.length; i++) {
			if (i === this.pos) {
				str += ' .'
			}
			str += ' ' + this.rule.symbols[i]
		}

		if (i === this.pos) {
			str += ' .'
		}
		str += ', ' + this.base
		if (this.token instanceof Token) {
			str += ', token=' + this.token.text
		} else if (this.token) {
			str += ', rule=' + this.token.rule
		}
		if (this.prev) {
			str += ', prev=' + this.prev.id
		}
		return str
	}
}

/**
  The Earley parser is like the proverbial tortoise. Its simplicity lets slowly
  but surely it chug through any grammar you throw its way.

  @constructor
 */
export class EarleyParser {
	EPSILON: IToken
	tokenizer: Tokenizer
	first: object
	rules: {
		[key: string]: Rule[]
	}

	errors: IError[]

	debug: boolean

	locus: Locus

	constructor(ruleSet: RuleSet) {
		// Map from rule name to NFA.
		this.tokenizer = ruleSet.createTokenizer()
		this.EPSILON = ruleSet.EPSILON

		ruleSet.computeFirst()

		this.rules = ruleSet.rules
		this.first = ruleSet.first

		// lthis.debug = true
	}

	public getNonTerminal(name) {
		return this.rules[name]
	}

	public getRegexFromTerminal(terminal) {
		return terminal.substr(1, terminal.length - 2)
	}

	public isTerminal(symbol) {
		return symbol !== undefined && symbol[0] === "'"
	}

	public isNonTerminal(symbol) {
		return symbol !== undefined && symbol[0] !== "'"
	}

	public parse(text) {
		let states = [[new EarleyItem(this.rules._start[0], 0, 0)]]

		let line = 0
		let position = 0
		let j
		this.tokenizer.setText(text)

		this.errors = []

		let i
		for (i = 0; ; i++) {
			let token = this.tokenizer.nextToken(line, position)
			if (token === null) {
				this.errors.push({
					message: sprintf('Bad token at %d:%d\n', line, position),
					type: ErrorType.UnknownToken,
					locus: {
						line,
						position,
					},
				})
				dbg().printf('Bad token!\n')
				return null
			} else if (this.debug) {
				dbg().printf('Got token %s at %s\n', token, token.locus)
			}
			this.locus = token.locus

			states.push([])
			let processedTo = 0
			while (processedTo < states[i].length) {
				// remain calm
				this.predict(states[i], processedTo, i, token)
				this.complete(states, i, processedTo, i)
				processedTo++
			}

			this.scan(states, i, token)

			if (states[i].length === 0) {
				this.errors.push({
					message: sprintf('Syntax error at %s: %s', this.locus, token),
					type: ErrorType.SyntaxError,
					locus: {
						line,
						position,
					},
				})
				for (j = 0; j < states[i - 1].length; j++) {
					this.errors.push(sprintf('    %s\n', states[i - 1][j]))
				}
				break
			}

			if (this.debug) {
				this.printState(states, i)
			}

			line = token.locus.line
			position = token.locus.position + token.text.length

			if (token.id === this.tokenizer.EOF_TOKEN) {
				// dbg().printf("Reached end of input.\n");
				i++
				break
			}
		}

		if (this.debug) {
			this.printState(states, i)
		}
		if (states[i].length) {
			return this.evaluate(states[i][0])
		}

		this.errors.push(sprintf('Syntax error at %s', this.locus))
		for (j = 0; j < states[i - 1].length; j++) {
			this.errors.push(sprintf('    %s\n', states[i - 1][j]))
		}
		return null
	}

	public predict(items, index, base, token) {
		let item = items[index]
		if (this.isNonTerminal(item.rule.symbols[item.pos])) {
			let nonTerminal = this.getNonTerminal(item.rule.symbols[item.pos])
			for (let i = 0; i < nonTerminal.length; i++) {
				let rule = nonTerminal[i]
				if (
					rule.symbols.length === 0 ||
					rule.symbols[0][0] === "'" ||
					this.first[rule.symbols[0]][token.id] ||
					this.first[rule.symbols[0]][this.EPSILON]
				) {
					this.addToState(items, rule, 0, base, undefined, undefined)
				}
			}
		}
	}

	public complete(states, i, index, _base) {
		let item = states[i][index]
		if (item.pos === item.rule.symbols.length) {
			let baseItems = states[item.base]
			for (let j = 0; j < baseItems.length; j++) {
				if (baseItems[j].rule.symbols[baseItems[j].pos] === item.rule.name) {
					this.addToState(states[i], baseItems[j].rule, baseItems[j].pos + 1, baseItems[j].base, item, baseItems[j])
				}
			}
		}
	}

	public scan(states, i, token) {
		let items = states[i]
		for (let j = 0; j < items.length; j++) {
			if (items[j].rule.symbols[items[j].pos] === token.id) {
				states[i + 1].push(new EarleyItem(items[j].rule, items[j].pos + 1, items[j].base, token, items[j], this.locus))
			}
		}
	}

	public addToState(items, rule, pos, base, token, prev) {
		for (let i = 0; i < items.length; i++) {
			if (items[i].rule === rule && items[i].pos === pos && items[i].base === base) {
				return
			}
		}
		items.push(new EarleyItem(rule, pos, base, token, prev, this.locus))
	}

	public printState(states, index) {
		if (!this.debug) {
			return
		}
		let items = states[index]
		dbg().printf('State [%d]\n', index)
		for (let i = 0; i < items.length; i++) {
			dbg().printf('%s\n', items[i])
		}
		dbg().printf('\n')
	}

	// ----------------------------------------------------------------------
	// Given an earley item, reconstruct the dervation and invoke any associated
	// actions.
	// ----------------------------------------------------------------------
	public evaluate(itemIn: EarleyItem) {
		if (!itemIn) {
			return
		}

		let args: string[] = []
		let item: EarleyItem | undefined = itemIn
		let locus = itemIn.locus

		while (item) {
			if (item.token instanceof Token) {
				args.unshift(item.token.text)
			} else if (item.token) {
				args.unshift(this.evaluate(item.token))
			}
			locus = item.locus
			item = item.prev
		}

		let result

		if (itemIn.rule.action) {
			result = itemIn.rule.action(args, locus)
		} else {
			result = args[0]
		}
		return result
	}
}
