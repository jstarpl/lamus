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

import {
	AstStatement,
	AstDeclareFunction,
	IError,
	AstProgram,
	AstSubroutine,
	AstArgument,
	AstCallStatement,
	AstVariableReference,
	AstOpenStatement,
	AstInputStatement,
	AstForLoop,
	AstNextStatement,
	AstExitStatement,
	AstArrayDeref,
	AstConstantExpr,
	AstCloseStatement,
	AstWriteStatement,
	AstOnEventStatement,
	ErrorType,
} from './QBasic'
import {
	IntegerType,
	SingleType,
	DoubleType,
	StringType,
	AnyType,
	NullType,
	UserType,
	SomeType,
	DeriveTypeNameFromVariable,
	AreTypesCompatible,
	ArrayType,
	IsStringType,
	IsNumericType,
	IsArrayType,
	IsUserType,
	SomeScalarType,
	JSONType,
} from './Types'
import { IVisitor } from './IVisitor'
import { sprintf, getDebugConsole as dbg } from './DebugConsole'
import { SystemSubroutines, SystemFunctions } from './VirtualMachine'
import { Locus } from './Tokenizer'

// map from names to type objects.
class TypeScope {
	names: { [key: string]: SomeType | undefined } = {}
	constructor() {}
}

class CheckedLabel {
	name: string
	astNode: AstStatement

	constructor(name, astNode) {
		this.name = name
		this.astNode = astNode
	}
}

class CheckedLoopContext {
	type: 'FOR' | 'DO' | 'WHILE'
	counter: string | null

	constructor(type: 'FOR' | 'DO' | 'WHILE', counter: string | null) {
		// "FOR", "DO"
		this.type = type

		// variable name
		this.counter = counter
	}
}

/** @constructor */
export class TypeChecker implements IVisitor {
	declaredSubs: {
		[key: string]: AstDeclareFunction
	} = {}
	errors: IError[]
	scopes: TypeScope[]
	shared: TypeScope
	labelsUsed: CheckedLabel[]
	labelsDefined: {
		[key: string]: CheckedLabel
	}
	types: {
		INTEGER: IntegerType
		SINGLE: SingleType
		DOUBLE: DoubleType
		STRING: StringType
		JSON: JSONType
		ANY: AnyType
		':NULL': NullType
		[key: string]: SomeType
	}
	defaultType: SomeScalarType
	loopStack: CheckedLoopContext[]

	constructor(errors: IError[]) {
		// map from name to AstDeclare
		this.declaredSubs._main = new AstDeclareFunction(new Locus(0, 0), '_main', [], false)

		this.errors = errors
		this.scopes = [new TypeScope()]
		this.shared = new TypeScope()

		this.labelsUsed = []
		this.labelsDefined = {}

		this.types = {
			INTEGER: new IntegerType(),
			SINGLE: new SingleType(),
			DOUBLE: new DoubleType(),
			STRING: new StringType(),
			JSON: new JSONType(),
			ANY: new AnyType(),
			':NULL': new NullType(),
		}

		// Changed to integer if DEFINT is present in the program (hack hack)
		this.defaultType = this.types.SINGLE

		// stack of CheckedLoopContext. Most recent is 0.
		this.loopStack = []
	}

	public error(object: AstStatement, ...args: any) {
		const message = sprintf(args)
		this.errors.push({
			message,
			type: ErrorType.TypeMismatch,
			locus: object.locus,
		})
		dbg().print(`Error at ${object.locus.line}:${object.locus.position}: ${message}\n`)
	}

	/**
	 If the variable name includes a type suffix, removes it and returns the
	 result.
	 */
	public removeSuffix(name: string) {
		switch (name[name.length - 1]) {
			case '%':
			case '$':
			case '!':
			case '&':
			case '#':
				return name.substr(0, name.length - 1)
			default:
				return name
		}
	}

