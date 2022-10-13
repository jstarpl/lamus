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

interface IMatch {
	match: RegExpMatchArray
	left: boolean
	sign: string
	pad: string
	min: number
	precision: number
	code: string
	negative: boolean
	argument: string
}

export class DebugConsole {
	ta: HTMLTextAreaElement | HTMLElement

	constructor(textarea: HTMLTextAreaElement | HTMLElement) {
		this.ta = textarea
		setDebugConsole(this)
	}

	print(str: string) {
		const segments = str.split('\n')
		for (let i = 0; i < segments.length; i++) {
			this.ta.appendChild(document.createTextNode(segments[i]))
			if (i < segments.length - 1) {
				this.ta.appendChild(document.createElement('br'))
			}
		}
	}

	printf(data: any[]): void
	printf(text: string, ...args: any[]): void
	printf(...args: any[]): void {
		function convert(match, nosign?: boolean) {
			if (nosign) {
				match.sign = ''
			} else {
				match.sign = match.negative ? '-' : match.sign
			}
			const l = match.min - match.argument.length + 1 - match.sign.length
			const pad = new Array(l < 0 ? 0 : l).join(match.pad)
			if (!match.left) {
				if (match.pad === '0' || nosign) {
					return match.sign + pad + match.argument
				} else {
					return pad + match.sign + match.argument
				}
			} else {
				if (match.pad === '0' || nosign) {
					return match.sign + match.argument + pad.replace(/0/g, ' ')
				} else {
					return match.sign + match.argument + pad
				}
			}
		}

		if (args.length < 1) {
			return
		}
		if (args[0] instanceof Array) {
			args = args[0]
		}
		if (typeof args[0] !== 'string') {
			return
		}

		const formatString = args[0]
		const exp = new RegExp(
			/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g
		)
		const matches: IMatch[] = []
		const strings: string[] = []
		let convCount = 0
		let stringPosStart = 0
		let stringPosEnd = 0
		let matchPosEnd = 0
		let newString = ''
		let match
		let substitution

		for (;;) {
			match = exp.exec(formatString)
			if (!match) {
				break
			}
			if (match[9]) {
				convCount += 1
			}

			stringPosStart = matchPosEnd
			stringPosEnd = exp.lastIndex - match[0].length
			strings[strings.length] = formatString.substring(
				stringPosStart,
				stringPosEnd
			)

			matchPosEnd = exp.lastIndex
			matches[matches.length] = {
				match: match[0],
				left: match[3] ? true : false,
				sign: match[4] || '',
				pad: match[5] || ' ',
				min: match[6] || 0,
				precision: match[8],
				code: match[9] || '%',
				negative: parseInt(args[convCount], 10) < 0 ? true : false,
				argument: String(args[convCount])
			}
		}
		strings[strings.length] = formatString.substring(matchPosEnd)

		if (args.length - 1 < convCount) {
			return
		}

		let i = 0

		for (i = 0; i < matches.length; i++) {
			if (matches[i].code === '%') {
				substitution = '%'
			} else if (matches[i].code === 'b') {
				matches[i].argument = String(
					Math.abs(parseInt(matches[i].argument, 10)).toString(2)
				)
				substitution = convert(matches[i], true)
			} else if (matches[i].code === 'c') {
				matches[i].argument = String(
					String.fromCharCode(Math.abs(parseInt(matches[i].argument, 10)))
				)
				substitution = convert(matches[i], true)
			} else if (matches[i].code === 'd') {
				matches[i].argument = String(
					Math.abs(parseInt(matches[i].argument, 10))
				)
				substitution = convert(matches[i])
			} else if (matches[i].code === 'f') {
				matches[i].argument = String(
					Math.abs(parseFloat(matches[i].argument)).toFixed(
						matches[i].precision ? matches[i].precision : 6
					)
				)
				substitution = convert(matches[i])
			} else if (matches[i].code === 'o') {
				matches[i].argument = String(
					Math.abs(parseInt(matches[i].argument, 10)).toString(8)
				)
				substitution = convert(matches[i])
			} else if (matches[i].code === 's') {
				matches[i].argument = matches[i].argument.substring(
					0,
					matches[i].precision
						? matches[i].precision
						: matches[i].argument.length
				)
				substitution = convert(matches[i], true)
			} else if (matches[i].code === 'x') {
				matches[i].argument = String(
					Math.abs(parseInt(matches[i].argument, 10)).toString(16)
				)
				substitution = convert(matches[i])
			} else if (matches[i].code === 'X') {
				matches[i].argument = String(
					Math.abs(parseInt(matches[i].argument, 10)).toString(16)
				)
				substitution = convert(matches[i]).toUpperCase()
			} else {
				substitution = matches[i].match
			}

			newString += strings[i]
			newString += substitution
		}

		newString += strings[i]
		this.print(newString)
	}
}

export function sprintf(data: any[])
export function sprintf(text: string, ...args: any[])
export function sprintf(...args: any[]) {
	if (args.length === 1 && args[0] instanceof Array) {
		args = args[0]
	}
	const format = args[0]
	let output = ''

	const segments = format.split(/%[^%]/)
	for (let i = 0; i < segments.length; i++) {
		output += segments[i]
		if (args[i + 1] !== undefined) {
			output += args[i + 1]
		}
	}

	return output
}

let DEBUG_CONSOLE_SINGLETON: DebugConsole

export function setDebugConsole(dbg: DebugConsole) {
	DEBUG_CONSOLE_SINGLETON = dbg
}

function noop() {}

export function getDebugConsole() {
	return (
		DEBUG_CONSOLE_SINGLETON || {
			print: noop,
			printf: noop
		}
	)
}
