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
	AstCaseStatement,
	AstProgram,
	AstDeclareFunction,
	AstSubroutine,
	AstCallStatement,
	AstArgument,
	AstPrintStatement,
	AstPrintUsingStatement,
	AstPrintItem,
	AstInputStatement,
	AstNullStatement,
	AstEndStatement,
	AstForLoop,
	AstNextStatement,
	AstArrayDeref,
	AstMemberDeref,
	AstVariableReference,
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
	AstTypeMember,
	AstUserType,
	AstGotoStatement,
	AstGosubStatement,
	AstLabel,
	AstAssignStatement,
	AstBinaryOp,
	AstUnaryOperator,
	AstConstantExpr,
	AstExitStatement,
	AstOpenStatement,
	AstCloseStatement,
	AstWriteStatement,
	AstOnEventStatement
} from './QBasic'

export interface IVisitor {
	visitProgram(program: AstProgram): void
	visitDeclareFunction(declare: AstDeclareFunction): void
	visitSubroutine(sub: AstSubroutine): void
	visitCallStatement(call: AstCallStatement): void
	visitArgument(argument: AstArgument): void
	visitPrintStatement(print: AstPrintStatement): void
	visitPrintUsingStatement(printUsing: AstPrintUsingStatement): void
	visitPrintItem(item: AstPrintItem): void
	visitOpenStatement(open: AstOpenStatement): void
	visitCloseStatement(close: AstCloseStatement): void
	visitWriteStatement(write: AstWriteStatement): void
	visitInputStatement(input: AstInputStatement): void
	visitNullStatement(argument: AstNullStatement): void
	visitEndStatement(argument: AstEndStatement): void
	visitForLoop(loop: AstForLoop): void
	visitNextStatement(next: AstNextStatement): void
	visitExitStatement(exit: AstExitStatement): void
	visitArrayDeref(ref: AstArrayDeref): void
	visitMemberDeref(ref: AstMemberDeref): void
	visitVariableReference(ref: AstVariableReference): void
	visitRange(range: AstRange): void
	visitDataStatement(argument: AstDataStatement): void
	visitReturnStatement(returnStatement: AstReturnStatement): void
	visitRestoreStatement(restore: AstRestoreStatement): void
	visitConstStatement(constStatement: AstConstStatement): void
	visitDefTypeStatement(def: AstDefTypeStatement): void
	visitDimStatement(dim: AstDimStatement): void
	visitDoStatement(loop: AstDoStatement): void
	visitWhileLoop(loop: AstWhileLoop): void
	visitIfStatement(ifStatement: AstIfStatement): void
	visitSelectStatement(select: AstSelectStatement): void
	visitTypeMember(member: AstTypeMember): void
	visitUserType(userType: AstUserType): void
	visitGotoStatement(gotoStatement: AstGotoStatement): void
	visitGosub(gosub: AstGosubStatement): void
	visitOnEventStatement(event: AstOnEventStatement): void
	visitLabel(label: AstLabel): void
	visitAssignStatement(assign: AstAssignStatement): void
	visitBinaryOp(binary: AstBinaryOp): void
	visitUnaryOperator(unary: AstUnaryOperator): void
	visitConstantExpr(expr: AstConstantExpr): void
	visitCaseStatement(caseStatement: AstCaseStatement): void
}