	/**
	 Using the current scope, or the type suffix, determine the type of the
	 variable given its name. Returns the type object.
	 */
	public getTypeFromVariableName(name: string) {
		let type = this.scopes[0].names[name]
		if (type !== undefined) {
			return type
		}
		type = this.shared.names[name]
		if (type !== undefined) {
			return type
		}

		const typeName = DeriveTypeNameFromVariable(name)
		if (typeName !== null) {
			return this.types[typeName]
		}

		return this.defaultType
	}

	public visitProgram(program: AstProgram) {
		let i
		for (i = 0; i < program.subs.length; i++) {
			program.subs[i].accept(this)
		}

		// for each label used, if it is not defined, then emit an error.
		for (i = 0; i < this.labelsUsed.length; i++) {
			let label = this.labelsUsed[i]
			if (!this.labelsDefined[label.name]) {
				this.error(label.astNode, 'Label %s is not defined', label.name)
			}
		}

		// emit an error on any subs not implemented
		for (let name in this.declaredSubs) {
			let func = this.declaredSubs[name]
			if (!func.hasBody && func.used) {
				this.error(func, "SUB or FUNCTION '%s' has no body", name)
			}
		}
	}

	public visitDeclareFunction(declare: AstDeclareFunction) {
		// error if this name is already declared.
		if (this.declaredSubs[declare.name]) {
			this.error(
				declare,
				"SUB '%s' is already declared on line %s",
				declare.name,
				this.declaredSubs[declare.name].locus.line + 1
			)
		}

		this.declaredSubs[declare.name] = declare
		declare.args.accept(this)
		if (declare.isFunction) {
			declare.type = this.getTypeFromVariableName(declare.name)
		}
	}

	public visitSubroutine(sub: AstSubroutine) {
		let i
		let self = this

		function subError(declare) {
			self.error(
				sub,
				"SUB or FUNCTION '%s' does not match declaration on " + 'line %s',
				sub.name,
				declare.locus.line + 1
			)
		}

		// error if the sub has not been declared.
		if (!this.declaredSubs[sub.name]) {
			this.error(sub, "SUB '%s' is not declared", sub.name)
		} else {
			let declare = this.declaredSubs[sub.name]

			if (declare.isFunction !== sub.isFunction) {
				subError(declare)
			}

			if (sub.args.length !== declare.args.length) {
				subError(declare)
			} else {
				// error if the declaration does not have the same arguments.
				for (i = 0; i < sub.args.length; i++) {
					// don't compare variable names, it's okay if they differ.
					if (
						(sub.args[i].typeName !== declare.args[i].typeName && declare.args[i].typeName !== 'ANY') ||
						sub.args[i].isArray !== declare.args[i].isArray
					) {
						subError(declare)
					}
				}
			}

			declare.hasBody = true
		}

		this.scopes.unshift(new TypeScope())

		// visit arguments
		for (i = 0; i < sub.args.length; i++) {
			sub.args[i].accept(this)
			this.scopes[0].names[sub.args[i].name] = sub.args[i].type
		}

		// visit statements
		for (i = 0; i < sub.statements.length; i++) {
			if (!sub.statements[i]) {
				continue
			}
			// dbg.printf("Try to visit %s\n", getObjectClass( sub.statements[i]) );
			if (!sub.statements[i].accept) {
				dbg().printf('ERROR: Could not visit object of type %s\n', /*getObjectClass*/ sub.statements[i])
			} else {
				sub.statements[i].accept(this)
			}
		}

		this.scopes.shift()
	}

	/**
	 Check that types of arguments match the ones from the AstDeclareStatement.
	 */
	public checkCallArguments(declare: AstDeclareFunction, args: AstArgument[]) {
		declare.used = true
		if (declare.args.length !== args.length) {
			this.error(declare, 'Wrong number of arguments')
		} else {
			for (let i = 0; i < args.length; i++) {
				args[i].wantRef = true
				args[i].accept(this)
				if (!AreTypesCompatible(args[i].type, declare.args[i].type)) {
					this.error(
						args[i],
						'Type mismatch in argument %d of call to %s.' + ' Expected %s but got %s',
						i + 1,
						declare.name,
						declare.args[i].type.name,
						args[i].type.name
					)
				}
			}
		}
	}

