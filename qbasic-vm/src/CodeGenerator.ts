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

import { IVisitor } from './IVisitor'
import { Instructions, SystemSubroutines, SystemFunctions, IInstruction } from './VirtualMachine'
import {
	AstDeclareFunction,
	AstSubroutine,
	AstCallStatement,
	AstArgument,
	AstPrintUsingStatement,
	AstPrintStatement,
	AstPrintItemType,
	AstPrintItem,
	AstInputStatement,
	AstNullStatement,
	AstEndStatement,
	AstForLoop,
	AstNextStatement,
	AstExitStatement,
	AstArrayDeref,
	AstVariableReference,
	AstDoStatementType,
	AstMemberDeref,
	AstRange,
	AstDataStatement,
	AstReturnStatement,
	AstRestoreStatement,
	AstConstStatement,
	AstDefTypeStatement,
	AstDimStatement,
	AstDoStatement,
	AstWhileLoop,
	AstIfStatement,
	AstSelectStatement,
	AstCaseStatement,
	AstTypeMember,
	AstUserType,
	AstGosubStatement,
	AstLabel,
	AstAssignStatement,
	AstBinaryOp,
	AstUnaryOperator,
	AstConstantExpr,
	AstOpenStatement,
	AstCloseStatement,
	AstWriteStatement,
	AstOnEventStatement,
	AstReDimStatement,
	ILocus,
	AstProgram,
	AstStatement,
	AstGotoStatement,
} from './QBasic'
import { IsArrayType } from './Types'
import { Locus } from './Tokenizer'

export class Instruction {
	instr: IInstruction
	arg: any
	locus: Locus

	constructor(instr: IInstruction, arg: string | number | null, locus: Locus) {
		this.instr = instr
		this.arg = arg
		this.locus = locus
	}

	public toString(): string {
		if (this.instr.numArgs === 0) {
			return this.instr.name + ` (${this.locus.line}:${this.locus.position})`
		} else {
			return this.instr.name + ` ${this.arg} (${this.locus.line}:${this.locus.position})`
		}
	}
}

export class Label {
	name: string
	codeOffset: number
	dataOffset: number

	constructor(name: string, codeOffset: number, dataOffset: number) {
		this.name = name
		this.codeOffset = codeOffset
		this.dataOffset = dataOffset
	}
}

type LabelId = number

export class LoopContext {
	counter: string | null
	forLabel: LabelId | null
	nextLabel: LabelId | null
	endLabel: LabelId

	constructor(counter: string | null, forLabel: LabelId | null, nextLabel: LabelId | null, endLabel: LabelId) {
		this.counter = counter
		this.forLabel = forLabel
		this.nextLabel = nextLabel
		this.endLabel = endLabel
	}
}

export class CodeGenerator implements IVisitor {
	// Array of Instruction objects
	instructions: Instruction[] = []

	// Array of data from DATA statements.
	data: any[] = []

	// Set of shared variable names. If a string is a property of this object,
	// then the variable with that name is shared.
	shared: object = {}

	// Array of labels.
	labels: Label[] = []

	// Map from label name to label id
	labelMap: { [key: string]: number } = {}

	loopStack: any[] = []
	selectStack: any[] = []

	// declared functions map to 1. Array accesses are changed to function
	// calls if they are in this map.
	functionNames: object = {}

	// map from bytecode instruction to Locus, so that we can keep track of
	// which source lines led to each instruction.
	lineMapping: any[] = []
	lastLine = -1 // don't map lines twice in a row

	// Create a label so RESTORE with no label will work.

	constructor() {
		this.getGotoLabel(':top')
	}

	private acceptVisitor(visitee: AstStatement | AstStatement[], visitor: IVisitor) {
		if (!Array.isArray(visitee)) return visitee.accept(visitor)
		for (let i = 0; i < visitee.length; i++) {
			if (!visitee[i]) {
				continue
			}
			if (Array.isArray(visitee[i])) {
				this.acceptVisitor(visitee[i], visitor)
			} else {
				visitee[i].accept(visitor)
			}
		}
	}

