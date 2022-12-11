import { Blockquote } from "mdast";
import { DocumentBlockQuote } from "@editorjs/editorjs";
import { phrasingContentAsString } from "./utils";

export function parseQuoteToMarkdown(
  block: DocumentBlockQuote["data"]
): string {
  let text = `> ${block.text}`;
  if (block.caption) {
    text += `\n>\n> -- ${block.caption}\n`;
  }

  return text;
}

export function parseMarkdownToQuote(block: Blockquote): DocumentBlockQuote {
  const text: string[] = [];
  block.children.forEach((item) => {
    switch (item.type) {
      case "paragraph":
        text.push(...item.children.map(phrasingContentAsString));
        break;
    }
  });

  return {
    data: {
      alignment: "left" as const,
      caption: "",
      text: text.join(),
    },
    type: "quote" as const,
  };
}
