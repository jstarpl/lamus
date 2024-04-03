import { styleTags, tags as t } from "@lezer/highlight";

export const basicHighlighting = styleTags({
  Keyword: t.keyword,
	Identifier: t.variableName,
	Label: t.labelName,
	BinaryOp: t.operator,
  "LFloat LHex": t.number,
	LFile: t.literal,
	LString: t.string,
  ArrayDerefOp: t.brace,
	MemberDerefOp: t.derefOperator,
  ArrayDerefOp: t.paren,
  LineComment: t.comment,
  Semicolon: t.modifier
});
