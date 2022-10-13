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

import { SomeType, SomeScalarType } from './Types'
import { getDebugConsole as dbg } from './DebugConsole'
import { IVisitor } from './IVisitor'
import './types/array.extensions'
import { TypeChecker } from './TypeChecker'
import { CodeGenerator } from './CodeGenerator'
import { RuleParser } from './RuleParser'
import { EarleyParser } from './EarleyParser'

export class AstProgram implements AstStatement {
	locus: ILocus
	subs: AstSubroutine[]

	constructor(locus, mainSub) {
		this.locus = locus
		this.subs = [mainSub]
	}

	public accept(visitor: IVisitor) {
		visitor.visitProgram(this)
	}
}

export class AstArgument implements AstStatement {
	locus: ILocus
	name: string
	typeName: string | null
	isArray: boolean
	type: SomeType
	wantRef: boolean

	constructor(
		locus: ILocus,
		name: string,
		typeName: string | null,
		isArray?: boolean
	) {
		this.locus = locus
		// name of declared subroutine argument.
		this.name = name

		// null, or the typename in AS type
		this.typeName = typeName

		// is this an open-ended array?
		this.isArray = isArray || false
	}

	public accept(visitor: IVisitor) {
		visitor.visitArgument(this)
	}
}

export class AstSubroutine implements AstStatement {
	locus: ILocus
	name: string
	args: AstArgument[]
	statements: AstStatement[]
	isFunction: boolean
	isStatic: boolean

	constructor(
		locus: ILocus,
		name: string,
		args: AstArgument[],
		statementList: any[],
		isFunction?: boolean,
		isStatic?: boolean
	) {
		this.locus = locus
		this.name = name
		this.args = args
		this.statements = statementList
		this.isFunction = isFunction || false
		this.isStatic = isStatic || false
	}

	public accept(visitor: IVisitor) {
		visitor.visitSubroutine(this)
	}
}

export class AstDeclareFunction implements AstStatement {
	locus: ILocus
	name: string
	args: AstArgument[]
	isFunction: boolean
	type: SomeType
	hasBody: boolean
	used: boolean

	constructor(
		locus: ILocus,
		name: string,
		args: AstArgument[],
		isFunction?: boolean
	) {
		this.locus = locus
		this.name = name
		this.args = args // array of AstArgument
		this.isFunction = isFunction || false
		this.hasBody = false // Set to true during type checking
		// if sub is later implemented.
		this.used = false
	}

	public accept(visitor: IVisitor) {
		visitor.visitDeclareFunction(this)
	}
}

export class AstPrintUsingStatement implements AstStatement {
	locus: ILocus
	exprList: any[]
	terminator: string | null

	constructor(locus: ILocus, exprList: any[], terminator: string | null) {
		this.locus = locus
		this.exprList = exprList // array of expressions. The first is used as the
		// format string.
		this.terminator = terminator // literal ';', ',', or null
	}

	public accept(visitor: IVisitor) {
		visitor.visitPrintUsingStatement(this)
	}
}

export class AstPrintStatement implements AstStatement {
	locus: ILocus
	printItems: AstPrintItem[]

	constructor(locus: ILocus, printItems: AstPrintItem[]) {
		this.locus = locus
		this.printItems = printItems
	}

	public accept(visitor: IVisitor) {
		visitor.visitPrintStatement(this)
	}
}

export enum AstPrintItemType {
	EXPR = 0,
	TAB = 1
}

export class AstPrintItem implements AstStatement {
	locus: ILocus
	type: AstPrintItemType
	expr: any
	terminator: string | null | undefined

	constructor(
		locus: ILocus,
		type: AstPrintItemType,
		expr: any,
		terminator: string | null | undefined
	) {
		this.locus = locus
		// Type: 0 for expr, 1 for tab, in which case expr is the argument.
		this.type = type

		this.expr = expr // can be null!
		this.terminator = terminator // comma, semicolon, or nothing.
	}

	public accept(visitor: IVisitor) {
		visitor.visitPrintItem(this)
	}
}

export class AstOpenStatement implements AstStatement {
	locus: ILocus
	fileNameExpr: any
	mode: string
	fileHandle: AstVariableReference | AstConstantExpr

	constructor(
		locus: ILocus,
		fileNameExpr: any,
		mode: string,
		fileHandle: AstVariableReference | AstConstantExpr
	) {
		this.locus = locus
		this.fileNameExpr = fileNameExpr
		this.mode = (mode || '').toUpperCase()
		this.fileHandle = fileHandle
	}

	public accept(visitor: IVisitor) {
		visitor.visitOpenStatement(this)
	}
}

export class AstCloseStatement implements AstStatement {
	locus: ILocus
	fileHandles: (AstVariableReference | AstConstantExpr)[]

	constructor(
		locus: ILocus,
		fileHandles: (AstVariableReference | AstConstantExpr)[]
	) {
		this.locus = locus
		this.fileHandles = fileHandles
	}

	public accept(visitor: IVisitor) {
		visitor.visitCloseStatement(this)
	}
}

export class AstWriteStatement implements AstStatement {
	locus: ILocus
	fileHandle: AstVariableReference | AstConstantExpr
	writeItems: AstPrintItem[]

	constructor(
		locus: ILocus,
		fileHandle: AstVariableReference | AstConstantExpr,
		writeItems: AstPrintItem[]
	) {
		this.locus = locus
		this.writeItems = writeItems
		this.fileHandle = fileHandle
	}