	public visitCallStatement(call: AstCallStatement) {
		if (SystemSubroutines[call.name]) {
			// TODO: Check args for system parameters.
			for (let i = 0; i < call.args.length; i++) {
				call.args[i].wantRef = true
				call.args[i].accept(this)
			}
			return
		}

		let declare = this.declaredSubs[call.name]
		// sub must exist and argument number and types must be compatible.
		if (!declare) {
			debugger
			this.error(call, "Call to undefined SUB '%s'", call.name)
		} else {
			this.checkCallArguments(declare, call.args)
		}
	}

	public visitArgument(argument: AstArgument) {
		let type

		// we are about to enter a function, so add this variable to the scope
		if (argument.typeName) {
			// error if the typeName does not exist.
			type = this.types[argument.typeName]
			if (type === undefined) {
				this.error(argument, 'Type %s is not defined', argument.typeName)
				type = new UserType(argument.typeName, {})
				this.types[argument.typeName] = type
			}
		} else {
			type = this.getTypeFromVariableName(argument.name)
		}

		if (argument.isArray) {
			type = new ArrayType(type)
		}

		argument.type = type
	}

	public visitPrintStatement(print) {
		// all arguments must be convertable to strings or single.
		print.printItems.accept(this)
	}

	public visitPrintUsingStatement(printUsing) {
		for (let i = 0; i < printUsing.exprList.length; i++) {
			printUsing.exprList[i].wantRef = true
			printUsing.exprList[i].accept(this)

			if (i === 0 && !IsStringType(printUsing.exprList[i].type)) {
				this.error(printUsing.exprList[i], 'Format string must be STRING, not %s', printUsing.exprList[i].type.name)
			} else if (i > 0 && !IsStringType(printUsing.exprList[i].type) && !IsNumericType(printUsing.exprList[i].type)) {
				this.error(printUsing.exprList[i], 'Type Mismatch Error')
			}
		}

		if (printUsing.exprList.length === 0) {
			this.error(printUsing, 'PRINT USING requires at least one argument')
		}
	}

	public visitPrintItem(item) {
		if (item.expr === null) {
			return
		}
		item.expr.accept(this)
		if (!IsNumericType(item.expr.type) && !IsStringType(item.expr.type)) {
			this.error(item.expr, "Expected string or number, but got '%s'", item.expr.type.name)
		}
	}

	public visitWriteStatement(write: AstWriteStatement) {
		// all arguments must be convertable to strings or single.
		write.writeItems.accept(this)
	}

	public visitOpenStatement(open: AstOpenStatement) {
		if (!open.fileNameExpr) {
			this.error(open, 'File name needs to be specified.')
		} else {
			// file name must be a string
			open.fileNameExpr.accept(this)
			if (!IsStringType(open.fileNameExpr.type)) {
				this.error(open, 'File name must be a string')
			}

			// mode must be recognized
			if (
				open.mode !== 'INPUT' &&
				open.mode !== 'OUTPUT' &&
				open.mode !== 'APPEND' &&
				open.mode !== 'RANDOM' &&
				open.mode !== 'BINARY'
			) {
				this.error(open, 'Unknown file access mode: %s', open.mode)
			}

			if (!open.fileHandle) {
				this.error(open, 'File handle needs to be specified')
			} else {
				open.fileHandle.accept(this)
				if (open.fileHandle instanceof AstVariableReference) {
					let type = this.getTypeFromVariableName(open.fileHandle.name)
					if (type.name !== 'INTEGER') {
						this.error(open, "File handle '%s' number must be an INTEGER", open.fileHandle.name)
					}
				} else if (open.fileHandle instanceof AstConstantExpr) {
					if (!Number.isInteger(open.fileHandle.value)) {
						this.error(open, 'File handle number must be an integer')
					}
				} else {
					this.error(open, 'Invalid file handle')
				}
			}
		}
	}