	public link(): void {
		// for each instruction,
		for (let i = 0; i < this.instructions.length; i++) {
			const instr = this.instructions[i]
			// if the instruction has a code label for an argument, change its
			// argument to the associated offset.
			if (instr.instr.addrLabel) {
				instr.arg = this.labels[instr.arg].codeOffset
			} else if (instr.instr.dataLabel) {
				instr.arg = this.labels[instr.arg].dataOffset
			}
		}
	}

	public newLabel(basename: string): LabelId {
		const id = this.labels.length
		const name = basename + '_' + id
		this.labels.push(new Label(name, this.instructions.length, this.data.length))
		return id
	}

	public label(labelid: LabelId): void {
		this.labels[labelid].codeOffset = this.instructions.length
		this.labels[labelid].dataOffset = this.data.length
	}

	public map(locus: ILocus): void {
		// Keep track of which source line maps to which instruction.
		if (locus.line === this.lastLine) {
			return
		}
		this.lastLine = locus.line
		this.lineMapping[this.instructions.length] = locus
	}

	public getGotoLabel(name: string): LabelId {
		let labelId: number
		if (name in this.labelMap) {
			labelId = this.labelMap[name]
		} else {
			labelId = this.newLabel(name)
			this.labelMap[name] = labelId
		}
		return labelId
	}

	public write(name: string, arg: string | number | null, locus: Locus): void {
		const instr = Instructions[name]
		if (!instr) {
			throw new Error('Bad instruction: ' + name)
		}
		this.instructions.push(new Instruction(instr, arg, locus))
	}

	public visitProgram(program: AstProgram): void {
		for (let i = 0; i < program.subs.length; i++) {
			program.subs[i].accept(this)
		}

		this.link()
	}

	public visitDeclareFunction(node: AstDeclareFunction): void {
		this.functionNames[node.name] = 1
	}

	public visitSubroutine(node: AstSubroutine): void {
		let skipLabel: number | undefined = undefined
		this.map(node.locus)
		if (node.name !== '_main') {
			skipLabel = this.newLabel('skipsub')
			this.write('JMP', skipLabel, node.locus)
			this.label(this.getGotoLabel(node.name))
			for (let i = node.args.length - 1; i >= 0; i--) {
				// pop each argument off the stack into a variable. The wantRef
				// parameter of the AST node ensures that these evalauate
				this.write('POPVAR', node.args[i].name, node.locus)
			}
		}
		this.acceptVisitor(node.statements, this)
		if (node.isFunction) {
			// when the function returns, place its return value on the top of
			// the stack.
			this.write('PUSHVALUE', node.name, node.locus)
		}
		this.write('RET', null, node.locus)
		if (skipLabel !== undefined) {
			this.label(skipLabel)
		} else {
			this.write('END', null, node.locus)
		}
	}

	public visitCallStatement(node: AstCallStatement): void {
		this.map(node.locus)
		for (let i = 0; i < node.args.length; i++) {
			// This will push references, since wantRef was set by the type
			// checker.
			node.args[i].accept(this)
		}

		if (SystemSubroutines[node.name]) {
			// Check if we need to push number of args
			const sub = SystemSubroutines[node.name]
			if (sub.args !== undefined && sub.minArgs !== undefined) {
				this.write('PUSHCONST', node.args.length, node.locus)
			}
			this.write('SYSCALL', node.name, node.locus)
		} else if (node.name === 'PRINT') {
			this.write('PUSHCONST', node.args.length, node.locus)
			this.write('SYSCALL', node.name, node.locus)
		} else {
			this.write('CALL', this.getGotoLabel(node.name), node.locus)
		}
	}

	public visitArgument(_node: AstArgument): void {
		// noop
	}