	public accept(visitor: IVisitor) {
		visitor.visitWriteStatement(this)
	}
}

export class AstInputStatement implements AstStatement {
	locus: ILocus
	line: boolean
	promptExpr: any
	printQuestionMark: boolean
	identifiers: any[]
	newLineAfterEnter: boolean
	fileHandle: AstVariableReference | AstConstantExpr | undefined

	constructor(
		locus: ILocus,
		line: boolean,
		promptExpr: any,
		printQuestionMark: boolean,
		identifiers: any[],
		newLineAfterEnter = true,
		fileHandle = undefined
	) {
		this.locus = locus
		this.line = line
		this.promptExpr = promptExpr // can be null.
		this.printQuestionMark = printQuestionMark
		this.identifiers = identifiers // actually we will only use the first one.
		this.newLineAfterEnter = newLineAfterEnter
		this.fileHandle = fileHandle
	}

	public accept(visitor: IVisitor) {
		visitor.visitInputStatement(this)
	}
}

export class AstNullStatement implements AstStatement {
	locus: ILocus

	constructor(locus: ILocus) {
		this.locus = locus
	}

	public accept(visitor: IVisitor) {
		visitor.visitNullStatement(this)
	}
}

export class AstEndStatement implements AstStatement {
	locus: ILocus

	constructor(locus: ILocus) {
		this.locus = locus
	}

	public accept(visitor: IVisitor) {
		visitor.visitEndStatement(this)
	}
}

export class AstNextStatement implements AstStatement {
	locus: ILocus
	identifiers: any[]

	constructor(locus: ILocus, identifierList: any[]) {
		this.locus = locus
		this.identifiers = identifierList
	}

	public accept(visitor: IVisitor) {
		visitor.visitNextStatement(this)
	}
}

export class AstArrayDeref implements AstStatement {
	locus: ILocus
	expr: any
	parameters: any[]
	type: SomeType
	wantRef: boolean

	constructor(locus: ILocus, expr: any, parameters: any[]) {
		this.locus = locus
		this.expr = expr
		this.parameters = parameters
	}

	public accept(visitor: IVisitor) {
		visitor.visitArrayDeref(this)
	}
}

export class AstMemberDeref implements AstStatement {
	locus: ILocus
	lhs: any
	identifier: string
	wantRef: boolean

	constructor(locus: ILocus, lhs: any, identifier: string) {
		this.locus = locus
		this.lhs = lhs
		this.identifier = identifier
	}

	public accept(visitor: IVisitor) {
		visitor.visitMemberDeref(this)
	}
}

export class AstVariableReference implements AstStatement {
	locus: ILocus
	lhs: any
	name: string
	wantRef: boolean
	type: SomeType

	constructor(locus: ILocus, lhs: any, name: string) {
		this.locus = locus
		this.lhs = lhs
		this.name = name
	}

	public accept(visitor: IVisitor) {
		visitor.visitVariableReference(this)
	}
}

export class AstRange implements AstStatement {
	locus: ILocus
	lowerExpr: any
	upperExpr: any

	constructor(locus: ILocus, lowerExpr: any, upperExpr: any) {
		this.locus = locus
		// lower and upper are possibly equal. in this case, we should avoid
		// evaluating the expression twice.
		this.lowerExpr = lowerExpr
		this.upperExpr = upperExpr
	}

	public accept(visitor: IVisitor) {
		visitor.visitRange(this)
	}
}

export class AstDataStatement implements AstStatement {
	locus: ILocus
	data: any

	constructor(locus: ILocus, data: any) {
		this.locus = locus
		this.data = data
	}

	public accept(visitor: IVisitor) {
		visitor.visitDataStatement(this)
	}
}

export class AstRestoreStatement implements AstStatement {
	locus: ILocus
	label: string | null

	constructor(locus: ILocus, label: string | null) {
		this.locus = locus
		// label can be null
		this.label = label
	}

	public accept(visitor: IVisitor) {
		visitor.visitRestoreStatement(this)
	}
}

export class AstDimStatement implements AstStatement {
	locus: ILocus
	name: string
	ranges: AstRange[]
	typeName: string | null
	shared: boolean

	constructor(
		locus: ILocus,
		name: string,
		ranges: AstRange[],
		typeName: string | null
	) {
		this.locus = locus
		this.name = name
		this.ranges = ranges // list of AstRange
		this.typeName = typeName // possibly null
		this.shared = false // changed to true during parsing.
	}

	public accept(visitor: IVisitor) {
		visitor.visitDimStatement(this)
	}
}

export class AstDefTypeStatement implements AstStatement {
	locus: ILocus
	typeName: string | null

	constructor(locus: ILocus, typeName: string | null) {
		this.locus = locus
		this.typeName = typeName
	}

	public accept(visitor: IVisitor) {
		visitor.visitDefTypeStatement(this)
	}
}

export class AstConstStatement implements AstStatement {
	locus: ILocus
	name: string
	expr: any

	constructor(locus: ILocus, name: string, expr: any) {
		this.locus = locus
		this.name = name
		this.expr = expr
	}

	public accept(visitor: IVisitor) {
		visitor.visitConstStatement(this)
	}
}

export enum AstDoStatementType {
	INFINITE = 1,
	UNTIL = 2,
	WHILE_AT_END = 3
}