	public visitCloseStatement(close: AstCloseStatement) {
		for (let i = 0; i < close.fileHandles.length; i++) {
			const handle = close.fileHandles[i]
			handle.accept(this)
			if (handle instanceof AstVariableReference) {
				let type = this.getTypeFromVariableName(handle.name)
				if (type.name !== 'INTEGER') {
					this.error(close, "File handle '%s' number must be an INTEGER", handle.name)
				}
			} else if (handle instanceof AstConstantExpr) {
				if (!Number.isInteger(handle.value)) {
					this.error(close, 'File handle number must be an integer')
				}
			} else {
				this.error(close, 'Invalid file handle')
			}
		}
	}

	public visitInputStatement(input: AstInputStatement) {
		// if fileHandle is specified, it needs to be a valid file handler
		if (input.fileHandle) {
			input.fileHandle.accept(this)
			if (input.fileHandle instanceof AstVariableReference) {
				let type = this.getTypeFromVariableName(input.fileHandle.name)
				if (type.name !== 'INTEGER') {
					this.error(input, "File handle '%s' number must be an INTEGER", input.fileHandle.name)
				}
			} else if (input.fileHandle instanceof AstConstantExpr) {
				if (!Number.isInteger(input.fileHandle.value)) {
					this.error(input, 'File handle number must be an integer')
				}
			} else {
				this.error(input, 'Invalid file handle')
			}
		}

		// prompt must be null or a string.
		if (input.promptExpr) {
			input.promptExpr.accept(this)
			if (!IsStringType(input.promptExpr.type)) {
				this.error(input, 'Prompt must be a string')
			}
		}

		// identifiers must be strings or numbers.
		for (let i = 0; i < input.identifiers.length; i++) {
			let type = this.getTypeFromVariableName(input.identifiers[i])
			if (!IsNumericType(type) && !IsStringType(type)) {
				this.error(input, "Identifier '%s' should be string or numeric.", input.identifiers[i])
			}
		}
	}

	public visitNullStatement(_argument) {}

	public visitEndStatement(_argument) {}

	public visitForLoop(loop: AstForLoop) {
		// identifier must be numeric type.
		if (!IsNumericType(this.getTypeFromVariableName(loop.identifier))) {
			this.error(loop, 'Loop counter must be a number')
		}

		loop.startExpr.wantRef = true
		loop.startExpr.accept(this)
		loop.endExpr.accept(this)
		loop.stepExpr.accept(this)

		// startExpr and endExpr and stepExpr must be convertible to single.
		if (
			!IsNumericType(loop.startExpr.type) ||
			!IsNumericType(loop.endExpr.type) ||
			!IsNumericType(loop.stepExpr.type)
		) {
			this.error(loop, 'Loop expression must be a number.')
		}

		this.loopStack.unshift(new CheckedLoopContext('FOR', loop.identifier))
	}

	public visitNextStatement(next: AstNextStatement) {
		// pop loops off loopstack in order.
		// identifier must match loops.
		for (let i = 0; i < next.identifiers.length; i++) {
			if (this.loopStack.length === 0) {
				this.error(next, 'NEXT without FOR')
				break
			}
			if (this.loopStack[0].type !== 'FOR') {
				// NEXT inside a DO loop?
				this.error(next, 'NEXT without FOR')
				break
			}
			if (next.identifiers[i] !== this.loopStack[0].counter) {
				this.error(next, "Mismatched loop counter '%s' in NEXT", next.identifiers[i])
			}
			this.loopStack.shift()
		}

		if (next.identifiers.length === 0) {
			if (this.loopStack.length === 0) {
				this.error(next, 'NEXT without FOR')
			} else {
				this.loopStack.shift()
			}
		}
	}

