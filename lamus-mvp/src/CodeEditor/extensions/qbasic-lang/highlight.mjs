import { styleTags, tags as t } from "@lezer/highlight";

export const basicHighlighting = styleTags({
  "Keyword DeclareKeyword": t.keyword,
  "SystemFunction SystemSubroutine": t.name,
  Identifier: t.variableName,
  Label: t.labelName,
  BinaryOp: t.operator,
  "LFloat LHex": t.number,
  LFile: t.literal,
  LString: t.string,
  ArrayDerefOp: t.brace,
  MemberDerefOp: t.derefOperator,
  LineComment: t.comment,
  Semicolon: t.modifier,
  TypeName: t.name,
  "Declaration/Identifier": t.name,
  Comma: t.separator,
});