export class AstDoStatement implements AstStatement {
	locus: ILocus
	statements: any[]
	expr: any
	type: AstDoStatementType

	constructor(
		locus: ILocus,
		statements: any[],
		expr: any,
		type: AstDoStatementType
	) {
		this.locus = locus
		this.statements = statements
		this.expr = expr
		this.type = type
	}

	public accept(visitor: IVisitor) {
		visitor.visitDoStatement(this)
	}
}

export class AstExitStatement implements AstStatement {
	locus: ILocus
	what: string // "FOR" or "DO"

	constructor(locus: ILocus, what: string) {
		this.locus = locus
		this.what = what // "FOR" or "DO"
	}

	public accept(visitor: IVisitor) {
		visitor.visitExitStatement(this)
	}
}

export class AstWhileLoop implements AstStatement {
	locus: ILocus
	expr: any
	statements: any[]

	constructor(locus: ILocus, expr: any, statements: any[]) {
		this.locus = locus
		this.expr = expr
		this.statements = statements
	}

	public accept(visitor: IVisitor) {
		visitor.visitWhileLoop(this)
	}
}

export class AstForLoop implements AstStatement {
	locus: ILocus
	identifier: string
	startExpr: any
	endExpr: any
	stepExpr: any

	constructor(
		locus: ILocus,
		identifier: string,
		startExpr: any,
		endExpr: any,
		stepExpr: any
	) {
		this.locus = locus
		this.identifier = identifier
		this.startExpr = startExpr
		this.endExpr = endExpr
		this.stepExpr = stepExpr
	}

	public accept(visitor: IVisitor) {
		visitor.visitForLoop(this)
	}
}

export class AstIfStatement implements AstStatement {
	locus: ILocus
	expr: any
	statements: any[]
	elseStatements: any[]

	constructor(locus, expr, statements, elseStatements) {
		this.locus = locus
		this.expr = expr
		this.statements = statements
		this.elseStatements = elseStatements
	}

	public accept(visitor: IVisitor) {
		visitor.visitIfStatement(this)
	}
}

export class AstSelectStatement implements AstStatement {
	locus: ILocus
	expr: any
	cases: any[]

	constructor(locus, expr, cases) {
		this.locus = locus
		this.expr = expr
		this.cases = cases
	}

	public accept(visitor: IVisitor) {
		visitor.visitSelectStatement(this)
	}
}

export class AstCaseStatement implements AstStatement {
	locus: ILocus
	exprList: any[]
	statements: any[]

	constructor(locus, exprList, statements) {
		this.locus = locus
		// if exprList is empty, this is case Else
		this.exprList = exprList
		this.statements = statements
	}

	public accept(visitor: IVisitor) {
		visitor.visitCaseStatement(this)
	}
}

export class AstTypeMember implements AstStatement {
	locus: ILocus
	name: string
	typeName: string

	constructor(locus, name, typeName) {
		this.locus = locus
		this.name = name
		this.typeName = typeName
	}

	public accept(visitor: IVisitor) {
		visitor.visitTypeMember(this)
	}
}

export class AstUserType implements AstStatement {
	locus: ILocus
	name: string
	members: AstTypeMember[]

	constructor(locus: ILocus, name: string, members: AstTypeMember[]) {
		this.locus = locus
		this.name = name
		this.members = members
	}

	public accept(visitor: IVisitor) {
		visitor.visitUserType(this)
	}
}

export class AstGotoStatement implements AstStatement {
	locus: ILocus
	label: string

	constructor(locus: ILocus, label: string) {
		this.locus = locus
		this.label = label
	}

	public accept(visitor: IVisitor) {
		visitor.visitGotoStatement(this)
	}
}

export class AstGosubStatement implements AstStatement {
	locus: ILocus
	label: string

	constructor(locus: ILocus, label: string) {
		this.locus = locus
		this.label = label
	}

	public accept(visitor: IVisitor) {
		visitor.visitGosub(this)
	}
}

export class AstLabel implements AstStatement {
	locus: ILocus
	name: string

	constructor(locus: ILocus, name: string) {
		this.locus = locus
		this.name = name
	}

	public accept(visitor: IVisitor) {
		visitor.visitLabel(this)
	}
}

/** @constructor */
export class AstCallStatement implements AstStatement {
	locus: ILocus
	name: string
	args: AstArgument[]

	constructor(locus: ILocus, name: string, args: any[]) {
		this.locus = locus
		this.name = name
		this.args = args
	}

	public accept(visitor: IVisitor) {
		visitor.visitCallStatement(this)
	}
}

export class AstOnEventStatement implements AstStatement {
	locus: ILocus
	path: any
	handler: string

	constructor(locus: ILocus, path: any, handler: string) {
		this.locus = locus
		this.path = path
		this.handler = handler
	}

	public accept(visitor: IVisitor): void {
		visitor.visitOnEventStatement(this)
	}
}

export class AstAssignStatement implements AstStatement {
	locus: ILocus
	lhs: any // could be a referenceList
	expr: any

	constructor(locus: ILocus, lhs: any, expr: any) {
		this.locus = locus
		this.lhs = lhs // could be a referenceList
		this.expr = expr
	}

	public accept(visitor: IVisitor) {
		visitor.visitAssignStatement(this)
	}
}

export class AstBinaryOp implements AstStatement {
	locus: ILocus
	lhs: any
	op: any
	rhs: any
	wantRef: boolean
	type: SomeType