	public visitExitStatement(exit: AstExitStatement) {
		if (exit.what && exit.what !== 'FOR' && exit.what !== 'DO' && exit.what !== 'WHILE') {
			this.error(exit, 'EXIT %s not supported', exit.what)
		}
		if (this.loopStack.length === 0) {
			this.error(exit, 'EXIT without loop not supported')
		}
		if (exit.what && exit.what !== this.loopStack[0].type) {
			this.error(exit, "MISMATCHED EXIT. Expected: '%s'", this.loopStack[0].type)
		}
	}

	public visitArrayDeref(ref: AstArrayDeref) {
		let i
		ref.expr.accept(this)

		if (ref.expr instanceof AstVariableReference && this.declaredSubs[ref.expr.name]) {
			let declare = this.declaredSubs[ref.expr.name]
			if (!declare.isFunction) {
				this.error(ref, "Tried to call non-function '%s'", ref.expr.name)
			}

			this.checkCallArguments(declare, ref.parameters)
			ref.type = declare.type
			return
		}
		if (ref.expr instanceof AstVariableReference && SystemFunctions[ref.expr.name]) {
			const func = SystemFunctions[ref.expr.name]
			const name = ref.expr.name
			ref.type = this.types[func.type]
			ref.parameters.accept(this)

			// verify that parameters are correct type.
			if (ref.parameters.length < func.minArgs || ref.parameters.length > func.args.length) {
				this.error(ref, "FUNCTION '%s' called with wrong number of " + 'arguments', name)
			} else {
				for (i = 0; i < ref.parameters.length; i++) {
					if (!AreTypesCompatible(ref.parameters[i].type, this.types[func.args[i]])) {
						this.error(
							ref,
							"Argument %d to '%s' function is of " + "type '%s', but '%s' expected",
							i + 1,
							name,
							ref.parameters[i].type.name,
							func.args[i]
						)
					}
				}
			}

			return
		}

		// parameters must convert to integers.
		for (i = 0; i < ref.parameters.length; i++) {
			ref.parameters[i].accept(this)
			if (!IsNumericType(ref.parameters[i].type)) {
				this.error(ref.parameters[i], 'Array subscript must be numeric type')
			}
		}

		// expr must resolve to an array.
		// type becomes type of array elements.
		if (!IsArrayType(ref.expr.type)) {
			this.error(ref, "Subscript used on non-array '%s'", ref.expr.name)
			ref.type = this.types.INTEGER
		} else if (ref.parameters.length === 0) {
			ref.type = ref.expr.type
		} else {
			ref.type = ref.expr.type.elementType
		}
	}

	public visitMemberDeref(ref) {
		// lhs should resolve to a user type.
		ref.lhs.accept(this)
		if (!IsUserType(ref.lhs.type)) {
			this.error(ref, "Tried to dereference non-user-type '%s'", ref.lhs.type.name)
			ref.type = this.types.SINGLE
		} else {
			// user type should contain the given identifier.
			ref.type = ref.lhs.type.members[ref.identifier]
			if (ref.type === undefined) {
				this.error(ref, "Type '%s' does not contain member '%s'", ref.lhs.type.name, ref.identifier)
				ref.type = this.types.SINGLE
			}
		}
	}

	public visitVariableReference(ref) {
		let func
		if (SystemFunctions[ref.name]) {
			func = SystemFunctions[ref.name]
			ref.type = this.types[func.type]
		} else if (this.declaredSubs[ref.name]) {
			func = this.declaredSubs[ref.name]
			if (!func.isFunction) {
				this.error(ref, "SUB '%s' used as a function", func.name)
				ref.type = this.types.SINGLE
			} else {
				ref.type = func.type
			}
		} else {
			ref.type = this.getTypeFromVariableName(ref.name)
		}
	}