	public visitPrintUsingStatement(node: AstPrintUsingStatement): void {
		// push format string, followed by all expressions, followed by
		// terminator, followed by total number of arguments, then syscall it.
		for (let i = 0; i < node.exprList.length; i++) {
			node.exprList[i].accept(this)
		}
		this.write('PUSHCONST', node.terminator, node.locus)
		this.write('PUSHCONST', node.exprList.length + 1, node.locus)
		this.write('SYSCALL', 'print_using', node.locus)
	}

	public visitPrintStatement(node: AstPrintStatement): void {
		let newline = true
		this.map(node.locus)
		for (let i = 0; i < node.printItems.length; i++) {
			node.printItems[i].accept(this)
			if (node.printItems[i].type === AstPrintItemType.TAB) {
				this.write('SYSCALL', 'print_tab', node.locus)
			} else if (node.printItems[i].expr) {
				this.write('SYSCALL', 'print', node.locus)
			}

			if (node.printItems[i].terminator === ',') {
				this.write('SYSCALL', 'print_comma', node.locus)
			} else if (node.printItems[i].terminator === ';') {
				newline = false
			} else {
				newline = true
			}
		}

		if (newline) {
			this.write('PUSHCONST', '\n', node.locus)
			this.write('SYSCALL', 'print', node.locus)
		}
	}

	public visitPrintItem(node: AstPrintItem): void {
		if (node.expr) {
			node.expr.accept(this)
		}
	}

	public visitOpenStatement(node: AstOpenStatement): void {
		this.write('PUSHCONST', node.mode.substr(0, 1), node.locus)
		node.fileNameExpr.accept(this)
		node.fileHandle.accept(this)
		this.write('SYSCALL', 'OPEN', node.locus)
	}

	public visitCloseStatement(node: AstCloseStatement): void {
		for (let i = 0; i < node.fileHandles.length; i++) {
			node.fileHandles[i].accept(this)
		}

		this.write('PUSHCONST', node.fileHandles.length, node.locus)
		this.write('SYSCALL', 'CLOSE', node.locus)
	}

	public visitWriteStatement(node: AstWriteStatement): void {
		this.map(node.locus)
		for (let i = 0; i < node.writeItems.length; i++) {
			node.writeItems[i].accept(this)
			node.fileHandle.accept(this)
			this.write('SYSCALL', 'WRITE', node.locus)
		}
	}

	public visitInputStatement(node: AstInputStatement): void {
		this.map(node.locus)
		// print the prompt, if any, and question mark, if required.
		if (!node.fileHandle) {
			if (node.promptExpr) {
				node.promptExpr.accept(this)
				this.write('SYSCALL', 'print', node.locus)
			}

			if (node.printQuestionMark) {
				this.write('PUSHCONST', '? ', node.locus)
				this.write('SYSCALL', 'print', node.locus)
			} else {
				this.write('PUSHCONST', ' ', node.locus)
				this.write('SYSCALL', 'print', node.locus)
			}
		}

		if (node.line) {
			this.write('PUSHCONST', -1, node.locus)
		} else {
			this.write('PUSHCONST', 0, node.locus)
		}

		if (node.newLineAfterEnter) {
			this.write('PUSHCONST', -1, node.locus)
		} else {
			this.write('PUSHCONST', 0, node.locus)
		}

		if (node.fileHandle) {
			node.fileHandle.accept(this)
		} else {
			this.write('PUSHCONST', null, node.locus)
		}

		// push onto the stack: identifiers
		for (let i = 0; i < node.identifiers.length; i++) {
			this.write('PUSHREF', node.identifiers[i], node.locus)
		}

		this.write('PUSHCONST', node.identifiers.length, node.locus)
		this.write('SYSCALL', 'INPUT', node.locus)
	}

	public visitNullStatement(_node: AstNullStatement): void {
		// noop
	}

	public visitEndStatement(node: AstEndStatement): void {
		this.map(node.locus)
		this.write('END', null, node.locus)
	}