	constructor(locus: ILocus, lhs: any, op: any, rhs: any) {
		this.locus = locus
		this.lhs = lhs
		this.op = op
		this.rhs = rhs
	}

	public accept(visitor: IVisitor) {
		visitor.visitBinaryOp(this)
	}
}

export class AstUnaryOperator implements AstStatement {
	locus: ILocus
	op: any
	expr: any
	wantRef: boolean
	type: SomeType

	constructor(locus: ILocus, op: any, expr: any) {
		this.locus = locus
		this.op = op
		this.expr = expr
	}

	public accept(visitor: IVisitor) {
		visitor.visitUnaryOperator(this)
	}
}

export class AstConstantExpr implements AstStatement {
	locus: ILocus
	value: any
	wantRef: boolean
	type: SomeType

	constructor(locus: ILocus, value: any) {
		this.locus = locus

		// value is possibly null, eg. for first parameter of "COLOR , 7"
		this.value = value
	}

	public accept(visitor: IVisitor) {
		visitor.visitConstantExpr(this)
	}
}

export class AstReturnStatement implements AstStatement {
	locus: ILocus
	value: any

	constructor(locus: ILocus, value: any) {
		this.locus = locus
		this.value = value
	}

	public accept(visitor: IVisitor) {
		visitor.visitReturnStatement(this)
	}
}

export interface AstStatement {
	locus: ILocus
	accept(visitor: IVisitor): void
}

export interface ILocus {
	line: number
	position: number
}

export interface IError {}

export interface IParser {
	parse(code: string): AstProgram | null
	errors: IError[]
}

export enum ErrorType {
	UnknownToken = 'unknownToken',
	SyntaxError = 'syntaxError',
	InternalRuleError = 'internalRuleError',
	TypeMismatch = 'typeMismatch'
}

export interface IError {
	locus?: ILocus
	message: string
	type: ErrorType
}

export class QBasicProgram {
	parser: IParser | undefined = undefined
	errors: IError[]
	testMode: boolean

	sourcecode: string
	instructions: any[]
	types: { [key: string]: SomeType }
	defaultType: SomeScalarType
	data: any
	shared: any
	lineMap: ILocus[]