	public visitRange(range) {
		range.lowerExpr.accept(this)
		range.upperExpr.accept(this)

		if (!IsNumericType(range.lowerExpr.type) || !IsNumericType(range.upperExpr.type)) {
			this.error(range, 'Expected a number.')
		}
	}

	public visitDataStatement(_argument) {}

	public visitReturnStatement(_returnStatement) {}

	public visitRestoreStatement(restore) {
		if (restore.label) {
			this.labelsUsed.push(new CheckedLabel(restore.label, restore))
		}
	}

	public visitConstStatement(constStatement) {
		// Ensure it's not double defined.
		if (constStatement.name in this.shared.names) {
			this.error(constStatement, "Redeclared variable '%s'", constStatement.name)
		}

		// todo: ensure it's a constant calculable at runtime.
		constStatement.expr.accept(this)

		this.shared.names[constStatement.name] = constStatement.expr.type
	}

	public visitDefTypeStatement(def) {
		this.defaultType = this.types[def.typeName] as SomeScalarType
	}

	public visitDimStatement(dim) {
		// type, if present, must exist.
		let type
		if (dim.typeName) {
			type = this.types[dim.typeName]
			if (type === undefined) {
				this.error(dim, "Type '%s' is not defined", dim.typeName)
			}
		}

		if (!type) {
			type = this.getTypeFromVariableName(dim.name)
		}

		for (let i = 0; i < dim.ranges.length; i++) {
			dim.ranges[i].accept(this)
		}

		if (dim.ranges.length) {
			type = new ArrayType(type)
		}

		if (dim.shared) {
			this.shared.names[dim.name] = type
		} else {
			this.scopes[0].names[dim.name] = type
		}
	}

	public visitDoStatement(loop) {
		if (loop.expr) {
			loop.expr.accept(this)
		}
		if (loop.expr !== null && !IsNumericType(loop.expr.type)) {
			this.error(loop, 'Loop expression must be numeric')
		}

		this.loopStack.unshift(new CheckedLoopContext('DO', null))
		loop.statements.accept(this)
		this.loopStack.shift()
	}

	public visitWhileLoop(loop) {
		loop.expr.accept(this)
		if (!IsNumericType(loop.expr.type)) {
			this.error(loop, 'Loop expression must be numeric')
		}

		this.loopStack.unshift(new CheckedLoopContext('WHILE', null))
		loop.statements.accept(this)
		this.loopStack.shift()
	}

	public visitIfStatement(ifStatement) {
		ifStatement.expr.accept(this)
		if (!IsNumericType(ifStatement.expr.type)) {
			this.error(ifStatement, 'Expected numeric expression')
		}

		ifStatement.statements.accept(this)
		if (ifStatement.elseStatements) {
			ifStatement.elseStatements.accept(this)
		}
	}

	public visitSelectStatement(select) {
		// expr must be compatible with that of each case.
		select.expr.accept(this)
		if (!IsNumericType(select.expr.type) && !IsStringType(select.expr.type)) {
			this.error(select, 'Select expression must be numeric or string')
		}

		for (let i = 0; i < select.cases.length; i++) {
			let caseStatement = select.cases[i]
			caseStatement.accept(this)

			for (let j = 0; j < caseStatement.exprList.length; j++) {
				if (!AreTypesCompatible(select.expr.type, caseStatement.exprList[j].type)) {
					this.error(caseStatement, 'CASE expression cannot be compared with SELECT')
				}
			}
		}
	}

	public visitCaseStatement(caseStatement) {
		caseStatement.exprList.accept(this)
		caseStatement.statements.accept(this)
	}

	public visitTypeMember(member) {
		let type

		// typename must exist.
		if (member.typeName) {
			type = this.types[member.typeName]
			if (type === undefined) {
				this.error(member, "Undefined type '%s'", member.typeName)
			}
		}

		if (type === undefined) {
			type = this.getTypeFromVariableName(member.name)
		}
		member.type = type
	}

