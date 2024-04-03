import {parser} from "./syntax.grammar"
import {LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, delimitedIndent, flatIndent, syntaxHighlighting, HighlightStyle} from "@codemirror/language"
import {Extension} from "@codemirror/state"
import {styleTags, tags as t} from "@lezer/highlight"
import {completeFromList} from "@codemirror/autocomplete"

export const QBasicVMLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: flatIndent,
      }),
      foldNodeProp.add({
        Application: foldInside
      }),
      styleTags({
        Identifier: t.variableName,
        StringConstant: t.string,
        FileConstant: t.number,
        FloatConstant: t.number,
        HexConstant: t.number,
        BinConstant: t.number,
        LineComment: t.lineComment,
        deref: t.paren,
        Label: t.labelName,
        BinaryOperator: t.operator,
        Keyword: t.keyword
      })
    ]
  }),
  languageData: {
    commentTokens: {line: "'"}
  }
})

export const LanguageExtension: Extension = QBasicVMLanguage.data.of({
  autocomplete: completeFromList([
    
  ]),
  syntaxHighlight: syntaxHighlighting(HighlightStyle.define([
    { tag: t.variableName, class: 'variableName' }
  ]))
})

export function qbasicVm() {
  return new LanguageSupport(QBasicVMLanguage, LanguageExtension)
}