	constructor(input: string, testMode: boolean) {
		this.errors = []
		this.testMode = testMode
		function UseSecond(args) {
			return args[1]
		}

		function UseFirst(args) {
			return args[0]
		}

		function JoinListsLR(args) {
			args[0].push(args[1])
			return args[0]
		}

		function JoinLists(args) {
			args[1].unshift(args[0])
			return args[1]
		}

		function EmptyList() {
			return []
		}

		// Create the parser if one doesn't already exist.
		if (this.parser === undefined) {
			const rules = new RuleParser()
			rules.addRule('start: program')
			rules.addToken('AND', 'AND')
			rules.addToken('AS', 'AS')
			rules.addToken('CASE', 'CASE')
			rules.addToken('CONST', 'CONST')
			rules.addToken('DATA', 'DATA')
			rules.addToken('DECLARE', 'DECLARE')
			rules.addToken('DEF', 'DEF')
			rules.addToken('DEFINT', 'DEFINT')
			rules.addToken('DIM', 'DIM')
			rules.addToken('DO', 'DO')
			rules.addToken('ELSE', 'ELSE')
			rules.addToken('END', 'END')
			rules.addToken('EXIT', 'EXIT')
			rules.addToken('FOR', 'FOR')
			rules.addToken('FUNCTION', 'FUNCTION')
			rules.addToken('GOSUB', 'GOSUB')
			rules.addToken('GOTO', 'GOTO')
			rules.addToken('IF', 'IF')
			rules.addToken('INPUT', 'INPUT')
			rules.addToken('OUTPUT', 'OUTPUT')
			rules.addToken('BINARY', 'BINARY')
			rules.addToken('RANDOM', 'RANDOM')
			rules.addToken('APPEND', 'APPEND')
			rules.addToken('LINE', 'LINE')
			rules.addToken('LOOP', 'LOOP')
			rules.addToken('MOD', 'MOD')
			rules.addToken('NEXT', 'NEXT')
			rules.addToken('NOT', 'NOT')
			rules.addToken('OR', 'OR')
			rules.addToken('XOR', 'XOR')
			rules.addToken('EQV', 'EQV')
			rules.addToken('IMP', 'IMP')
			rules.addToken('POKE', 'POKE')
			rules.addToken('ON', 'ON')
			rules.addToken('OFF', 'OFF')
			rules.addToken('EVENT', 'EVENT')
			rules.addToken('PRINT', 'PRINT')
			rules.addToken('RESTORE', 'RESTORE')
			rules.addToken('RETURN', 'RETURN')
			rules.addToken('SEG', 'SEG')
			rules.addToken('SELECT', 'SELECT')
			rules.addToken('SHARED', 'SHARED')
			rules.addToken('STATIC', 'STATIC')
			rules.addToken('STEP', 'STEP')
			rules.addToken('SUB', 'SUB')
			rules.addToken('TAB', 'TAB')
			rules.addToken('THEN', 'THEN')
			rules.addToken('TO', 'TO')
			rules.addToken('TYPE', 'TYPE')
			rules.addToken('UNTIL', 'UNTIL')
			rules.addToken('USING', 'USING')
			rules.addToken('VIEW', 'VIEW')
			rules.addToken('WEND', 'WEND')
			rules.addToken('WHILE', 'WHILE')
			rules.addToken('REM', 'REM ?.*$')
			rules.addToken('EOF', 'EOF')
			rules.addToken('SEEK', 'SEEK')
			rules.addToken('OPEN', 'OPEN')
			rules.addToken('CLOSE', 'CLOSE')
			rules.addToken('WRITE', 'WRITE')
			rules.addToken('minus', '\\-')
			rules.addToken('endl', '\\n')
			rules.addToken('comment', "'.*$")
			rules.addToken('hexconstant', '\\&H\\d+')
			rules.addToken('floatconstant', '\\d*\\.\\d+')
			rules.addToken('intconstant', '-?\\d+')
			rules.addToken('stringconstant', '"[^"]*"')
			rules.addToken('fileconstant', '#\\d+')
			rules.addToken('label', '^([a-zA-Z][a-zA-Z0-9_]*:|\\d+)')
			rules.addToken('identifier', '[a-zA-Z_][a-zA-Z0-9_]*(\\$|%|#|&|!)?')

			rules.addRule('program: statements', this.onProgram)
			rules.addRule('statements: statement*')
			// rules.addRule( "statement: intconstant istatement separator" );
			rules.addRule('statement: label istatement separator', function (args, locus) {
				let label = args[0]
				if (label.substr(-1) === ':') {
					label = label.substr(0, label.length - 1)
				}
				return [new AstLabel(locus, label), args[1]]
			})
			rules.addRule('statement: label', function (args, locus) {
				let label = args[0]
				if (label.substr(-1) === ':') {
					label = label.substr(0, label.length - 1)
				}
				return new AstLabel(locus, label)
			})

			rules.addRule('statement: istatement ? separator')
			rules.addRule("istatement: CONST identifier '=' expr", function (args, locus) {
				return new AstConstStatement(locus, args[1], args[3])
			})
			rules.addRule('istatement: DECLARE FUNCTION identifier ArgList', function (args, locus) {
				return new AstDeclareFunction(locus, args[2], args[3], true)
			})
			rules.addRule('istatement: DECLARE SUB identifier ArgList', function (args, locus) {
				return new AstDeclareFunction(locus, args[2], args[3], false)
			})
			rules.addRule('istatement: SUB identifier ArgList STATIC? statements END SUB', function (args, locus) {
				return new AstSubroutine(locus, args[1], args[2], args[4], false, args[3] !== null)
			})
			rules.addRule('istatement: FUNCTION identifier ArgList statements END FUNCTION', function (symbols, locus) {
				return new AstSubroutine(locus, symbols[1], symbols[2], symbols[3], true)
			})
			rules.addRule("istatement: DEF SEG ('=' expr)?", function (_args, locus) {
				return new AstNullStatement(locus)
			})
			rules.addRule("istatement: DEF identifier ArgList '=' expr", function (_args, locus) {
				return new AstNullStatement(locus)
			})
			rules.addRule('istatement: DEFINT identifier minus identifier', function (_args, locus) {
				// TODO: Implement completely
				return new AstDefTypeStatement(locus, 'INTEGER')
			})
			rules.addRule('istatement: VIEW PRINT', function (_args, locus) {
				return new AstNullStatement(locus)
			})
			rules.addRule('istatement: DIM DimList', UseSecond)
			rules.addRule('istatement: DIM SHARED DimList', function (args) {
				for (let i = 0; i < args[2].length; i++) {
					args[2][i].shared = true
				}
				return args[2]
			})
			rules.addRule('istatement: WHILE expr separator statements WEND', function (args, locus) {
				return new AstWhileLoop(locus, args[1], args[3])
			})
			rules.addRule('istatement: DO separator statements LOOP', function (args, locus) {
				return new AstDoStatement(locus, args[2], null, AstDoStatementType.INFINITE)
			})
			rules.addRule('istatement: DO separator statements LOOP WHILE expr', function (args, locus) {
				return new AstDoStatement(locus, args[2], args[5], AstDoStatementType.WHILE_AT_END)
			})
			rules.addRule('istatement: DO separator statements LOOP UNTIL expr', function (args, locus) {
				return new AstDoStatement(locus, args[2], args[5], AstDoStatementType.UNTIL)
			})
			rules.addRule('istatement: DO WHILE expr separator statements LOOP', function (args, locus) {
				return new AstWhileLoop(locus, args[2], args[4])
			})
			rules.addRule("istatement: FOR identifier '=' expr TO expr", function (args, locus) {
				return new AstForLoop(locus, args[1], args[3], args[5], new AstConstantExpr(locus, 1))
			})
			rules.addRule("istatement: FOR identifier '=' expr TO expr STEP expr", function (args, locus) {
				return new AstForLoop(locus, args[1], args[3], args[5], args[7])
			})
			rules.addRule('istatement: NEXT identifiers?', function (args, locus) {
				if (args[1] === null) {
					args[1] = []
				}
				return new AstNextStatement(locus, args[1])
			})
			rules.addRule('istatement: EXIT (FOR|DO)', function (args, locus) {
				return new AstExitStatement(locus, args[1])
			})
			rules.addRule('identifiers: MoreIdentifiers* identifier', JoinListsLR)
			rules.addRule("MoreIdentifiers: identifier ','", UseFirst)
			rules.addRule('istatement: END', function (_args, locus) {
				return new AstEndStatement(locus)
			})
			rules.addRule('istatement: GOSUB identifier', function (args, locus) {
				return new AstGosubStatement(locus, args[1])
			})
			rules.addRule('istatement: GOTO identifier', function (args, locus) {
				return new AstGotoStatement(locus, args[1])
			})
			rules.addRule('istatement: IF expr THEN istatement', function (args, locus) {
				return new AstIfStatement(locus, args[1], args[3], null)
			})
			rules.addRule('istatement: IF expr THEN separator statements ElseClause END IF', function (args, locus) {
				return new AstIfStatement(locus, args[1], args[4], args[5])
			})
			rules.addRule('ElseClause: ELSE IF expr THEN separator statements ElseClause', function (args, locus) {
				return new AstIfStatement(locus, args[2], args[5], args[6])
			})

			rules.addRule('ElseClause: ELSE statements', UseSecond)

			rules.addRule('ElseClause:', function (_args, locus) {
				return new AstNullStatement(locus)
			})
			rules.addRule('istatement: SELECT CASE expr separator case* END SELECT', function (args, locus) {
				return new AstSelectStatement(locus, args[2], args[4])
			})

			rules.addRule('case: CASE exprList separator statements', function (args, locus) {
				return new AstCaseStatement(locus, args[1], args[3])
			})

			rules.addRule('case: CASE ELSE separator statements', function (args, locus) {
				return new AstCaseStatement(locus, [], args[3])
			})

			rules.addRule('exprList: moreExpr* expr', JoinListsLR)

			rules.addRule("moreExpr: expr ','", UseFirst)

			// QBasic had [COM|STRIG|PEN|KEY](X) [ON|OFF], but we don't need that
			// so we ignore any EVENT(X) [ON|OFF] statements for compatibility
			rules.addRule("istatement: EVENT '\\(' expr '\\)' (ON|OFF)", function (_args, locus) {
				return new AstNullStatement(locus)
			})

			rules.addRule("istatement: ON EVENT '\\(' expr '\\)' GOSUB identifier", function (args, locus) {
				return new AstOnEventStatement(locus, args[3], args[6])
			})

			rules.addRule(
				"istatement: OPEN Reference FOR ('OUTPUT'|'INPUT'|'APPEND'|'BINARY'|'RANDOM') AS FileItem",
				function (args, locus) {
					return new AstOpenStatement(locus, args[1], args[3], args[5])
				}
			)
			rules.addRule(
				"istatement: OPEN FileName FOR ('OUTPUT'|'INPUT'|'APPEND'|'BINARY'|'RANDOM') AS FileItem",
				function (args, locus) {
					return new AstOpenStatement(locus, args[1], args[3], args[5])
				}
			)
			rules.addRule('istatement: CLOSE FileItems?', function (args, locus) {
				let fileItems: (AstVariableReference | AstConstantExpr)[]
				if (Array.isArray(args[1])) {
					fileItems = [...args[1]]
				} else if (args[1]) {
					fileItems = [args[1]]
				} else {
					fileItems = []
				}
				return new AstCloseStatement(locus, fileItems)
			})
			rules.addRule('FileName: stringconstant', this.onString)
			rules.addRule("FileItems: MoreFileItems* FileItem ','?", function (args) {
				return args[0]
			})
			rules.addRule("FileItems: FileItem (';'|',')?", function (args) {
				return args[0]
			})
			rules.addRule("MoreFileItems: FileItem (';'|',')", function (args) {
				return args[0]
			})
			rules.addRule('FileItem: Reference')
			rules.addRule('FileItem: fileconstant', this.onFileNumber)
			rules.addRule("istatement: SEEK FileItem ',' expr", function (args, locus) {
				return new AstCallStatement(locus, args[1], args[3])
			})
			rules.addRule('istatement: EOF FileItem', function (_args, _locus) {
				debugger
				// return new AstCallStatement(locus, args[1], [])
				// return new AstNullStatement(locus)
			})
			rules.addRule("istatement: WRITE FileItem? ',' PrintItems", function (args, locus) {
				return new AstWriteStatement(locus, args[1], args[3])
			})
			rules.addRule('istatement: WRITE PrintItems', function (args, locus) {
				return new AstPrintStatement(locus, args[1])
			})

			rules.addRule("istatement: LINE? INPUT (';')? constant? (';'|',') identifiers", function (args, locus) {
				return new AstInputStatement(
					locus,
					!!args[0],
					args[3],
					// if arg[3] is set, this means that the semicolon matched
					// at arg[4] is the one following the promptExpr
					args[3] ? args[4] === ';' : false,
					args[5],
					// if arg[3] is not set, this means that the semicolon matched
					// at arg[4] is the one following the INPUT statement
					args[3] ? args[2] !== ';' : args[4]
				)
			})
			rules.addRule("istatement: LINE? INPUT FileItem ',' identifiers", function (args, locus) {
				return new AstInputStatement(
					locus,
					!!args[0],
					null,
					// if arg[3] is set, this means that the semicolon matched
					// at arg[4] is the one following the promptExpr
					false,
					args[4],
					// if arg[3] is not set, this means that the semicolon matched
					// at arg[4] is the one following the INPUT statement
					false,
					args[2]
				)
			})
			rules.addRule('istatement: LINE? INPUT identifiers', function (args, locus) {
				return new AstInputStatement(locus, !!args[0], null, false, args[2])
			})
			rules.addRule("istatement: POKE expr ',' expr", function (_args, locus) {
				return new AstNullStatement(locus)
			})
			rules.addRule('istatement: PRINT', function (_args, locus) {
				return new AstPrintStatement(locus, [])
			})
			rules.addRule('istatement: PRINT PrintItems', function (args, locus) {
				return new AstPrintStatement(locus, args[1])
			})
			rules.addRule("istatement: PRINT USING [expr,';'] (';'|',')?", function (args, locus) {
				return new AstPrintUsingStatement(locus, args[2], args[3])
			})
			rules.addRule('PrintItems: PrintItem', function (args, _locus) {
				return args
			})
			rules.addRule("PrintItems: MorePrintItems* PrintItem (';'|',')?", function (args, _locus) {
				args[1].terminator = args[2]
				args[0].push(args[1])
				return args[0]
			})
			rules.addRule("MorePrintItems: PrintItem (';'|',')", function (args, _locus) {
				args[0].terminator = args[1]
				return args[0]
			})

			rules.addRule('PrintItem: expr', function (args, locus) {
				return new AstPrintItem(locus, AstPrintItemType.EXPR, args[0], null)
			})

			rules.addRule("PrintItem: TAB '\\(' expr '\\)'", function (args, locus) {
				return new AstPrintItem(locus, AstPrintItemType.TAB, args[2], null)
			})

			rules.addRule('PrintItem:', function (_args, locus) {
				return new AstPrintItem(locus, AstPrintItemType.EXPR, null, null)
			})
			rules.addRule('istatement: RESTORE identifier?', function (args, locus) {
				return new AstRestoreStatement(locus, args[1])
			})
			rules.addRule('istatement: RETURN', function (_args, locus) {
				return new AstReturnStatement(locus, undefined)
			})
			rules.addRule("istatement: DATA [DataConstant,',']", function (args, locus) {
				return new AstDataStatement(locus, args[1])
			})
			rules.addRule('DataConstant: identifier', function (args, locus) {
				return new AstConstantExpr(locus, args[0])
			})
			rules.addRule('DataConstant: constant')
			rules.addRule('DataConstant:', function (_args, locus) {
				return new AstConstantExpr(locus, null)
			})
			rules.addRule('istatement: TYPE identifier separator TypeMembers END TYPE', function (args, locus) {
				return new AstUserType(locus, args[1], args[3])
			})
			rules.addRule('istatement: AssignStatement')
			rules.addRule("AssignStatement: ReferenceList '=' expr2", function (args, locus) {
				return new AstAssignStatement(locus, args[0], args[2])
			})
			rules.addRule('istatement: REM', function () {
				return undefined
			})
			rules.addRule('istatement: identifier Parameters', function (args, locus) {
				return new AstCallStatement(locus, args[0], args[1])
			})
			rules.addRule('Parameters: ', EmptyList)
			rules.addRule("Parameters: '\\(' ParameterList '\\)'", UseSecond)
			rules.addRule('Parameters: ParameterList')
			rules.addRule("ParameterList: [Parameter,',']")
			rules.addRule('Parameter: expr')
			rules.addRule('Parameter:', function (_args, locus) {
				return new AstConstantExpr(locus, null)
			})

			rules.addRule('DimList: Dim MoreDims*', JoinLists)
			rules.addRule("MoreDims: ',' Dim", UseSecond)
			rules.addRule('Dim: identifier AsType?', function (args, locus) {
				return new AstDimStatement(locus, args[0], [], args[1])
			})
			rules.addRule("Dim: identifier '\\(' RangeList '\\)' AsType?", function (args, locus) {
				return new AstDimStatement(locus, args[0], args[2], args[4])
			})
			rules.addRule('AsType: AS identifier', UseSecond)
			rules.addRule('RangeList:', function () {
				return null
			})
			rules.addRule('RangeList: Range MoreRanges*', JoinLists)
			rules.addRule("MoreRanges: ',' Range", UseSecond)
			rules.addRule('Range: expr EndRange?', function (symbols, locus) {
				if (symbols[1]) {
					return new AstRange(locus, symbols[0], symbols[1])
				} else {
					return new AstRange(locus, new AstConstantExpr(locus, 0), symbols[0])
				}
			})
			rules.addRule('EndRange: TO expr', UseSecond)
			rules.addRule('TypeMembers: TypeMember*')
			rules.addRule('TypeMember: identifier AS identifier separator', function (args, locus) {
				return new AstTypeMember(locus, args[0], args[2])
			})
			rules.addRule('ArgList:', function () {
				return []
			})
			rules.addRule("ArgList: '\\(' [ Argument , ',' ] '\\)'", function (args) {
				return args[1]
			})
			rules.addRule('Argument: identifier OptParen? AS identifier', function (args, locus) {
				return new AstArgument(locus, args[0], args[3], args[1] !== null)
			})
			rules.addRule('Argument: identifier OptParen?', function (args, locus) {
				return new AstArgument(locus, args[0], null, args[1] !== null)
			})
			rules.addRule("OptParen: '\\(' '\\)'")
			rules.addRule('expr: expr2')
			rules.addRule('expr2: expr2 IMP expr3', this.onBinaryOp)
			rules.addRule('expr2: expr2 EQV expr3', this.onBinaryOp)
			rules.addRule('expr2: expr2 XOR expr3', this.onBinaryOp)
			rules.addRule('expr2: expr2 OR expr3', this.onBinaryOp)
			rules.addRule('expr2: expr3')
			rules.addRule('expr3: expr3 AND expr4', this.onBinaryOp)
			rules.addRule('expr3: expr4')
			rules.addRule("expr4: expr4 '=' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '<>' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '>' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '<' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '<<' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '>>' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '<=' expr5", this.onBinaryOp)
			rules.addRule("expr4: expr4 '>=' expr5", this.onBinaryOp)
			rules.addRule('expr4: expr5')
			rules.addRule('expr5: expr5 MOD expr6', this.onBinaryOp)
			rules.addRule('expr5: expr6')
			rules.addRule("expr6: expr6 '\\+' expr7", this.onBinaryOp)
			rules.addRule("expr6: expr6 '\\-' expr7", this.onBinaryOp)
			rules.addRule('expr6: expr7')
			rules.addRule("expr7: expr7 '\\*' expr8", this.onBinaryOp)
			rules.addRule("expr7: expr7 '\\/' expr8", this.onBinaryOp)
			rules.addRule("expr7: expr7 '\\^' expr8", this.onBinaryOp)
			rules.addRule('expr7: expr8')
			rules.addRule("expr8: '\\(' expr '\\)'", this.onBracketExpr)
			// rules.addRule( "expr8: expr8 '\\.' expr10", onBinaryOp );
			rules.addRule('expr8: NOT expr9', function (args, locus) {
				return new AstUnaryOperator(locus, 'NOT', args[1])
			})
			rules.addRule('expr8: expr9')
			rules.addRule('expr9: constant')
			rules.addRule('expr9: expr10')
			rules.addRule('expr10: ReferenceList')
			rules.addRule('constant: hexconstant', this.onNumber)
			rules.addRule('constant: intconstant', this.onNumber)
			rules.addRule('constant: floatconstant', this.onNumber)
			rules.addRule('constant: stringconstant', this.onString)
			rules.addRule("ReferenceList: ReferenceList '\\.' identifier", function (args, locus) {
				return new AstMemberDeref(locus, args[0], args[2])
			})

			rules.addRule("ReferenceList: ReferenceList '\\(' ParameterList '\\)'", function (args, locus) {
				return new AstArrayDeref(locus, args[0], args[2])
			})
			rules.addRule('ReferenceList: Reference')
			rules.addRule('Reference: identifier', function (args, locus) {
				return new AstVariableReference(locus, args[0], args[0])
			})

			rules.addRule('separator: endl+')
			rules.addRule('separator: comment endl')
			rules.addRule("separator: ':'")

			rules.buildSet.check(this.errors)
			for (let i = 0; i < this.errors.length; i++) {
				dbg().printf('%s\n', this.errors[i])
			}

			rules.buildSet.finalize()

			this.parser = new EarleyParser(rules.buildSet)
			// QBasicProgram.parser.debug = true;
		}

		input += '\n' // parse doesn't handle no newline at end of input.

		// Parse the program into abstract syntax tree.
		const astProgram = this.parser.parse(input)
		if (astProgram === null) {
			this.errors = this.parser.errors
			dbg().printf('Parse failed.\n')
			return
		}

		// Perform type checking.
		const typeChecker = new TypeChecker(this.errors)
		astProgram.accept(typeChecker)

		if (this.errors.length > 0) {
			dbg().printf('There were errors.\n')
			return
		}

		// Perform code generation.
		const codeGenerator = new CodeGenerator()
		astProgram.accept(codeGenerator)

		this.sourcecode = input
		this.instructions = codeGenerator.instructions
		this.types = typeChecker.types
		this.defaultType = typeChecker.defaultType
		this.data = codeGenerator.data
		this.shared = codeGenerator.shared
		this.lineMap = codeGenerator.lineMapping
	}