	public visitUserType(userType) {
		// must not already be declared.
		if (this.types[userType.name]) {
			this.error(userType, "Typename '%s' already defined", userType.name)
		}

		// members should be declared only once.
		let members = {}
		for (let i = 0; i < userType.members.length; i++) {
			userType.members[i].accept(this)
			if (members[userType.members[i].name] !== undefined) {
				this.error(userType.members[i], "Type member '%s' already defined", userType.members[i].name)
			}

			// dbg.printf("Type member name=%s has type %s\n",
			//        userType.members[i].name, userType.members[i].type.name);
			members[userType.members[i].name] = userType.members[i].type
		}

		this.types[userType.name] = new UserType(userType.name, members)
	}

	public visitGotoStatement(gotoStatement) {
		this.labelsUsed.push(new CheckedLabel(gotoStatement.label, gotoStatement))
	}

	public visitGosub(gosub) {
		this.labelsUsed.push(new CheckedLabel(gosub.label, gosub))
	}

	public visitOnEventStatement(event: AstOnEventStatement) {
		event.path.accept(this)
		if (!IsStringType(event.path.type)) {
			this.error(event, 'Event path must be a string.')
		}
		const declare = this.declaredSubs[event.handler]
		if (!declare) {
			this.error(event, "Call to undefined sub '%s'", event.handler)
		} else {
			this.checkCallArguments(declare, [new AstArgument(event.locus, 'data$', 'STRING')])
		}
	}

	public visitLabel(label) {
		// label must not already be defined.
		if (this.labelsDefined[label.name]) {
			this.error(label, "Label '%s' is already defined", label.name)
		}
		// add to labels declared.
		this.labelsDefined[label.name] = new CheckedLabel(label.name, label)
	}

	public visitAssignStatement(assign) {
		// rhs must be compatible with rhs.
		assign.lhs.wantRef = true
		assign.lhs.accept(this)
		assign.expr.accept(this)
		if (!AreTypesCompatible(assign.lhs.type, assign.expr.type)) {
			this.error(assign, "Tried to assign type '%s' to type '%s'", assign.expr.type.name, assign.lhs.type.name)
		}
	}

	public visitBinaryOp(binary) {
		let op = binary.op
		binary.lhs.accept(this)
		binary.rhs.accept(this)
		let bad = 0
		let type = binary.lhs.type

		// types must be compatible
		if (!AreTypesCompatible(binary.lhs.type, binary.rhs.type)) {
			bad = 1
		}

		if (IsStringType(binary.lhs.type)) {
			// operator must be +, <, >, <>, '='
			bad |= op !== '+' && op !== '<' && op !== '>' && op !== '<>' && op !== '=' ? 1 : 0
		}

		if (IsUserType(binary.lhs.type)) {
			bad |= op !== '=' ? 1 : 0
		}

		if (op === '=' || op === '<>' || op === '<' || op === '<=' || op === '>=' || op === '<<' || op === '>>') {
			type = this.types.INTEGER
		}

		if (IsArrayType(binary.lhs.type)) {
			bad |= 1
		}

		// type must support the given operator.
		if (bad) {
			this.error(
				binary,
				"Incompatible types for '%s' operator: %s,%s",
				binary.op,
				binary.lhs.type.name,
				binary.rhs.type.name
			)
		}

		binary.type = type
	}

	public visitUnaryOperator(unary) {
		// type must be numeric.
		unary.expr.accept(this)
		if (!IsNumericType(unary.expr.type)) {
			this.error(unary, "Incompatible type for '%s' operator", unary.op)
		}
		unary.type = unary.expr.type
	}

	public visitConstantExpr(expr) {
		if (expr.value === null) {
			expr.type = this.types[':NULL']
		} else if (expr.value.constructor === String) {
			expr.type = this.types.STRING
		} else {
			expr.type = this.types.SINGLE
		}
	}
}
