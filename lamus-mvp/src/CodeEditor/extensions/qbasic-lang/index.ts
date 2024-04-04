//@ts-expect-error For some reason, ambient module declaration doesn't work
import { parser } from "./syntax.grammar";
import VMInfo from "@lamus/qbasic-vm/allCommands.json";
import {
  LRLanguage,
  LanguageSupport,
  indentNodeProp,
  flatIndent,
} from "@codemirror/language";
import { completeFromList } from "@codemirror/autocomplete";

export const QBasicLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Application: flatIndent,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "'" },
  },
});

export const LanguageExtension = QBasicLanguage.data.of({
  autocomplete: completeFromList([
    {
      label: "PRINT",
      type: "function",
    },
    ...Object.keys(VMInfo.SystemFunctions).map((entry) => ({
      label: entry,
      type: "function",
    })),
    ...Object.keys(VMInfo.SystemSubroutines).map((entry) => ({
      label: entry,
      type: "function",
    })),
  ]),
});

export function qbasic() {
  return new LanguageSupport(QBasicLanguage, LanguageExtension);
}