	private onProgram(symbols, locus) {
		const program = new AstProgram(
			locus,
			new AstSubroutine(locus, '_main', [], symbols[0], false)
		)
		dbg().printf(
			'Program successfully parsed. %d statements.\n',
			program.subs[0].statements.length
		)
		return program
	}

	private onNumber(symbols, locus) {
		return new AstConstantExpr(locus, parseFloat(symbols[0]))
	}

	private onString(symbols, locus) {
		return new AstConstantExpr(
			locus,
			symbols[0].substr(1, symbols[0].length - 2)
		)
	}

	private onFileNumber(symbols, locus) {
		return new AstConstantExpr(locus, parseInt(symbols[0].substr(1), 10))
	}

	private onBinaryOp(symbols, locus) {
		return new AstBinaryOp(locus, symbols[0], symbols[1], symbols[2])
	}

	// private onParamListInBrackets(symbols, _locus) {
	// 	return symbols[1]
	// }

	private onBracketExpr(symbols, _locus) {
		return symbols[1]
	}

	public getByteCodeAsString() {
		if (!this.instructions) {
			return ''
		}
		const source = this.sourcecode.split('\n')
		const lines: string[] = []
		for (let i = 0; i < this.instructions.length; i++) {
			const locus = this.lineMap[i]
			if (locus) {
				lines.push("   ' L" + (locus.line + 1) + ' ' + source[locus.line])
			}
			lines.push('[' + i + '] ' + this.instructions[i])
		}
		return lines.join('\n')
	}
}