	public visitForLoop(node: AstForLoop): void {
		this.map(node.locus)
		const forLabel = this.newLabel('for')
		const nextLabel = this.newLabel('next')
		const endLabel = this.newLabel('end_for')
		this.loopStack.push(new LoopContext(node.identifier, forLabel, nextLabel, endLabel))
		node.startExpr.accept(this)
		this.write('NEW', 'SINGLE', node.locus)
		this.write('POPVAR', node.identifier, node.locus)
		node.endExpr.accept(this)
		node.stepExpr.accept(this)
		this.label(forLabel)
		this.write('PUSHVALUE', node.identifier, node.locus)
		this.write('FORLOOP', endLabel, node.locus)
	}

	public visitNextStatement(node: AstNextStatement): void {
		this.map(node.locus)
		for (let i = 0; i < node.identifiers.length; i++) {
			const ctx = this.loopStack.pop()

			// stack is now:
			// end
			// step

			this.label(ctx.nextLabel)
			this.write('COPYTOP', null, node.locus)
			this.write('PUSHVALUE', ctx.counter, node.locus)
			this.write('+', null, node.locus)
			this.write('POPVAL', ctx.counter, node.locus)
			this.write('JMP', ctx.forLabel, node.locus)
			this.label(ctx.endLabel)
		}
	}

	public visitExitStatement(node: AstExitStatement): void {
		// Guaranteed to work due to type checker.
		const context = this.loopStack[this.loopStack.length - 1]

		if (context.counter) {
			// It's a FOR loop. Pop off the step and end value.
			this.write('POP', null, node.locus)
			this.write('POP', null, node.locus)
		}

		this.write('JMP', context.endLabel, node.locus)
	}

	public visitArrayDeref(node: AstArrayDeref): void {
		this.map(node.locus)
		// check if it's really a function call.
		if (node.expr instanceof AstVariableReference && this.functionNames[node.expr.name]) {
			this.acceptVisitor(node.parameters, this)
			this.write('CALL', this.getGotoLabel(node.expr.name), node.locus)
		} else if (node.expr instanceof AstVariableReference && SystemFunctions[node.expr.name]) {
			const func = SystemFunctions[node.expr.name]
			this.acceptVisitor(node.parameters, this)
			if (func.minArgs < func.args.length) {
				// variable number of arguments.
				this.write('PUSHCONST', node.parameters.length, node.locus)
			}
			node.expr.accept(this)
		} else {
			this.acceptVisitor(node.parameters, this)
			this.acceptVisitor(node.expr, this)
			if (node.parameters.length > 0) {
				this.write('ARRAY_DEREF', node.wantRef ? -1 : 0, node.locus)
			} else {
				// eg, calling a function with an array as a parameter.
			}
		}
	}

	public visitMemberDeref(node: AstMemberDeref): void {
		this.map(node.locus)
		node.lhs.accept(this)
		if (node.wantRef) {
			this.write('MEMBER_DEREF', node.identifier, node.locus)
		} else {
			this.write('MEMBER_VALUE', node.identifier, node.locus)
		}
	}

	public visitVariableReference(node: AstVariableReference): void {
		this.map(node.locus)
		if (SystemFunctions[node.name]) {
			this.write('SYSCALL', node.name, node.locus)
		} else if (this.functionNames[node.name]) {
			this.write('CALL', this.getGotoLabel(node.name), node.locus)
			if (node.wantRef) {
				this.write('NEW', node.type.name, node.locus)
			}
		} else if (node.wantRef || IsArrayType(node.type)) {
			this.write('PUSHREF', node.name, node.locus)
		} else {
			this.write('PUSHVALUE', node.name, node.locus)
		}
	}

	public visitRange(_node: AstRange): void {
		// noop
	}

	public visitDataStatement(node: AstDataStatement): void {
		for (let i = 0; i < node.data.length; i++) {
			// type is constantexpr
			this.data.push(node.data[i].value)
		}
	}

	public visitReturnStatement(node: AstReturnStatement): void {
		this.map(node.locus)
		this.write('RET', null, node.locus)
	}

