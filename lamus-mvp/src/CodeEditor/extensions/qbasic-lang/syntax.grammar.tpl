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
  Keyword | Declaration { DeclareKeyword ( TypeName | Identifier ) } | Command | BinaryOp | Literals | Identifier | DerefOp | Comma | Semicolon
}

@tokens {
  Keyword { "GOSUB" | "GOTO" | "IF" | "THEN" | "ELSE" | "SELECT" | "CASE ELSE" | "CASE" | "END" | "FOR" | "TO" | "NEXT" | "LOOP" | "UNTIL" | "WHILE" | "WEND" | "STEP" | "DO" | "NOT" | "DECLARE" | "DIM" | "SHARED" | "DATA" | "CONST" | "RETURN" }

  DeclareKeyword { "TYPE" | "AS" | "SUB" | "FUNCTION" }

  TypeName { "INTEGER" | "LONG" | "SINGLE" | "DOUBLE" | "STRING" | "JSON" | "ANY" | ":NULL" }

  Command { "PRINT" | "RANDOM" | "OUTPUT" | "BINARY" | {{toTokens (sort (join (keys SystemFunctions) (keys SystemSubroutines)))}} }
  
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

  @precedence { Keyword, DeclareKeyword, TypeName, Command, Identifier }
  @precedence { LineComment, Label, BinaryOp, LFloat, Identifier }
}

@detectDelim

@external propSource basicHighlighting from "./highlight"
