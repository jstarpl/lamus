@top Program { statement* }

@top Line { statement }

@skip { space | LineComment }

statement {
  Label iStatement |
  iStatement
}

Literals { LString | LFloat | LHex | LFile }

DerefOp { MemberDerefOp | ArrayDerefOp }

iStatement {
  Keyword | TypeDecl { TypeKeyword Identifier } | BinaryOp | Literals | Identifier | DerefOp | comma | Semicolon
}

@tokens {
  Keyword { "GOSUB" | "IF" | "THEN" | "ELSE" | "SELECT" | "CASE ELSE" | "CASE" | "END" | "SUB" | "FUNCTION" | "FOR" | "TO" | "NEXT" | "LOOP" | "UNTIL" | "WHILE" | "WEND" | "PRINT" | "WRITE" | "STEP" | "DO" | "NOT" | "DECLARE" | "DIM" | "SHARED" | "DATA" | "CONST" | "RETURN" }

  TypeKeyword { "TYPE" | "AS" }

  SystemFunction { {{tokens (keys SystemFunctions)}} }

  SystemSubroutine { {{tokens (keys SystemSubroutines)}} }
  
  BinaryOp { "IMP" | "EQV" | "XOR" | "OR" | "AND" | "=" | "<>" | ">" | "<" | "<<" | ">>" | "<=" | ">=" | "MOD" | "+" | "-" | "*" | "/" | "^" }

  LString { '"' (!["] | '""')* '"' }

  LFloat { "-"? @digit+ ("." @digit+)? }

  LHex { "&H" $[0-9a-f]+ }

  LFile { "#" @digit+ }

  LineComment { (("'") | ("REM" $[ \t]+)) ![\n]* }

  Identifier { $[a-zA-Z_] $[a-zA-Z0-9_]* ("$" | "%" | "#" | "&" | "!")? }

  Label { ($[a-zA-Z_] $[a-zA-Z0-9_]* ":") }

  space { $[ \t\n\r]+ }

  MemberDerefOp { "." }

  ArrayDerefOp { "(" | ")" }

  comma { "," " "* }

  Semicolon { ";" }

  @precedence { Keyword, TypeKeyword, Identifier }
  @precedence { BinaryOperator, Literals }
  @precedence { LineComment, Label, BinaryOp, LFloat, Identifier }
}

@detectDelim

@external propSource basicHighlighting from "./highlight"