	public visitRestoreStatement(node: AstRestoreStatement): void {
		this.map(node.locus)
		let where = 0
		if (node.label) {
			where = this.getGotoLabel(node.label)
		} else {
			where = this.getGotoLabel(':top')
		}
		this.write('RESTORE', where, node.locus)
	}

	public visitConstStatement(node: AstConstStatement): void {
		this.shared[node.name] = true
		node.expr.accept(this)
		this.write('POPVAL', node.name, node.locus)
	}

	public visitDefTypeStatement(_def: AstDefTypeStatement): void {
		// noop
	}

	public visitDimStatement(node: AstDimStatement): void {
		this.map(node.locus)
		let typeName

		// if there is a typename,
		if (node.typeName) {
			typeName = node.typeName
		} else {
			// use default type (INTEGER)
			typeName = 'INTEGER'
		}

		if (node.shared) {
			this.shared[node.name] = 1
		}

		// if there are ranges,
		if (node.ranges.length > 0) {
			// for each range
			for (let i = 0; i < node.ranges.length; i++) {
				node.ranges[i].lowerExpr.accept(this)
				node.ranges[i].upperExpr.accept(this)
			}
			// push number of ranges.
			this.write('PUSHCONST', node.ranges.length, node.locus)
			// push typename
			this.write('PUSHTYPE', typeName, node.locus)
			// syscall alloc.
			this.write('SYSCALL', 'alloc_array', node.locus)
			// pop it into the variable name.
			this.write('POPVAR', node.name, node.locus)
		} else {
			// just create a single instance and pop it into the name.
			this.write('PUSHTYPE', typeName, node.locus)
			this.write('SYSCALL', 'alloc_scalar', node.locus)
			this.write('POPVAR', node.name, node.locus)
		}
	}

	public visitReDimStatement(node: AstReDimStatement): void {
		this.map(node.locus)

		// for each range
		for (let i = 0; i < node.ranges.length; i++) {
			node.ranges[i].lowerExpr.accept(this)
			node.ranges[i].upperExpr.accept(this)
		}
		// push number of ranges.
		this.write('PUSHCONST', node.ranges.length, node.locus)
		// push preserve flag.
		this.write('PUSHCONST', node.preserve === true ? -1 : 0, node.locus)
		// push reference to the array
		this.write('PUSHREF', node.name, node.locus)
		// syscall resize.
		this.write('SYSCALL', 'resize_array', node.locus)
		// pop it into the variable name.
		this.write('POPVAR', node.name, node.locus)
	}

	public visitDoStatement(node: AstDoStatement): void {
		this.map(node.locus)
		const top = this.newLabel('do')
		const bottom = this.newLabel('loop')
		this.label(top)

		this.loopStack.push(new LoopContext(null, null, null, bottom))
		this.acceptVisitor(node.statements, this)
		this.loopStack.pop()
		switch (node.type) {
			case AstDoStatementType.UNTIL:
				if (!node.expr) throw new Error('Missing stop expression in DO LOOP WHILE')
				node.expr.accept(this)
				this.write('BZ', top, node.locus)
				break

			case AstDoStatementType.WHILE_AT_END:
				if (!node.expr) throw new Error('Missing stop expression in DO LOOP WHILE')
				node.expr.accept(this)
				this.write('BNZ', top, node.locus)
				break

			case AstDoStatementType.INFINITE:
				this.write('JMP', top, node.locus)
				break
		}

		this.label(bottom)
	}

	public visitWhileLoop(node: AstWhileLoop): void {
		this.map(node.locus)
		const top = this.newLabel('while')
		const bottom = this.newLabel('wend')
		this.label(top)
		node.expr.accept(this)
		this.write('BZ', bottom, node.locus)
		this.loopStack.push(new LoopContext(null, null, null, bottom))
		this.acceptVisitor(node.statements, this)
		this.loopStack.pop()
		this.write('JMP', top, node.locus)
		this.label(bottom)
	}

