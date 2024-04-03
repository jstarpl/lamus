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
  Keyword | Declaration { DeclareKeyword ( TypeName | Identifier ) } | SystemFunction | SystemSubroutine | BinaryOp | Literals | Identifier | DerefOp | Comma | Semicolon
}

@tokens {
  Keyword { "GOSUB" | "IF" | "THEN" | "ELSE" | "SELECT" | "CASE ELSE" | "CASE" | "END" | "FOR" | "TO" | "NEXT" | "LOOP" | "UNTIL" | "WHILE" | "WEND" | "STEP" | "DO" | "NOT" | "DECLARE" | "DIM" | "SHARED" | "DATA" | "CONST" | "RETURN" }

  DeclareKeyword { "TYPE" | "AS" | "SUB" | "FUNCTION" }

  TypeName { "INTEGER" | "LONG" | "SINGLE" | "DOUBLE" | "STRING" | "JSON" | "ANY" | ":NULL" }

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

  Comma { "," " "* }

  Semicolon { ";" }

  @precedence { Keyword, DeclareKeyword, TypeName, SystemFunction, SystemSubroutine, Identifier }
  @precedence { LineComment, Label, BinaryOp, LFloat, Identifier }
}

@detectDelim

@external propSource basicHighlighting from "./highlight"
