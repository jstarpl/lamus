import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const syntaxTheme = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, class: "ce-keyword" },
    { tag: t.name, class: "ce-name" },
    { tag: t.variableName, class: "ce-variableName" },
    { tag: t.labelName, class: "ce-labelName" },
    { tag: t.operator, class: "ce-operator" },
    { tag: t.number, class: "ce-number" },
    { tag: t.literal, class: "ce-literal" },
    { tag: t.string, class: "ce-string" },
    { tag: t.brace, class: "ce-brace" },
    { tag: t.derefOperator, class: "ce-derefOperator" },
    { tag: t.comment, class: "ce-comment" },
    { tag: t.modifier, class: "ce-modifier" },
    { tag: t.separator, class: "ce-separator" },
  ])
);