	public visitIfStatement(node: AstIfStatement): void {
		this.map(node.locus)
		const endLabel = this.newLabel('endif')
		const elseLabel = this.newLabel('else')

		node.expr.accept(this)
		this.write('BZ', elseLabel, node.locus)
		this.acceptVisitor(node.statements, this)
		this.write('JMP', endLabel, node.locus)

		this.label(elseLabel)

		if (node.elseStatements) {
			this.acceptVisitor(node.elseStatements, this)
			this.write('JMP', endLabel, node.locus)
		}

		this.label(endLabel)
	}

	public visitSelectStatement(node: AstSelectStatement): void {
		this.map(node.locus)
		const endSelect = this.newLabel('end_select')
		this.selectStack.push(endSelect)
		node.expr.accept(this)
		this.acceptVisitor(node.cases, this)
		this.write('POP', null, node.locus)
		this.label(endSelect)
		this.selectStack.pop()
	}

	public visitCaseStatement(node: AstCaseStatement): void {
		this.map(node.locus)
		if (node.exprList.length > 0) {
			const okayLabel = this.newLabel('case_okay')
			const skipLabel = this.newLabel('case_skip')
			for (let i = 0; i < node.exprList.length; i++) {
				this.write('COPYTOP', null, node.locus)
				node.exprList[i].accept(this)
				this.write('=', null, node.locus)
				this.write('BNZ', okayLabel, node.locus)
			}
			this.write('JMP', skipLabel, node.locus)
			this.label(okayLabel)

			this.acceptVisitor(node.statements, this)
			this.write('JMP', this.selectStack[this.selectStack.length - 1], node.locus)
			this.label(skipLabel)
		} else {
			// case else.
			this.acceptVisitor(node.statements, this)
		}
	}

	public visitTypeMember(_node: AstTypeMember): void {
		// noop
	}

	public visitUserType(_node: AstUserType): void {
		// noop
	}

	public visitGotoStatement(node: AstGotoStatement): void {
		this.map(node.locus)
		const labelId = this.getGotoLabel(node.label)
		this.write('JMP', labelId, node.locus)
	}

	public visitGosub(node: AstGosubStatement): void {
		this.map(node.locus)
		const labelId = this.getGotoLabel(node.label)
		this.write('GOSUB', labelId, node.locus)
	}

	public visitOnEventStatement(node: AstOnEventStatement): void {
		this.map(node.locus)
		node.path.accept(this)
		const labelId = this.getGotoLabel(node.handler)
		this.write('REG_EVENT_HANDLER', labelId, node.locus)
	}

	public visitLabel(node: AstLabel): void {
		this.label(this.getGotoLabel(node.name))
	}

	public visitAssignStatement(node: AstAssignStatement): void {
		this.map(node.locus)
		node.expr.accept(this)

		if (node.lhs instanceof AstVariableReference && this.functionNames[node.lhs.name]) {
			// it was actually a function call.
			this.write('POPVAL', node.lhs.name, node.locus)
		} else {
			node.lhs.accept(this)
			this.write('ASSIGN', null, node.locus)
		}
	}

	public visitBinaryOp(node: AstBinaryOp): void {
		this.map(node.locus)
		node.lhs.accept(this)
		node.rhs.accept(this)
		this.write(node.op, null, node.locus)
		if (node.wantRef) {
			this.write('NEW', node.type.name, node.locus)
		}
	}

	public visitUnaryOperator(node: AstUnaryOperator): void {
		this.map(node.locus)
		node.expr.accept(this)
		this.write('UNARY_OP', node.op, node.locus)
		if (node.wantRef) {
			this.write('NEW', node.type.name, node.locus)
		}
	}

	public visitConstantExpr(node: AstConstantExpr): void {
		this.map(node.locus)
		this.write('PUSHCONST', node.value, node.locus)
		if (node.wantRef) {
			this.write('NEW', node.type.name, node.locus)
		}
	}
}
